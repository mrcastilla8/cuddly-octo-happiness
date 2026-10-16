import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validatePackage } from "./BACK_HITO3_VALIDATOR.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const read = name => fs.readFileSync(path.join(here, name), "utf8");
const original = JSON.parse(read("BACK_HITO3_MANIFEST.json"));
const summary = JSON.parse(read("BACK_HITO3_SUMMARY.json"));
const inputs = { summary, matrixText: read("BACK_HITO3_MATRIZ.md"), issuesText: read("BACK_HITO3_ISSUES.md"), changesText: read("BACK_HITO3_CAMBIOS.md"), dependenciesText: read("BACK_HITO3_DEPENDENCIAS.md") };
const base = validatePackage({ ...inputs, manifest: original });
assert.deepEqual(base.errors, [], `El baseline debe validar antes de ejecutar mutaciones: ${base.errors.join("; ")}`);
const baselineBytes = JSON.stringify(original);
const cases = [
  ["responsable incorrecto", "OWNER", m => { m.issues[0].owner = "Responsable Incorrecto"; }],
  ["rama inválida", "OWNER", m => { m.issues[0].branch = "rama-inexistente"; }],
  ["dependencia circular", "CYCLE", m => { m.issues[0].depends_on.push(m.issues[1].id); m.issues[1].depends_on.push(m.issues[0].id); }],
  ["referencia inexistente", "MISSING_REFERENCE", m => { m.issues[0].depends_on.push("ISSUE-QUE-NO-EXISTE"); }],
  ["ID duplicado", "DUPLICATE", m => { m.issues.push(structuredClone(m.issues[0])); m.issue_count++; }]
];
for (const [label, category, mutate] of cases) {
  const mutated = structuredClone(original);
  mutate(mutated);
  const result = validatePackage({ ...inputs, manifest: mutated });
  assert.ok(result.errors.some(error => error.startsWith(`${category}:`)), `${label}: el validador debe rechazarlo. Hallazgos: ${result.errors.join("; ")}`);
  console.log(`PASS negativo — ${label}`);
}
assert.equal(JSON.stringify(original), baselineBytes, "Las pruebas negativas no deben alterar el objeto base.");
assert.equal(JSON.stringify(JSON.parse(read("BACK_HITO3_MANIFEST.json"))), baselineBytes, "Las pruebas negativas no deben escribir ni alterar el manifiesto real.");
console.log(`NEGATIVE TESTS PASS — ${cases.length} casos rechazados; manifiesto real intacto.`);

const assignmentTrial = structuredClone(original);
const assigned = assignmentTrial.issues.find(item => item.id === "SHARED-BACK-01");
const previousBody = assigned.body;
assigned.owner = "Marco Castilla";
assigned.github_user = "mrcastilla8";
assigned.branch = "castilla";
assigned.assignee_status = "APROBADO_FORMALMENTE";
assigned.body = assigned.body.replace(/\*\*OWNER_PENDIENTE\*\* \(no asignar hasta autorización\)\. Candidatos sugeridos, sin asignación:[^\n]*/, "**Marco Castilla** (mrcastilla8) · rama castilla. Asignación simulada únicamente para validar el flujo formal.");
assignmentTrial.owner_assignment_approvals.push({ issue_id: assigned.id, owner: assigned.owner, github_user: assigned.github_user, branch: assigned.branch, code_repository: assigned.code_repository, approved_by: "Marco Castilla", approved_at: "2026-10-15", approval_reference: "APPROVAL-SIMULATED-UNIT-TEST" });
assignmentTrial.review_metadata.pending_transversal_owner_count--;
const assignmentSummary = structuredClone(summary);
assignmentSummary.by_responsible.OWNER_PENDIENTE--;
assignmentSummary.by_responsible[assigned.owner]++;
let assignmentMatrix = inputs.matrixText.replace("SHARED-BACK-01 | [BACK][shared][01] Cliente HTTP común de React para modo API | transversal | NO_INICIADO | OWNER_PENDIENTE / OWNER_PENDIENTE |", "SHARED-BACK-01 | [BACK][shared][01] Cliente HTTP común de React para modo API | transversal | NO_INICIADO | Marco Castilla / castilla |");
let assignmentIssues = inputs.issuesText.replace("**SHARED-BACK-01 · OWNER_PENDIENTE · NO_INICIADO**", "**SHARED-BACK-01 · Marco Castilla · NO_INICIADO**").replace(previousBody, assigned.body);
const assignmentResult = validatePackage({ ...inputs, manifest: assignmentTrial, summary: assignmentSummary, matrixText: assignmentMatrix, issuesText: assignmentIssues });
assert.deepEqual(assignmentResult.errors, [], `La asignación posterior solo debe validarse con aprobación formal concordante: ${assignmentResult.errors.join("; ")}`);
assert.equal(JSON.stringify(JSON.parse(read("BACK_HITO3_MANIFEST.json"))), baselineBytes, "La simulación de asignación formal tampoco debe alterar el manifiesto real.");
console.log("PASS asignación formal simulada — metadatos, aprobación expresa, matriz, issue y SUMMARY concordantes; manifiesto real intacto.");
