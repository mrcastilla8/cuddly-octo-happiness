import type { LocalFileCheckResult } from "../types/bulk";

const FILE_READ_CHUNK_SIZE = 64 * 1024;
const ZIP_MAX_EOCD_SIZE = 22 + 65_535;
// Local parser safety bounds, not contractual upload limits.
const MAX_HEADER_CHARACTERS = 256 * 1024;
const MAX_HEADER_COLUMNS = 4096;

interface CsvFileSummary {
  headers: string[];
  dataRows: number;
  malformedRow?: { rowNumber: number; fieldCount: number };
  error?: string;
}

function createCsvSummaryScanner() {
  let insideQuotes = false;
  let pendingQuote = false;
  let fieldStarted = false;
  let afterClosingQuote = false;
  let currentField = "";
  let headerFields: string[] = [];
  let headerCharacters = 0;
  let rowFieldCount = 1;
  let currentRowHasData = false;
  let skipLineFeed = false;
  let headers: string[] | undefined;
  let dataRows = 0;
  let malformedRow: CsvFileSummary["malformedRow"];
  let error: string | undefined;

  const appendHeaderCharacter = (char: string) => {
    if (headers) return;
    headerCharacters++;
    if (headerCharacters > MAX_HEADER_CHARACTERS) {
      error = "El encabezado supera el límite de inspección local (256 KiB); reduzca su tamaño para revisar el archivo.";
      return;
    }
    currentField += char;
  };

  const finishCurrentField = () => {
    if (!headers) {
      if (headerFields.length >= MAX_HEADER_COLUMNS) {
        error = "El encabezado supera el límite de inspección local (4096 columnas); reduzca la cantidad de columnas para revisar el archivo.";
      } else {
        headerFields.push(currentField.trim().toLowerCase());
      }
    }
    currentField = "";
    fieldStarted = false;
    afterClosingQuote = false;
  };

  const finishRow = () => {
    if (currentRowHasData) {
      if (!headers) {
        finishCurrentField();
        if (!error) headers = headerFields;
      } else {
        dataRows++;
        if (!malformedRow && rowFieldCount !== headers.length) {
          malformedRow = {
            rowNumber: dataRows + 1,
            fieldCount: rowFieldCount,
          };
        }
      }
    }
    currentField = "";
    fieldStarted = false;
    afterClosingQuote = false;
    if (!headers) headerFields = [];
    rowFieldCount = 1;
    currentRowHasData = false;
  };

  const push = (chunk: string) => {
    for (let i = 0; i < chunk.length && !error; i++) {
      const char = chunk[i] ?? "";
      const nextChar = chunk[i + 1];

      if (skipLineFeed) {
        skipLineFeed = false;
        if (char === "\n") continue;
      }

      if (pendingQuote) {
        pendingQuote = false;
        if (char === '"') {
          appendHeaderCharacter('"');
          fieldStarted = true;
          if (!/\s/.test(char)) currentRowHasData = true;
          continue;
        }
        insideQuotes = false;
        afterClosingQuote = true;
        // Reprocess this character as the first one following a closing quote.
      }

      if (char === '"') {
        if (insideQuotes) {
          if (nextChar === '"') {
            appendHeaderCharacter('"');
            i++;
          } else if (i === chunk.length - 1) {
            // The next chunk decides whether this quote closes the field or is escaped.
            pendingQuote = true;
          } else {
            insideQuotes = false;
            afterClosingQuote = true;
          }
        } else if (!fieldStarted) {
          insideQuotes = true;
          fieldStarted = true;
        } else {
          error = "El archivo CSV contiene comillas en posiciones inválidas dentro de un campo no delimitado.";
        }
        continue;
      }

      if (char === "," && !insideQuotes) {
        finishCurrentField();
        rowFieldCount++;
        continue;
      }

      if ((char === "\r" || char === "\n") && !insideQuotes) {
        finishRow();
        if (char === "\r") skipLineFeed = true;
        continue;
      }

      if (afterClosingQuote && char !== " " && char !== "\t") {
        error = "El archivo CSV contiene caracteres después de cerrar comillas sin un delimitador de columna.";
        continue;
      }

      fieldStarted = true;
      appendHeaderCharacter(char);
      if (!/\s/.test(char)) {
        currentRowHasData = true;
      }
    }
  };

  const finish = (): CsvFileSummary => {
    if (pendingQuote) {
      pendingQuote = false;
      insideQuotes = false;
      afterClosingQuote = true;
    }
    if (!error && insideQuotes) {
      error = "El archivo CSV contiene comillas sin cerrar en la estructura de campos.";
    }
    if (!error && (fieldStarted || rowFieldCount > 1 || currentRowHasData)) {
      finishRow();
    }
    if (!error && headers) {
      if (headers.some((header) => header.length === 0)) {
        error = "El encabezado contiene columnas con nombre vacío.";
      } else if (new Set(headers).size !== headers.length) {
        error = "El encabezado contiene nombres de columna duplicados.";
      }
    }
    if (!error && headers && !malformedRow && dataRows === 0) {
      error = "El archivo CSV contiene únicamente el encabezado y no tiene filas de datos para importar.";
    }
    return {
      headers: headers ?? [],
      dataRows,
      malformedRow,
      error,
    };
  };

  return { push, finish, hasError: () => Boolean(error) };
}

async function inspectCsvFile(
  file: File,
  signal?: AbortSignal,
): Promise<CsvFileSummary> {
  const scanner = createCsvSummaryScanner();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const reader = file.stream().getReader();
  const cancelRead = () => void reader.cancel();
  signal?.addEventListener("abort", cancelRead, { once: true });

  try {
    while (true) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      if (done) break;
      scanner.push(decoder.decode(value, { stream: true }));
      if (scanner.hasError()) {
        await reader.cancel();
        break;
      }
    }
    signal?.throwIfAborted();
    if (!scanner.hasError()) scanner.push(decoder.decode());
    signal?.throwIfAborted();
    return scanner.finish();
  } finally {
    signal?.removeEventListener("abort", cancelRead);
    reader.releaseLock();
  }
}

async function hasCanonicalXlsxEntries(
  file: File,
  directoryStart: number,
  directorySize: number,
  expectedEntries: number,
  signal?: AbortSignal,
): Promise<boolean> {
  let cursor = 0;
  let pending = new Uint8Array(0);
  let parsedEntries = 0;
  let hasContentTypes = false;
  let hasWorkbook = false;
  const contentTypes = new TextEncoder().encode("[Content_Types].xml");
  const workbook = new TextEncoder().encode("xl/workbook.xml");

  while (cursor < directorySize) {
    signal?.throwIfAborted();
    const end = Math.min(directorySize, cursor + FILE_READ_CHUNK_SIZE);
    const chunk = new Uint8Array(
      await file.slice(directoryStart + cursor, directoryStart + end).arrayBuffer(),
    );
    cursor = end;
    const joined = new Uint8Array(pending.length + chunk.length);
    joined.set(pending);
    joined.set(chunk, pending.length);
    pending = joined;

    let offset = 0;
    while (pending.length - offset >= 46) {
      const header = pending.subarray(offset, offset + 46);
      if (
        header[0] !== 0x50 || header[1] !== 0x4b ||
        header[2] !== 0x01 || header[3] !== 0x02
      ) return false;

      const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
      const nameLength = view.getUint16(28, true);
      const extraLength = view.getUint16(30, true);
      const commentLength = view.getUint16(32, true);
      const recordLength = 46 + nameLength + extraLength + commentLength;
      if (pending.length - offset < recordLength) break;

      const name = pending.subarray(offset + 46, offset + 46 + nameLength);
      const matches = (expected: Uint8Array) =>
        name.length === expected.length && expected.every((byte, index) => name[index] === byte);
      hasContentTypes ||= matches(contentTypes);
      hasWorkbook ||= matches(workbook);
      parsedEntries++;
      offset += recordLength;
    }

    pending = pending.slice(offset);
  }

  return (
    pending.length === 0 &&
    parsedEntries === expectedEntries &&
    hasContentTypes &&
    hasWorkbook
  );
}

function invalidFile(
  format: LocalFileCheckResult["format"],
  fileName: string,
  fileSize: number,
  error: string,
): LocalFileCheckResult {
  return {
    valid: false,
    format,
    fileName,
    fileSize,
    warnings: [],
    errors: [error],
    unverifiedAspects: [],
  };
}

export async function checkLocalFile(
  file: File,
  signal?: AbortSignal,
): Promise<LocalFileCheckResult> {
  signal?.throwIfAborted();
  const fileName = file.name.trim();
  const fileSize = file.size;
  const lowerName = fileName.toLowerCase();
  const isCsv = lowerName.endsWith(".csv");
  const isXlsx = lowerName.endsWith(".xlsx");

  if (!isCsv && !isXlsx) {
    return {
      ...invalidFile(
        "UNKNOWN",
        fileName,
        fileSize,
        `Formato no admitido. Se requiere un archivo con extensión .csv o .xlsx (recibido: ${fileName})`,
      ),
      unverifiedAspects: ["El contenido no fue procesado debido a formato no admitido."],
    };
  }
  const format = isCsv ? "CSV" : "XLSX";
  if (fileSize === 0) {
    return invalidFile(format, fileName, fileSize, "El archivo seleccionado está vacío (0 bytes).");
  }

  if (isXlsx) {
    if (fileSize < 52) {
      return invalidFile(
        "XLSX",
        fileName,
        fileSize,
        "El archivo XLSX tiene un tamaño insuficiente para ser un contenedor de hoja de cálculo válido.",
      );
    }

    try {
      signal?.throwIfAborted();
      const header = new Uint8Array(await file.slice(0, 4).arrayBuffer());
      if (header[0] !== 0x50 || header[1] !== 0x4b || header[2] !== 0x03 || header[3] !== 0x04) {
        return invalidFile(
          "XLSX",
          fileName,
          fileSize,
          "El archivo XLSX está corrupto o no tiene una estructura de contenedor válida (firma ZIP/PK local header no detectada).",
        );
      }

      const tailSize = Math.min(fileSize, ZIP_MAX_EOCD_SIZE);
      const tail = new Uint8Array(
        await file.slice(fileSize - tailSize, fileSize).arrayBuffer(),
      );
      signal?.throwIfAborted();
      let eocdOffset = -1;
      for (let i = tail.length - 22; i >= 0; i--) {
        if (
          tail[i] === 0x50 && tail[i + 1] === 0x4b &&
          tail[i + 2] === 0x05 && tail[i + 3] === 0x06
        ) {
          const view = new DataView(tail.buffer, tail.byteOffset + i, 22);
          if (i + 22 + view.getUint16(20, true) === tail.length) {
            eocdOffset = i;
            break;
          }
        }
      }
      if (eocdOffset < 0) {
        return invalidFile(
          "XLSX",
          fileName,
          fileSize,
          "El archivo XLSX está incompleto o truncado (registro de fin de directorio central ZIP no encontrado).",
        );
      }

      const eocd = new DataView(tail.buffer, tail.byteOffset + eocdOffset, 22);
      const diskEntries = eocd.getUint16(8, true);
      const totalEntries = eocd.getUint16(10, true);
      const directorySize = eocd.getUint32(12, true);
      const directoryStart = eocd.getUint32(16, true);
      if (
        diskEntries === 0 || diskEntries !== totalEntries ||
        directoryStart < 30 || directoryStart + directorySize > fileSize
      ) {
        return invalidFile(
          "XLSX",
          fileName,
          fileSize,
          "El directorio central del contenedor ZIP contiene valores inconsistentes o corruptos.",
        );
      }

      const canonicalEntriesPresent = await hasCanonicalXlsxEntries(
        file,
        directoryStart,
        directorySize,
        totalEntries,
        signal,
      );
      if (!canonicalEntriesPresent) {
        return invalidFile(
          "XLSX",
          fileName,
          fileSize,
          "El directorio central está incompleto o el contenedor no presenta [Content_Types].xml y xl/workbook.xml.",
        );
      }
    } catch (err) {
      if (signal?.aborted) throw err;
      return invalidFile("XLSX", fileName, fileSize, "No se pudo leer la estructura del archivo XLSX.");
    }

    return {
      valid: true,
      format: "XLSX",
      fileName,
      fileSize,
      warnings: [
        "Revisión preliminar de contenedor XLSX: las celdas, hojas y tipos serán validados por el servicio durante el procesamiento del lote.",
      ],
      errors: [],
      unverifiedAspects: [
        "Estructura interna de celdas y filas XLSX no verificada en cliente.",
        "Consistencia de tipos de datos, precios y stock será validada de forma asíncrona.",
      ],
    };
  }

  try {
    const summary = await inspectCsvFile(file, signal);
    if (summary.error) {
      return {
        ...invalidFile("CSV", fileName, fileSize, summary.error),
        detectedRows: summary.dataRows,
        detectedColumns: summary.headers.length ? summary.headers : undefined,
      };
    }
    if (!summary.headers.length) {
      return invalidFile("CSV", fileName, fileSize, "El archivo CSV no contiene texto ni datos legibles.");
    }
    if (summary.malformedRow) {
      return {
        ...invalidFile(
          "CSV",
          fileName,
          fileSize,
          `La fila ${summary.malformedRow.rowNumber} contiene ${summary.malformedRow.fieldCount} campos, mientras que el encabezado define ${summary.headers.length} columnas.`,
        ),
        detectedRows: summary.dataRows,
        detectedColumns: summary.headers,
      };
    }
    if (summary.dataRows === 0) {
      return {
        ...invalidFile(
          "CSV",
          fileName,
          fileSize,
          "El archivo CSV contiene únicamente el encabezado y no tiene filas de datos para importar.",
        ),
        detectedRows: 0,
        detectedColumns: summary.headers,
      };
    }
    return {
      valid: true,
      format: "CSV",
      fileName,
      fileSize,
      detectedRows: summary.dataRows,
      detectedColumns: summary.headers,
      warnings: [],
      errors: [],
      unverifiedAspects: [
        "Unicidad de SKU y existencia previa en catálogo no verificable localmente.",
        "Validación de stock y reglas de canales de precios se evalúan en el procesamiento asíncrono.",
      ],
    };
  } catch (err) {
    if (signal?.aborted) throw err;
    return invalidFile(
      "CSV",
      fileName,
      fileSize,
      "No se pudo leer el contenido del archivo CSV. Verifique que la codificación sea UTF-8 válida.",
    );
  }
}

/**
 * Full parser retained for deterministic fixtures and small in-memory callers.
 * User-selected files use the bounded streaming scanner above.
 */
export function parseCsvSafely(text: string): { rows: string[][]; error?: string } {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let insideQuotes = false;
  let fieldHasQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    if (char === '"') {
      if (insideQuotes) {
        if (nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          insideQuotes = false;
        }
      } else if (currentField.length === 0) {
        insideQuotes = true;
        fieldHasQuotes = true;
      } else {
        return { rows: [], error: "El archivo CSV contiene comillas en posiciones inválidas dentro de un campo no delimitado." };
      }
    } else if (char === "," && !insideQuotes) {
      currentRow.push(currentField);
      currentField = "";
      fieldHasQuotes = false;
    } else if ((char === "\r" || char === "\n") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") i++;
      currentRow.push(currentField);
      currentField = "";
      fieldHasQuotes = false;
      if (currentRow.some((field) => field.trim().length > 0)) rows.push(currentRow);
      currentRow = [];
    } else {
      if (!insideQuotes && fieldHasQuotes && char !== " " && char !== "\t") {
        return { rows: [], error: "El archivo CSV contiene caracteres después de cerrar comillas sin un delimitador de columna." };
      }
      currentField += char;
    }
  }
  if (insideQuotes) {
    return { rows: [], error: "El archivo CSV contiene comillas sin cerrar en la estructura de campos." };
  }
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((field) => field.trim().length > 0)) rows.push(currentRow);
  }
  return { rows };
}
