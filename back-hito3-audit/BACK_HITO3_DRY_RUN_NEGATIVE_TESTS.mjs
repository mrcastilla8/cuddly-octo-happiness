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
