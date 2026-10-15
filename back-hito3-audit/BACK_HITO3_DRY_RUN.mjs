import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(here, "BACK_HITO3_MANIFEST.json"), "utf8"));
const issues = manifest.issues ?? [];
const problems = [];
const allowed = new Set(["NO_INICIADO", "PARCIAL", "IMPLEMENTADO_SIN_VALIDAR", "IMPLEMENTADO_VALIDADO", "NO_APLICA", "BLOQUEADO_ESPECÍFICO"]);
const expectedOwners = {
  "bulk-svc": ["Marco Castilla", "mrcastilla8", "castilla"],
  "combos-svc": ["Marco Castilla", "mrcastilla8", "castilla"],
  "catalog-svc": ["Gabriel Poma", "GabrielPGu", "poma"],
  "promotions-svc": ["Axel Cueva", "AXL031", "cueva"],
  "taxonomy-svc": ["Leonardo López", "VicuzS", "lopez"],
  "pricing-svc": ["Leonardo Vera", "LeonardoVera", "vera"],
  "price-audit-svc": ["Leonardo Vera", "LeonardoVera", "vera"],
  "inventory-svc": ["Miguel Taco", "MiguelTacoZavala", "taco"],
  "api-gateway": ["Axel Cueva", "AXL031", "cueva"]
};
const byId = new Map();
const allEdges = item => [...new Set([...(item.depends_on ?? []), ...(item.blocking_conditions ?? []).flatMap(c => c.dependency_ids ?? [])])];
for (const item of issues) {
  if (!item.id || byId.has(item.id)) problems.push("ID ausente o duplicado: " + item.id);
  else byId.set(item.id, item);
  if (!item.title || !item.owner || !item.branch || !item.body) problems.push("Registro incompleto: " + item.id);
  if (!allowed.has(item.status)) problems.push("Estado no permitido: " + item.id + " / " + item.status);
  if (item.publishable !== false || item.publication_state !== "BORRADOR_NO_PUBLICADO") problems.push("Registro publicable: " + item.id);
  for (const field of ["depends_on", "blocks", "external_dependencies", "blocking_conditions", "related_prs"]) {
    if (!Array.isArray(item[field])) problems.push("Campo estructurado ausente: " + item.id + ":" + field);
  }
  if (expectedOwners[item.service]) {
    const [name, login, branch] = expectedOwners[item.service];
    if (item.owner !== name || item.github_user !== login || item.branch !== branch) problems.push("Owner/rama incorrecta: " + item.id);
  } else if (item.service === "transversal" && (item.owner !== "OWNER_PENDIENTE" || item.github_user !== null)) {
    problems.push("Owner transversal asignado sin autorización: " + item.id);
  }
  for (const heading of ["Objetivo", "Responsable", "Alcance", "Fuera de alcance", "Fuentes normativas", "Estado inicial", "Dependencias bloqueantes", "Tareas", "Criterios de aceptación", "Pruebas obligatorias", "Evidencias de cierre", "Definición de terminado", "Riesgos o bloqueos específicos"]) {
    if (!item.body.includes("## " + heading)) problems.push("Sección faltante " + heading + " en " + item.id);
  }
  for (const ext of item.external_dependencies ?? []) {
    if (!Number.isInteger(ext.number) || ext.number <= 0 || !ext.repository || !ext.url.endsWith("/issues/" + ext.number)) problems.push("Referencia externa inválida en " + item.id);
  }
}
if (manifest.issue_count !== issues.length) problems.push("issue_count no coincide con el manifiesto.");
if (manifest.publication_authorized !== false) problems.push("publication_authorized debe seguir false.");
for (const item of issues) for (const dep of allEdges(item)) {
  if (dep === item.id) problems.push("Autorreferencia: " + item.id);
  if (!byId.has(dep)) problems.push("Referencia lógica inexistente: " + item.id + " -> " + dep);
}
const inverse = new Map(issues.map(item => [item.id, []]));
for (const item of issues) for (const dep of allEdges(item)) if (inverse.has(dep)) inverse.get(dep).push(item.id);
for (const item of issues) {
  const expected = [...(inverse.get(item.id) ?? [])].sort();
  const actual = [...(item.blocks ?? [])].sort();
  if (JSON.stringify(expected) !== JSON.stringify(actual)) problems.push("Relación inversa blocks incoherente: " + item.id);
}
const visiting = new Set();
const visited = new Set();
const stack = [];
function visit(id) {
  if (visiting.has(id)) {
    const start = stack.indexOf(id);
    problems.push("Ciclo: " + stack.slice(start).concat(id).join(" -> "));
    return;
  }
  if (visited.has(id) || !byId.has(id)) return;
  visiting.add(id);
  stack.push(id);
  for (const dep of allEdges(byId.get(id))) visit(dep);
  stack.pop();
  visiting.delete(id);
  visited.add(id);
}
for (const item of issues) visit(item.id);
const expectedMk = {
  "BULK-SVC-BACK-08": [1], "COMBOS-SVC-BACK-08": [2], "CATALOG-SVC-BACK-08": [3,4],
  "PROMOTIONS-SVC-BACK-08": [5,6,7], "TAXONOMY-SVC-BACK-08": [8,9,10,11,12],
  "PRICING-SVC-BACK-08": [13], "PRICE-AUDIT-SVC-BACK-08": [14], "INVENTORY-SVC-BACK-08": [15,16]
};
const mkSeen = new Set();
for (const [id, numbers] of Object.entries(expectedMk)) {
  const item = byId.get(id);
  if (!item) { problems.push("BACK-08 ausente: " + id); continue; }
  const actual = [...item.body.matchAll(/MK-(\d{3})/g)].map(m => Number(m[1]));
  for (const number of numbers) {
    if (!actual.includes(number)) problems.push("MK sin mapeo en " + id + ": MK-" + String(number).padStart(3,"0"));
    mkSeen.add(number);
  }
}
if (mkSeen.size !== 16) problems.push("La cobertura MK no es exactamente 16.");
if (issues.length !== 81) problems.push("Conteo inesperado: " + issues.length + " (esperados 81 tras eliminar duplicado y añadir aceptación final).");
if (problems.length) {
  console.error("DRY-RUN FAIL — " + problems.length + " hallazgos");
  for (const problem of problems) console.error("- " + problem);
  process.exitCode = 1;
} else {
  const statuses = {};
  for (const item of issues) statuses[item.status] = (statuses[item.status] ?? 0) + 1;
  console.log("DRY-RUN PASS — solo lectura; sin red, GitHub, Supabase ni escritura.");
  console.log(JSON.stringify({records: issues.length, unique_ids: byId.size, dependency_cycles: 0, self_references: 0, unresolved_logical_references: 0, inverse_mismatches: 0, mk_covered: mkSeen.size, publishable: 0, statuses}, null, 2));
}
