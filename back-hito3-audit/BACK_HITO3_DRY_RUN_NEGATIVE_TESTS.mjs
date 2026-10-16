import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validatePackage } from "./BACK_HITO3_VALIDATOR.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const read = name => fs.readFileSync(path.join(here, name), "utf8");
const mode = process.argv.find(arg => arg.startsWith("--mode="))?.slice("--mode=".length) ?? "draft";
const original = JSON.parse(read("BACK_HITO3_MANIFEST.json"));
const summary = JSON.parse(read("BACK_HITO3_SUMMARY.json"));
const inputs = { summary, matrixText: read("BACK_HITO3_MATRIZ.md"), issuesText: read("BACK_HITO3_ISSUES.md"), changesText: read("BACK_HITO3_CAMBIOS.md"), dependenciesText: read("BACK_HITO3_DEPENDENCIAS.md"), intAsapMatrixText: read("BACK_HITO3_INT_ASAP_TRAZABILIDAD.md"), approvalText: read("BACK_HITO3_APROBACION_RESPONSABLES.md"), publicationLedger: JSON.parse(read("BACK_HITO3_PUBLICATION_LEDGER.json")) };
const base = validatePackage({ ...inputs, manifest: original, mode });
assert.deepEqual(base.errors, [], `El baseline debe validar antes de ejecutar mutaciones: ${base.errors.join("; ")}`);
const baselineBytes = JSON.stringify(original);
const cases = [
  ["responsable incorrecto", "OWNER", m => { m.issues[0].owner = "Responsable Incorrecto"; }],
  ["rama inválida", "OWNER", m => { m.issues[0].branch = "rama-inexistente"; }],
  ["dependencia circular", "CYCLE", m => { m.issues[0].depends_on.push(m.issues[1].id); m.issues[1].depends_on.push(m.issues[0].id); }],
  ["referencia inexistente", "MISSING_REFERENCE", m => { m.issues[0].depends_on.push("ISSUE-QUE-NO-EXISTE"); }],
  ["ID duplicado", "DUPLICATE", m => { m.issues.push(structuredClone(m.issues[0])); m.issue_count++; }],
  ["referencia INT-ASAP hacia BACK inexistente", "INT_ASAP", m => { m.int_asap_traceability.issues[0].back_ids.push("BACK-INEXISTENTE"); }],
  ["asignación sin aprobación formal", "OWNER", m => { m.owner_assignment_approvals = m.owner_assignment_approvals.filter(a => a.issue_id !== "SHARED-BACK-01"); }]
];
for (const [label, category, mutate] of cases) {
  const mutated = structuredClone(original);
  mutate(mutated);
  const result = validatePackage({ ...inputs, manifest: mutated, mode });
  assert.ok(result.errors.some(error => error.startsWith(`${category}:`)), `${label}: el validador debe rechazarlo. Hallazgos: ${result.errors.join("; ")}`);
  console.log(`PASS negativo — ${label}`);
}
assert.equal(JSON.stringify(original), baselineBytes, "Las pruebas negativas no deben alterar el objeto base.");
assert.equal(JSON.stringify(JSON.parse(read("BACK_HITO3_MANIFEST.json"))), baselineBytes, "Las pruebas negativas no deben escribir ni alterar el manifiesto real.");
console.log(`NEGATIVE TESTS PASS — ${cases.length} casos rechazados; manifiesto real intacto.`);

const traceRows = inputs.intAsapMatrixText.split(/\r?\n/);
const row22 = traceRows.findIndex(line => line.includes("[#22 "));
const row23 = traceRows.findIndex(line => line.includes("[#23 "));
assert.ok(row22 >= 0 && row23 >= 0, "La matriz debe tener las filas #22 y #23 antes de mutarlas.");
const cells22 = traceRows[row22].split("|");
const cells23 = traceRows[row23].split("|");
[cells22[1], cells23[1]] = [cells23[1], cells22[1]];
traceRows[row22] = cells22.join("|");
traceRows[row23] = cells23.join("|");
const movedTraceResult = validatePackage({ ...inputs, manifest: original, intAsapMatrixText: traceRows.join("\n"), mode });
assert.ok(movedTraceResult.errors.some(error => error.startsWith("INT_ASAP:")), `Mover referencias entre filas debe ser detectado. Hallazgos: ${movedTraceResult.errors.join("; ")}`);
console.log("PASS negativo — referencia BACK movida a otra fila INT-ASAP detectada.");

function validateEditedBody(logicalId, edit) {
  const manifestCopy = structuredClone(original);
  const item = manifestCopy.issues.find(issue => issue.id === logicalId);
  const oldBody = item.body;
  item.body = edit(oldBody);
  let markdown = inputs.issuesText;
  const marker = `**${logicalId} ·`;
  const start = markdown.indexOf(marker);
  const bodyStart = markdown.indexOf("\n## Objetivo", start);
  const bodyEnd = markdown.indexOf("\n---", bodyStart);
  assert.ok(start >= 0 && bodyStart >= 0 && bodyEnd >= 0, `Debe encontrarse cuerpo Markdown de ${logicalId}`);
  markdown = `${markdown.slice(0, bodyStart + 1)}${item.body}${markdown.slice(bodyEnd)}`;
  return validatePackage({ ...inputs, manifest: manifestCopy, issuesText: markdown, mode });
}

const mandatoryBodyResult = validateEditedBody("TAXONOMY-SVC-BACK-09", body => body.replace(/\n- CATALOG-SVC-BACK-06[^\n]*/, ""));
assert.ok(mandatoryBodyResult.errors.some(error => error.startsWith("DEPENDENCIAS_BODY:")), `Divergencia obligatoria en el cuerpo debe rechazarse: ${mandatoryBodyResult.errors.join("; ")}`);
console.log("PASS negativo — dependencia obligatoria ausente de la sección humana detectada.");

const conditionalBodyResult = validateEditedBody("TAXONOMY-SVC-BACK-08", body => {
  const start = body.indexOf("**Bloqueos específicos y condición de desbloqueo:**");
  const end = body.indexOf("\n## ", start);
  const section = body.slice(start, end < 0 ? body.length : end).replace(/CATALOG-SVC-BACK-06/g, "");
  return `${body.slice(0, start)}${section}${body.slice(end < 0 ? body.length : end)}`;
});
assert.ok(conditionalBodyResult.errors.some(error => error.startsWith("DEPENDENCIAS_BODY:")), `Divergencia condicional en el cuerpo debe rechazarse: ${conditionalBodyResult.errors.join("; ")}`);
console.log("PASS negativo — dependencia condicional ausente de su sección humana detectada.");

const assignmentResult = validatePackage({ ...inputs, manifest: original, mode });
assert.deepEqual(assignmentResult.errors, [], `La asignación formal aprobada debe validar con el registro verificable real: ${assignmentResult.errors.join("; ")}`);
assert.equal(assignmentResult.metrics.owner_pending, 0, "Las siete asignaciones aprobadas deben dejar cero owners pendientes.");
assert.equal(JSON.stringify(JSON.parse(read("BACK_HITO3_MANIFEST.json"))), baselineBytes, "La prueba formal tampoco debe alterar el manifiesto real.");
console.log("PASS asignación formal aprobada — siete registros y documento concordantes; manifiesto real intacto.");
