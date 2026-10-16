import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validatePackage } from "./BACK_HITO3_VALIDATOR.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const read = name => fs.readFileSync(path.join(here, name), "utf8");
const manifest = JSON.parse(read("BACK_HITO3_MANIFEST.json"));
const summary = JSON.parse(read("BACK_HITO3_SUMMARY.json"));
const result = validatePackage({
  manifest, summary,
  matrixText: read("BACK_HITO3_MATRIZ.md"),
  issuesText: read("BACK_HITO3_ISSUES.md"),
  changesText: read("BACK_HITO3_CAMBIOS.md"),
  dependenciesText: read("BACK_HITO3_DEPENDENCIAS.md"),
  intAsapMatrixText: read("BACK_HITO3_INT_ASAP_TRAZABILIDAD.md"),
  approvalText: read("BACK_HITO3_APROBACION_RESPONSABLES.md"),
  publicationLedger: JSON.parse(read("BACK_HITO3_PUBLICATION_LEDGER.json"))
});
if (result.errors.length) {
  console.error(`DRY-RUN FAIL — ${result.errors.length} hallazgos`);
  for (const error of result.errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log("DRY-RUN PASS — validación local de solo lectura; no contacta GitHub ni escribe archivos.");
  console.log(JSON.stringify(result.metrics, null, 2));
}
