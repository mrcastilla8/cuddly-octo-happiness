const STATUSES = ["NO_INICIADO", "PARCIAL", "IMPLEMENTADO_SIN_VALIDAR", "IMPLEMENTADO_VALIDADO", "NO_APLICA", "BLOQUEADO_ESPECÍFICO"];
const OWNERS = {
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
const SERVICE_BY_PREFIX = {
  "TAXONOMY-SVC-": "taxonomy-svc", "CATALOG-SVC-": "catalog-svc",
  "PRICING-SVC-": "pricing-svc", "PRICE-AUDIT-SVC-": "price-audit-svc",
  "PROMOTIONS-SVC-": "promotions-svc", "COMBOS-SVC-": "combos-svc",
  "BULK-SVC-": "bulk-svc", "INVENTORY-SVC-": "inventory-svc",
  "GATEWAY-": "api-gateway", "SHARED-": "transversal", "DATA-": "transversal", "DEPLOY-": "transversal"
};
const CODE_REPOSITORY = item => item.id.endsWith("-BACK-08") || ["SHARED-BACK-01", "SHARED-BACK-03", "SHARED-BACK-04"].includes(item.id)
  ? "Taller-SW-Web/G6-Productos-Ofertas-frontend" : "Taller-SW-Web/G6-Productos-Ofertas-backend";
const sorted = values => [...values].sort();
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const allEdges = item => [...new Set([...(item.depends_on ?? []), ...(item.blocking_conditions ?? []).flatMap(c => c.dependency_ids ?? [])])];

export function validatePackage({ manifest, summary, matrixText, issuesText, changesText, dependenciesText }) {
  const errors = [];
  const fail = (category, message) => errors.push(`${category}: ${message}`);
  const items = manifest?.issues ?? [];
  const byId = new Map();
  if (!Array.isArray(items) || !items.length) fail("MANIFEST", "no contiene registros");
  for (const item of items) {
    if (!item?.id) { fail("DUPLICATE", "ID ausente"); continue; }
    if (byId.has(item.id)) fail("DUPLICATE", `ID duplicado ${item.id}`); else byId.set(item.id, item);
  }
  const count = items.length;
  if (manifest.issue_count !== count) fail("COUNT", "issue_count no coincide con MANIFEST");
  if (manifest.publication_authorized !== false) fail("SAFETY", "publication_authorized debe permanecer false");

  const statusCounts = Object.fromEntries(STATUSES.map(s => [s, 0]));
  const services = {}, owners = {};
  for (const item of items) {
    const expectedService = item.id === "DEPLOY-BACK-02" ? "deployment" : Object.entries(SERVICE_BY_PREFIX).find(([prefix]) => item.id.startsWith(prefix))?.[1];
    if (!expectedService || item.service !== expectedService) fail("SERVICE", `${item.id} service=${item.service ?? "ausente"}; esperado ${expectedService ?? "prefijo reconocido"}`);
    if (!item.owner || !item.branch || (!['transversal', 'deployment'].includes(item.service) && !item.github_user) || !item.code_repository) fail("OWNER", `responsable incompleto en ${item.id}`);
    if (!STATUSES.includes(item.status)) fail("STATUS", `estado desconocido en ${item.id}: ${item.status}`);
    else statusCounts[item.status]++;
    services[item.service] = (services[item.service] ?? 0) + 1;
    owners[item.owner] = (owners[item.owner] ?? 0) + 1;
    const official = OWNERS[item.service];
    if (official && (item.owner !== official[0] || item.github_user !== official[1] || item.branch !== official[2])) fail("OWNER", `${item.id} no coincide con usuario oficial y rama para ${item.service}`);
    if (item.service === "transversal" || item.service === "deployment") {
      if (item.owner === "OWNER_PENDIENTE") {
        if (item.github_user !== null || item.branch !== "OWNER_PENDIENTE" || item.assignee_status !== "NO_ASIGNAR") fail("OWNER", `${item.id} pendiente debe conservar login nulo, rama pendiente y NO_ASIGNAR`);
      } else {
        const approval = (manifest.owner_assignment_approvals ?? []).find(a => a.issue_id === item.id);
        const approvedPair = Object.values(OWNERS).some(([name, login, branch]) => name === item.owner && login === item.github_user && branch === item.branch);
        const approvalRefIsReviewable = /^https:\/\//.test(approval?.approval_reference ?? "") || /^APPROVAL-[A-Z0-9-]{6,}$/.test(approval?.approval_reference ?? "");
        if (!approvedPair || !approval || approval.owner !== item.owner || approval.github_user !== item.github_user || approval.branch !== item.branch || approval.code_repository !== item.code_repository || approval.approved_by !== "Marco Castilla" || !/^\d{4}-\d{2}-\d{2}$/.test(approval.approved_at ?? "") || !approvalRefIsReviewable || item.assignee_status !== "APROBADO_FORMALMENTE") fail("OWNER", `${item.id} tiene asignación sin aprobación formal verificable`);
      }
    }
    if (item.code_repository !== CODE_REPOSITORY(item)) fail("CODE_REPOSITORY", `${item.id} apunta a ${item.code_repository}`);
    if (item.issue_repository !== manifest.issue_repository) fail("REPOSITORY", `issue_repository distinto en ${item.id}`);
    if (item.publishable !== false || item.publication_state !== "BORRADOR_NO_PUBLICADO") fail("SAFETY", `${item.id} no está protegido como borrador`);
    if (!item.body || !item.title) fail("ISSUES", `falta título o cuerpo en ${item.id}`);
    for (const field of ["depends_on", "blocks", "external_dependencies", "blocking_conditions", "related_prs"]) if (!Array.isArray(item[field])) fail("MANIFEST", `${item.id} no define ${field} como arreglo`);
    for (const ext of item.external_dependencies ?? []) if (!Number.isInteger(ext.number) || ext.number < 1 || !ext.repository || !String(ext.url).endsWith(`/issues/${ext.number}`)) fail("DEPENDENCIAS", `referencia externa inválida en ${item.id}`);
    for (const heading of ["Objetivo", "Responsable", "Alcance", "Fuera de alcance", "Fuentes normativas", "Estado inicial", "Dependencias bloqueantes", "Tareas", "Criterios de aceptación", "Pruebas obligatorias", "Evidencias de cierre", "Definición de terminado", "Riesgos o bloqueos específicos"]) if (!item.body?.includes(`## ${heading}`)) fail("ISSUES", `falta sección ${heading} en ${item.id}`);
  }

  if (summary.draft_issue_count !== count || summary.manifest_records !== count || summary.matrix_rows !== count) fail("SUMMARY", "draft_issue_count/manifest_records/matrix_rows no coinciden con MANIFEST");
  if (!same({ ...Object.fromEntries(STATUSES.map(s => [s, summary.by_initial_status?.[s] ?? 0])), ...summary.by_initial_status }, statusCounts)) fail("SUMMARY", "conteos de estado no coinciden con MANIFEST");
  if (!same(summary.by_service, services) || !same(summary.by_responsible, owners)) fail("SUMMARY", "distribución de servicios o responsables no coincide con MANIFEST");
  const beforeAfter = summary.before_after;
  if (!beforeAfter || beforeAfter.after !== count || beforeAfter.before - (beforeAfter.removed ?? []).length + (beforeAfter.added ?? []).length !== count || beforeAfter.retained + (beforeAfter.removed ?? []).length !== beforeAfter.before) fail("SUMMARY", "reconciliación before/after inconsistente");

  const matrixRows = matrixText.split(/\r?\n/).filter(line => /^\| [A-Z][A-Z0-9-]+ \|/.test(line) && byId.has(line.split("|")[1].trim()));
  if (matrixRows.length !== count) fail("MATRIZ", `filas ${matrixRows.length}, manifiesto ${count}`);
  for (const item of items) {
    const row = matrixRows.find(line => line.startsWith(`| ${item.id} |`));
    if (!row) { fail("MATRIZ", `falta ${item.id}`); continue; }
    const cells = row.split("|").slice(1, -1).map(x => x.trim());
    if (cells[1] !== item.title || cells[2] !== item.service || cells[3] !== item.status || !cells[4].includes(item.owner) || !cells[4].includes(item.branch) || cells[8] !== item.code_repository || cells[9] !== (item.publishable ? "Sí" : "No")) fail("MATRIZ", `campos divergen en ${item.id}`);
    const cellDeps = cell => cell === "—" || !cell ? [] : sorted(cell.split(/,\s*/));
    if (!same(cellDeps(cells[5]), sorted(item.depends_on)) || !same(cellDeps(cells[6]), sorted(item.blocking_conditions.flatMap(c => c.dependency_ids ?? [])))) fail("MATRIZ", `dependencias divergen en ${item.id}`);
  }

  const issueHeadings = [...issuesText.matchAll(/^\*\*([A-Z][A-Z0-9-]+) ·/gm)].map(m => m[1]);
  if (issueHeadings.length !== count || new Set(issueHeadings).size !== count) fail("ISSUES", `encabezados ${issueHeadings.length}, únicos ${new Set(issueHeadings).size}, manifiesto ${count}`);
  for (const item of items) if (!issueHeadings.includes(item.id)) fail("ISSUES", `sin sección de issue ${item.id}`);
  const issueBlocks = new Map(issuesText.split(/\r?\n---\r?\n/).map(block => {
    const id = block.match(/^\*\*([A-Z][A-Z0-9-]+) ·/m)?.[1];
    const bodyStart = block.indexOf("\n## Objetivo");
    const body = bodyStart >= 0 ? block.slice(bodyStart + 1).trimEnd() : undefined;
    return [id, body];
  }).filter(([id]) => id));
  for (const item of items) if (issueBlocks.get(item.id) !== item.body?.trimEnd()) fail("ISSUES", `cuerpo markdown no coincide con MANIFEST en ${item.id}`);

  const changesCounts = {};
  for (const line of changesText.split(/\r?\n/)) {
    const match = line.match(/^\| ([A-ZÁÉÍÓÚ_]+) \| (\d+) \|$/);
    if (match) changesCounts[match[1]] = Number(match[2]);
  }
  if (!same(changesCounts, statusCounts)) fail("CAMBIOS", "tabla de estados no coincide con MANIFEST");
  const declared = changesText.match(/Total de registros:\s*(\d+)/i);
  if (!declared || Number(declared[1]) !== count) fail("CAMBIOS", "total declarado no coincide con MANIFEST");

  const edgesById = new Map(items.map(item => [item.id, allEdges(item)]));
  for (const item of items) for (const dep of edgesById.get(item.id)) {
    if (dep === item.id) fail("CYCLE", `autorreferencia ${item.id}`);
    if (!byId.has(dep)) fail("MISSING_REFERENCE", `${item.id} -> ${dep}`);
  }
  const inverse = new Map(items.map(item => [item.id, []]));
  for (const item of items) for (const dep of edgesById.get(item.id)) if (inverse.has(dep)) inverse.get(dep).push(item.id);
  for (const item of items) if (!same(sorted(item.blocks), sorted(inverse.get(item.id) ?? []))) fail("DEPENDENCIAS", `blocks inverso diverge en ${item.id}`);
  const visiting = new Set(), visited = new Set();
  function visit(id) {
    if (visiting.has(id)) { fail("CYCLE", `grafo contiene ciclo por ${id}`); return; }
    if (visited.has(id) || !byId.has(id)) return;
    visiting.add(id); for (const dep of edgesById.get(id)) visit(dep); visiting.delete(id); visited.add(id);
  }
  for (const id of byId.keys()) visit(id);
  const mandatorySection = dependenciesText.split(/^## Dependencias condicionales/m)[0];
  const dependencyRows = new Map([...mandatorySection.matchAll(/^- \*\*([A-Z][A-Z0-9-]+)\*\* → (.+)$/gm)].map(m => [m[1], m[2].trim()]));
  if (dependencyRows.size !== count) fail("DEPENDENCIAS", `filas obligatorias ${dependencyRows.size}, manifiesto ${count}`);
  for (const item of items) {
    const expected = item.depends_on.length ? sorted(item.depends_on) : [];
    const actualLine = dependencyRows.get(item.id);
    const actual = actualLine === "sin prerrequisito interno" || actualLine === "sin prerrequisito" ? [] : sorted((actualLine ?? "").split(/,\s*/));
    if (!same(actual, expected)) fail("DEPENDENCIAS", `dependencia obligatoria diverge en ${item.id}`);
    const conditionalRefs = item.blocking_conditions.flatMap(c => c.dependency_ids ?? []);
    if (conditionalRefs.length && !dependenciesText.includes(`**${item.id}** ·`)) fail("DEPENDENCIAS", `falta condición documentada en ${item.id}`);
  }

  const mkExpected = {"BULK-SVC-BACK-08":[1],"COMBOS-SVC-BACK-08":[2],"CATALOG-SVC-BACK-08":[3,4],"PROMOTIONS-SVC-BACK-08":[5,6,7],"TAXONOMY-SVC-BACK-08":[8,9,10,11,12],"PRICING-SVC-BACK-08":[13],"PRICE-AUDIT-SVC-BACK-08":[14],"INVENTORY-SVC-BACK-08":[15,16]};
  const mkCovered = new Set();
  for (const [id, numbers] of Object.entries(mkExpected)) {
    const item = byId.get(id); if (!item) { fail("MK", `falta ${id}`); continue; }
    const inBody = new Set([...item.body.matchAll(/MK-(\d{3})/g)].map(m => Number(m[1])));
    for (const n of numbers) { if (!inBody.has(n)) fail("MK", `${id} no cubre MK-${String(n).padStart(3,"0")}`); mkCovered.add(n); }
  }
  if (mkCovered.size !== 16) fail("MK", `cobertura ${mkCovered.size}, esperadas 16`);

  const api = manifest.contract_audit?.openapi;
  const operationMap = new Map((api?.operations ?? []).map(op => [op.operationId, `${op.method.toUpperCase()} ${op.path}`]));
  if (!api?.blob_sha || !operationMap.size || operationMap.size !== api.operations.length || api.operations.some(op => !op.operationId || !op.method || !op.path)) fail("OPENAPI", "snapshot ausente, incompleto o con operationIds duplicados");
  for (const item of items) {
    for (const match of item.scope.matchAll(/\b(GET|POST|PUT|PATCH|DELETE)\s+(\/[^\s;,)]*)\s*\(([A-Za-z][A-Za-z0-9]+)\)/g)) {
      const expected = operationMap.get(match[3]);
      if (!expected) fail("OPENAPI", `${item.id} operationId inexistente ${match[3]}`);
      else if (expected !== `${match[1]} ${match[2]}`) fail("OPENAPI", `${item.id} ruta/método diverge para ${match[3]}`);
    }
  }
  const asyncapi = manifest.contract_audit?.asyncapi;
  const messageNames = new Set(asyncapi?.message_names ?? []);
  if (!asyncapi?.blob_sha || !messageNames.size || messageNames.size !== asyncapi.message_names.length) fail("ASYNCAPI", "snapshot ausente, incompleto o con mensajes duplicados");
  for (const event of asyncapi?.bff_consumed_events ?? []) if (!messageNames.has(event)) fail("ASYNCAPI", `evento BFF inventado o ausente: ${event}`);
  const gatewayEvents = (asyncapi?.bff_consumed_events ?? []).filter(event => byId.get("GATEWAY-BACK-03")?.scope.includes(event));
  if (gatewayEvents.length !== (asyncapi?.bff_consumed_events ?? []).length) fail("ASYNCAPI", "GATEWAY-BACK-03 no enumera los eventos BFF auditados");
  for (const item of items) {
    if (/\b[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*){2,}\/[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)*\b/.test(item.scope)) fail("ASYNCAPI", `${item.id} contiene nombre de evento abreviado con barra`);
    for (const match of item.scope.matchAll(/\b[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*){2,}\b/g)) if (!match[0].endsWith(".spec.ts") && !messageNames.has(match[0])) fail("ASYNCAPI", `${item.id} referencia mensaje no declarado: ${match[0]}`);
  }

  const protectedIds = manifest.owner_assignment_policy?.protected_transversal_ids ?? [];
  if (protectedIds.length !== manifest.review_metadata?.protected_transversal_owner_count || protectedIds.some(id => byId.get(id)?.service !== "transversal")) fail("OWNER", "la lista protegida de responsables transversales no coincide con los seis alcances declarados");
  const approvalIds = (manifest.owner_assignment_approvals ?? []).map(a => a.issue_id);
  if (new Set(approvalIds).size !== approvalIds.length) fail("OWNER", "hay registros de aprobación formal duplicados");
  const pendingOwners = protectedIds.map(id => byId.get(id)).filter(item => item?.owner === "OWNER_PENDIENTE");
  if (pendingOwners.length !== manifest.review_metadata?.pending_transversal_owner_count) fail("OWNER", "conteo de owners pendientes diverge de los metadatos del manifiesto");
  for (const id of protectedIds) if (!byId.has(id)) fail("OWNER", `falta alcance transversal protegido ${id}`);
  const snapshot = manifest.retrospective_evidence_policy;
  if (snapshot?.policy_id !== "INVENTORY-PR10-RETROSPECTIVE" || !snapshot?.verification?.commit_shas?.length || !snapshot?.verification?.changed_files?.length || snapshot.verification.state !== "OPEN" || snapshot.verification.draft !== true || snapshot.verification.number !== 10) fail("PR10", "excepción retrospectiva carece de evidencia verificable");
  const evidenceFiles = snapshot?.verification?.changed_files ?? [];
  const fullCommits = snapshot?.verification?.commit_shas ?? [];
  for (const item of items.filter(i => i.id.startsWith("INVENTORY-SVC-BACK-") && i.id !== "INVENTORY-SVC-BACK-08")) {
    const evidence = item.implementation_evidence;
    if (evidence?.pull_request !== 10 || evidence?.retrospective_credit !== snapshot.policy_id || evidence?.state_at_cutoff !== "OPEN/DRAFT" || evidence?.head_sha !== snapshot.verification.head_sha) { fail("PR10", `${item.id} no identifica el crédito retrospectivo y el corte del PR`); continue; }
    for (const sha of evidence.commits ?? []) if (!fullCommits.some(full => full.startsWith(sha))) fail("PR10", `${item.id} commit no está en el snapshot: ${sha}`);
    for (const pathRef of [...(evidence.files ?? []), ...(evidence.tests ?? []).map(test => test.split(":")[0].trim()).filter(test => test.startsWith("apps/inventory-svc/"))]) {
      const prefix = pathRef.replace(/\*.*$/, "");
      if (!evidenceFiles.some(file => file === pathRef || file.startsWith(prefix))) fail("PR10", `${item.id} referencia archivo fuera del diff: ${pathRef}`);
    }
  }
  const secretScan = manifest.review_metadata?.secret_scan;
  if (secretScan?.status !== "PASS" || secretScan.findings !== 0) fail("SECURITY", "escaneo de secretos incompleto");

  return { errors, metrics: { records: count, unique_ids: byId.size, statuses: statusCounts, services, owners, dependency_edges: [...edgesById.values()].reduce((n, es) => n + es.length, 0), dependency_cycles: errors.some(e => e.startsWith("CYCLE:")) ? "present" : 0, mk_covered: mkCovered.size, openapi_operations: operationMap.size, asyncapi_messages: messageNames.size, bff_events: asyncapi?.bff_consumed_events?.length ?? 0, owner_pending: pendingOwners.length, publishable: items.filter(i => i.publishable).length } };
}
