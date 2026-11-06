import { auditEntries } from "../mocks/entries";
import type { StoredAuditJob } from "../mocks/pricingChanges";
import { displayAuditId } from "../services/auditPresentation";
import {
  AuditFailure,
  type AuditEntry,
  type AuditFilters,
  type AuditFormat,
  type AuditRepository,
} from "../services/auditRepository";

export function matches(entry: AuditEntry, filters: AuditFilters) {
  return (
    (!filters.sku || entry.sku === filters.sku) &&
    (!filters.usuarioId || entry.actorId === filters.usuarioId) &&
    (!filters.canal || entry.origin === filters.canal) &&
    (!filters.batchId || entry.batchId === filters.batchId) &&
    (!filters.desde || Date.parse(entry.at) >= Date.parse(filters.desde)) &&
    (!filters.hasta || Date.parse(entry.at) <= Date.parse(filters.hasta))
  );
}

function escapeCsvValue(val: string | null | undefined): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateAuditCsv(items: AuditEntry[]): Blob {
  const header =
    "id_auditoria,sku,product_id,tipo_precio,precio_anterior,precio_nuevo,variacion_porcentual,tipo_operacion,canal_origen,motivo_cambio,batch_id,usuario_id,usuario_email,ip_origen,timestamp";
  const rows = items.map((entry) => {
    const seatId = displayAuditId(entry.id);
    const userId =
      entry.actorId === "demo-pricing" ? "" : (entry.actorId ?? "");
    return [
      escapeCsvValue(seatId),
      escapeCsvValue(entry.sku),
      escapeCsvValue(entry.productId),
      escapeCsvValue(entry.priceType),
      escapeCsvValue(entry.before),
      escapeCsvValue(entry.after),
      escapeCsvValue(entry.variation),
      escapeCsvValue(entry.operation),
      escapeCsvValue(entry.origin),
      escapeCsvValue(entry.reason),
      escapeCsvValue(entry.batchId),
      escapeCsvValue(userId),
      escapeCsvValue(entry.email),
      escapeCsvValue(entry.ip),
      escapeCsvValue(entry.at),
    ].join(",");
  });
  const csvText = [header, ...rows].join("\n") + "\n";
  return new Blob([csvText], { type: "text/csv;charset=utf-8" });
}

const WIN_ANSI_SPECIAL: Record<string, number> = {
  "\u20AC": 0x80, // €
  "\u201A": 0x82, // ‚
  "\u0192": 0x83, // ƒ
  "\u201E": 0x84, // „
  "\u2026": 0x85, // …
  "\u2020": 0x86, // †
  "\u2021": 0x87, // ‡
  "\u02C6": 0x88, // ˆ
  "\u2030": 0x89, // ‰
  "\u0160": 0x8A, // Š
  "\u2039": 0x8B, // ‹
  "\u0152": 0x8C, // Œ
  "\u017D": 0x8E, // Ž
  "\u2018": 0x91, // ‘
  "\u2019": 0x92, // ’
  "\u201C": 0x93, // “
  "\u201D": 0x94, // ”
  "\u2022": 0x95, // •
  "\u2013": 0x96, // –
  "\u2014": 0x97, // —
  "\u02DC": 0x98, // ˜
  "\u2122": 0x99, // ™
  "\u0161": 0x9A, // š
  "\u203A": 0x9B, // ›
  "\u0153": 0x9C, // œ
  "\u017E": 0x9E, // ž
  "\u0178": 0x9F, // Ÿ
};

const WIN_ANSI_BYTE_TO_CHAR: Record<number, string> = {};
for (const [char, byte] of Object.entries(WIN_ANSI_SPECIAL)) {
  WIN_ANSI_BYTE_TO_CHAR[byte] = char;
}
for (let code = 0xa0; code <= 0xff; code++) {
  WIN_ANSI_BYTE_TO_CHAR[code] = String.fromCharCode(code);
}

export function escapeWinAnsiPdfString(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    const code = ch.charCodeAt(0);

    if (ch === "\\") {
      result += "\\\\";
    } else if (ch === "(") {
      result += "\\(";
    } else if (ch === ")") {
      result += "\\)";
    } else if (code >= 32 && code <= 126) {
      result += ch;
    } else if (code >= 160 && code <= 255) {
      result += "\\" + code.toString(8).padStart(3, "0");
    } else if (WIN_ANSI_SPECIAL[ch] !== undefined) {
      const byte = WIN_ANSI_SPECIAL[ch]!;
      result += "\\" + byte.toString(8).padStart(3, "0");
    } else {
      result += "?";
    }
  }
  return result;
}

export function wrapPdfText(text: string, maxLen = 95): string[] {
  if (text.length <= maxLen) return [text];
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (!currentLine) {
      if (word.length > maxLen) {
        for (let i = 0; i < word.length; i += maxLen) {
          lines.push(word.slice(i, i + maxLen));
        }
      } else {
        currentLine = word;
      }
    } else if (currentLine.length + 1 + word.length <= maxLen) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      if (word.length > maxLen) {
        for (let i = 0; i < word.length; i += maxLen) {
          const chunk = word.slice(i, i + maxLen);
          if (i + maxLen < word.length) {
            lines.push(chunk);
          } else {
            currentLine = chunk;
          }
        }
      } else {
        currentLine = "  " + word;
      }
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

export function generateAuditPdf(items: AuditEntry[], filters: AuditFilters): Blob {
  const cappedItems = items.slice(0, 500);
  const ITEMS_PER_PAGE = 30;
  const MAX_LINES_PER_PAGE = 64;

  const filterDesc: string[] = [];
  if (filters.sku) filterDesc.push(`SKU: ${filters.sku}`);
  if (filters.desde) filterDesc.push(`Desde: ${filters.desde}`);
  if (filters.hasta) filterDesc.push(`Hasta: ${filters.hasta}`);
  if (filters.canal) filterDesc.push(`Canal: ${filters.canal}`);
  if (filters.usuarioId && filters.usuarioId !== "demo-pricing") filterDesc.push(`Usuario: ${filters.usuarioId}`);
  if (filters.batchId) filterDesc.push(`Lote: ${filters.batchId}`);

  const firstPageHeader = [
    "AUDITORIA DE PRECIOS",
    `Generado: ${new Date().toISOString()}`,
    `Total de registros: ${items.length}`,
    ...(filterDesc.length > 0 ? [`Filtros: ${filterDesc.join(" | ")}`] : []),
    "--------------------------------------------------------------------------------",
  ];
  const continuationHeader = (pageNumber: number, totalPages: number) => [
    `AUDITORIA DE PRECIOS — Página ${pageNumber} de ${totalPages}`,
    "--------------------------------------------------------------------------------",
  ];
  const pagesLines: string[][] = [firstPageHeader];
  const pageSeatCounts = [0];
  const headerFor = (pageIndex: number) => pageIndex === 0
    ? firstPageHeader
    : continuationHeader(pageIndex + 1, 1);
  const newPage = () => {
    const pageIndex = pagesLines.length;
    pagesLines.push(headerFor(pageIndex));
    pageSeatCounts.push(0);
  };

  if (cappedItems.length === 0) pagesLines[0]!.push("No se encontraron registros.");
  for (const item of cappedItems) {
    const seat = displayAuditId(item.id);
    const user = item.actorId === "demo-pricing" ? "No informado" : (item.actorId ?? "Sin usuario");
    const diff = item.before !== null && item.after !== null ? `${item.before} -> ${item.after}` : (item.after ?? "Retiro");
    const reason = item.reason ? ` | Motivo: ${item.reason}` : "";
    const seatLines = wrapPdfText(`Asiento: ${seat} | SKU: ${item.sku} | ${item.priceType} | ${diff} | ${item.at} | ${user}${reason}`, 95);
    let offset = 0;
    while (offset < seatLines.length) {
      let pageIndex = pagesLines.length - 1;
      let page = pagesLines[pageIndex]!;
      if (pageSeatCounts[pageIndex]! >= ITEMS_PER_PAGE || page.length >= MAX_LINES_PER_PAGE) {
        newPage();
        pageIndex++;
        page = pagesLines[pageIndex]!;
      }
      const remainingLines = MAX_LINES_PER_PAGE - page.length;
      const remainingSeatSlots = ITEMS_PER_PAGE - pageSeatCounts[pageIndex]!;
      if (remainingLines === 0 || remainingSeatSlots === 0) {
        newPage();
        continue;
      }
      const count = Math.min(remainingLines, seatLines.length - offset);
      if (offset === 0 && count < seatLines.length && pageSeatCounts[pageIndex]! > 0) {
        newPage();
        continue;
      }
      page.push(...seatLines.slice(offset, offset + count));
      pageSeatCounts[pageIndex] = pageSeatCounts[pageIndex]! + 1;
      offset += count;
      if (offset < seatLines.length) newPage();
    }
  }

  const totalPages = pagesLines.length;
  for (let pageIndex = 1; pageIndex < totalPages; pageIndex++) {
    pagesLines[pageIndex]![0] = `AUDITORIA DE PRECIOS — Página ${pageIndex + 1} de ${totalPages}`;
  }

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  let currentByteOffset = 0;

  const appendChunk = (str: string): void => {
    const bytes = encoder.encode(str);
    chunks.push(bytes);
    currentByteOffset += bytes.length;
  };

  appendChunk("%PDF-1.4\n");
  const offsets: number[] = [];

  // Obj 1: Catalog
  offsets.push(currentByteOffset);
  appendChunk("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  // Obj 2: Pages
  const kids: string[] = [];
  for (let p = 0; p < totalPages; p++) {
    kids.push(`${4 + 2 * p} 0 R`);
  }
  offsets.push(currentByteOffset);
  appendChunk(`2 0 obj\n<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${totalPages} >>\nendobj\n`);

  // Obj 3: Font with /Encoding /WinAnsiEncoding
  offsets.push(currentByteOffset);
  appendChunk("3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n");

  // Pages and Content streams
  for (let p = 0; p < totalPages; p++) {
    const pageObjId = 4 + 2 * p;
    const contentObjId = 5 + 2 * p;
    const lines = pagesLines[p] ?? [];

    let streamContent = "BT\n/F1 8 Tf\n11 TL\n40 750 Td\n";
    lines.forEach((line, i) => {
      const escaped = escapeWinAnsiPdfString(line);
      if (p === 0 && i === 0) {
        streamContent += `/F1 12 Tf (${escaped}) Tj\n/F1 8 Tf\nT*\n`;
      } else if (p > 0 && i === 0) {
        streamContent += `/F1 10 Tf (${escaped}) Tj\n/F1 8 Tf\nT*\n`;
      } else {
        streamContent += `(${escaped}) Tj\nT*\n`;
      }
    });
    streamContent += "ET\n";

    const streamBytes = encoder.encode(streamContent);
    const streamLength = streamBytes.length;

    offsets.push(currentByteOffset);
    appendChunk(`${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentObjId} 0 R /Resources << /Font << /F1 3 0 R >> >> >>\nendobj\n`);

    offsets.push(currentByteOffset);
    appendChunk(`${contentObjId} 0 obj\n<< /Length ${streamLength} >>\nstream\n`);
    chunks.push(streamBytes);
    currentByteOffset += streamBytes.length;
    appendChunk("\nendstream\nendobj\n");
  }

  const totalObjs = 4 + 2 * totalPages;
  const xrefOffset = currentByteOffset;
  let xrefStr = `xref\n0 ${totalObjs}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    xrefStr += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }
  xrefStr += `trailer\n<< /Size ${totalObjs} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  appendChunk(xrefStr);
  const finalBytes = new Uint8Array(currentByteOffset);
  let pos = 0;
  for (const chunk of chunks) {
    finalBytes.set(chunk, pos);
    pos += chunk.length;
  }
  return new Blob([finalBytes], { type: "application/pdf" });
}

export interface ParsedPdfResult {
  headerValid: boolean;
  xrefValid: boolean;
  totalPages: number;
  objectCount: number;
  pageObjectsCount: number;
  pageLineCounts: number[];
  pageSeatCounts: number[];
  extractedTexts: string[];
  rawText: string;
}

export function parsePdfStructure(bytes: Uint8Array): ParsedPdfResult {
  const decoder = new TextDecoder("latin1");
  const text = decoder.decode(bytes);

  // 1. Verify header
  const headerValid = text.startsWith("%PDF-1.");
  if (!headerValid) {
    throw new Error("Invalid PDF header");
  }

  // 2. Find startxref
  const startXrefIdx = text.lastIndexOf("startxref");
  if (startXrefIdx === -1) {
    throw new Error("Missing startxref");
  }
  const afterStartXref = text.slice(startXrefIdx + 9).trim();
  const xrefOffsetMatch = afterStartXref.match(/^(\d+)/);
  if (!xrefOffsetMatch) {
    throw new Error("Invalid startxref offset");
  }
  const xrefOffset = parseInt(xrefOffsetMatch[1]!, 10);

  // 3. Verify xref table at xrefOffset
  const xrefSub = text.slice(xrefOffset);
  if (!xrefSub.startsWith("xref")) {
    throw new Error(`xref keyword not found at offset ${xrefOffset}`);
  }

  const xrefLines = xrefSub.split(/\r\n|\n|\r/);
  const headerParts = xrefLines[1]?.trim().split(/\s+/);
  const startObj = parseInt(headerParts?.[0] ?? "", 10);
  const countObj = parseInt(headerParts?.[1] ?? "", 10);

  if (startObj !== 0 || isNaN(countObj)) {
    throw new Error("Invalid xref section header");
  }

  // 4. Verify each object offset points to "${objNum} 0 obj"
  for (let i = 1; i < countObj; i++) {
    const line = xrefLines[2 + i]?.trim();
    if (!line) continue;
    const parts = line.split(/\s+/);
    const offset = parseInt(parts[0]!, 10);
    const objHeader = text.slice(offset, offset + 20);
    const expected = `${i} 0 obj`;
    if (!objHeader.startsWith(expected)) {
      throw new Error(`Object ${i} not found at byte offset ${offset} (found "${objHeader.slice(0, 15)}")`);
    }
  }

  // 5. Verify catalog and pages
  const catalogMatch = text.match(/1 0 obj\s*<<\s*\/Type\s*\/Catalog\s*\/Pages\s*2 0 R\s*>>/);
  if (!catalogMatch) {
    throw new Error("Catalog object invalid or missing");
  }

  const pagesMatch = text.match(/2 0 obj\s*<<\s*\/Type\s*\/Pages\s*\/Kids\s*\[([^\]]+)\]\s*\/Count\s*(\d+)\s*>>/);
  if (!pagesMatch) {
    throw new Error("Pages object invalid or missing");
  }
  const totalPages = parseInt(pagesMatch[2]!, 10);
  const kids = pagesMatch[1]!.trim().split(/\s+/).filter((k) => k.endsWith("R"));

  if (kids.length !== totalPages) {
    throw new Error(`Kids count ${kids.length} does not match /Count ${totalPages}`);
  }

  // 6. Decode streams and extract texts
  const extractedTexts: string[] = [];
  const pageLineCounts: number[] = [];
  const pageSeatCounts: number[] = [];
  const streamRegex = /<<\s*\/Length\s*(\d+)\s*>>\s*stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let streamMatch: RegExpExecArray | null;

  while ((streamMatch = streamRegex.exec(text)) !== null) {
    const streamContent = streamMatch[2]!;
    let lineCount = 0;
    let seatCount = 0;

    const tjRegex = /\(([\s\S]*?)\)\s*Tj/g;
    let tjMatch: RegExpExecArray | null;
    while ((tjMatch = tjRegex.exec(streamContent)) !== null) {
      const rawString = tjMatch[1]!;
      let decoded = "";
      let j = 0;
      while (j < rawString.length) {
        if (rawString[j] === "\\" && j + 1 < rawString.length) {
          const next = rawString[j + 1]!;
          if (next === "\\" || next === "(" || next === ")") {
            decoded += next;
            j += 2;
          } else if (/^[0-7]/.test(next)) {
            let octal = next;
            let k = j + 2;
            while (k < rawString.length && k < j + 4 && /^[0-7]/.test(rawString[k]!)) {
              octal += rawString[k]!;
              k++;
            }
            const byteVal = parseInt(octal, 8);
            decoded += WIN_ANSI_BYTE_TO_CHAR[byteVal] ?? String.fromCharCode(byteVal);
            j = k;
          } else {
            decoded += next;
            j += 2;
          }
        } else {
          decoded += rawString[j]!;
          j++;
        }
      }
      extractedTexts.push(decoded);
      lineCount++;
      if (decoded.startsWith("Asiento: ")) seatCount++;
    }
    pageLineCounts.push(lineCount);
    pageSeatCounts.push(seatCount);
  }

  return {
    headerValid: true,
    xrefValid: true,
    totalPages,
    objectCount: countObj,
    pageObjectsCount: kids.length,
    pageLineCounts,
    pageSeatCounts,
    extractedTexts,
    rawText: extractedTexts.join("\n"),
  };
}

export interface MockAuditJobsStore {
  getJob: (id: string) => StoredAuditJob | null;
  saveJob: (job: StoredAuditJob) => boolean;
  nextJobId: (format: AuditFormat) => string;
}

export function createMockAuditRepository(
  changes: () => AuditEntry[] = () => [],
  jobsStore?: MockAuditJobsStore,
): AuditRepository {
  const entries = () => [...changes(), ...structuredClone(auditEntries)].sort(
    (a, b) => Date.parse(b.at) - Date.parse(a.at),
  );
  const fallbackJobs = new Map<string, StoredAuditJob>();
  let fallbackSequence = 0;

  const getJob = (id: string): StoredAuditJob | null => {
    if (jobsStore) return jobsStore.getJob(id);
    return fallbackJobs.get(id) ?? null;
  };
  const saveJob = (job: StoredAuditJob): boolean => {
    if (jobsStore) return jobsStore.saveJob(job);
    fallbackJobs.set(job.id, job);
    return true;
  };
  const nextJobId = (format: AuditFormat): string => {
    if (jobsStore) return jobsStore.nextJobId(format);
    return `exp-014-${format.toLowerCase()}-${++fallbackSequence}`;
  };

  return {
    async list(query, signal) {
      signal.throwIfAborted();
      const selected = entries().filter((entry) => matches(entry, query));
      const pages = Math.ceil(selected.length / query.size);
      const page = Math.min(query.page, pages || 1);
      return {
        items: structuredClone(
          selected.slice((page - 1) * query.size, page * query.size),
        ),
        page,
        size: query.size,
        total: selected.length,
        pages,
      };
    },
    async detail(id, signal) {
      signal.throwIfAborted();
      return structuredClone(entries().find((entry) => entry.id === id) ?? null);
    },
    async requestExport(input, signal) {
      signal.throwIfAborted();
      const count = entries().filter((entry) =>
        matches(entry, input.filters),
      ).length;
      if (count > (input.format === "CSV" ? 100000 : 500))
        throw new AuditFailure(
          "limit",
          "El resultado supera el límite del formato solicitado. Reduce los filtros.",
        );
      const jobId = nextJobId(input.format);
      const job: StoredAuditJob = {
        id: jobId,
        format: input.format,
        status: "QUEUED",
        createdAt: "2026-10-02T12:00:00Z",
        completedAt: null,
        fileAvailable: false,
        filters: structuredClone(input.filters),
      };
      const ok = saveJob(job);
      if (!ok) {
        throw new AuditFailure(
          "unavailable",
          "No se pudo guardar la solicitud de exportación en el almacenamiento.",
        );
      }
      return structuredClone(job);
    },
    async getExport(id, signal) {
      signal.throwIfAborted();
      const job = getJob(id);
      if (!job) return null;
      const prevStatus = job.status;
      const prevCompletedAt = job.completedAt;
      const prevFileAvailable = job.fileAvailable;
      let changed = false;
      if (job.status === "QUEUED") {
        job.status = "PROCESSING";
        changed = true;
      } else if (job.status === "PROCESSING") {
        job.status = "COMPLETED";
        job.completedAt = "2026-10-02T12:00:15Z";
        job.fileAvailable = true;
        changed = true;
      }
      if (changed) {
        const ok = saveJob(job);
        if (!ok) {
          job.status = prevStatus;
          job.completedAt = prevCompletedAt;
          job.fileAvailable = prevFileAvailable;
          throw new AuditFailure(
            "unavailable",
            "No se pudo actualizar el estado de la exportación en el almacenamiento.",
          );
        }
      }
      return structuredClone(job);
    },
    async download(id, signal) {
      signal.throwIfAborted();
      const job = getJob(id);
      if (!job || job.status !== "COMPLETED" || !job.fileAvailable)
        throw new AuditFailure(
          "unavailable",
          "El archivo todavía no está disponible.",
        );
      const matchingEntries = entries().filter((entry) =>
        matches(entry, job.filters),
      );
      const data =
        job.format === "CSV"
          ? generateAuditCsv(matchingEntries)
          : generateAuditPdf(matchingEntries, job.filters);
      return {
        data,
        filename: `reporte_auditoria_${job.id.toLowerCase()}.${job.format.toLowerCase()}`,
      };
    },
  };
}
