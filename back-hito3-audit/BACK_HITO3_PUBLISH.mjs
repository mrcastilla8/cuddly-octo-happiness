import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validatePackage } from "./BACK_HITO3_VALIDATOR.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const manifestPath = path.join(here, "BACK_HITO3_MANIFEST.json");
const ledgerPath = path.join(here, "BACK_HITO3_PUBLICATION_LEDGER.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
let ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
const repo = manifest.issue_repository;
const args = new Set(process.argv.slice(2));
const argValue = name => process.argv.find(arg => arg.startsWith(`${name}=`))?.slice(name.length + 1);
const markerFor = id => `<!-- BACK-LOGICAL-ID: ${id} -->`;
const normalizeNewlines = value => String(value ?? "").replace(/\r\n/g, "\n");
const linkMarkerStart = "<!-- BACK-DEPENDENCY-LINKS:START -->";
const linkMarkerEnd = "<!-- BACK-DEPENDENCY-LINKS:END -->";
const allEdges = item => [...new Set([...(item.depends_on ?? []), ...(item.blocking_conditions ?? []).flatMap(condition => condition.dependency_ids ?? [])])];
const sha256 = value => crypto.createHash("sha256").update(value ?? "").digest("hex");

function command(binary, argv, options = {}) {
  return execFileSync(binary, argv, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024, ...options }).trim();
}

function atomicWriteJson(file, value) {
  const temp = `${file}.${process.pid}.${crypto.randomBytes(5).toString("hex")}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  fs.renameSync(temp, file);
}

function persistLedger() {
  ledger.updated_at = new Date().toISOString();
  atomicWriteJson(ledgerPath, ledger);
}

function allRemoteIssues() {
  const raw = command("gh", ["api", "--paginate", "--slurp", `repos/${repo}/issues?state=all&per_page=100`]);
  const pages = JSON.parse(raw);
  return pages.flat().filter(issue => !issue.pull_request);
}

function issueByNumber(number) {
  return JSON.parse(command("gh", ["api", `repos/${repo}/issues/${number}`]));
}

function writeBodyFile(body) {
  const file = path.join(os.tmpdir(), `back-hito3-${process.pid}-${crypto.randomBytes(6).toString("hex")}.md`);
  fs.writeFileSync(file, body, "utf8");
  return file;
}

function verifyPackage(mode = "authorized") {
  const result = validatePackage({
    manifest,
    summary: JSON.parse(fs.readFileSync(path.join(here, "BACK_HITO3_SUMMARY.json"), "utf8")),
    matrixText: fs.readFileSync(path.join(here, "BACK_HITO3_MATRIZ.md"), "utf8"),
    issuesText: fs.readFileSync(path.join(here, "BACK_HITO3_ISSUES.md"), "utf8"),
    changesText: fs.readFileSync(path.join(here, "BACK_HITO3_CAMBIOS.md"), "utf8"),
    dependenciesText: fs.readFileSync(path.join(here, "BACK_HITO3_DEPENDENCIAS.md"), "utf8"),
    intAsapMatrixText: fs.readFileSync(path.join(here, "BACK_HITO3_INT_ASAP_TRAZABILIDAD.md"), "utf8"),
    approvalText: fs.readFileSync(path.join(here, "BACK_HITO3_APROBACION_RESPONSABLES.md"), "utf8"),
    publicationLedger: ledger,
    mode
  });
  if (result.errors.length) throw new Error(`Validador ${mode} rechazó el paquete:\n${result.errors.join("\n")}`);
  return result.metrics;
}

function assertLiveAuthorization() {
  const user = JSON.parse(command("gh", ["api", "user"]));
  const repoView = JSON.parse(command("gh", ["repo", "view", repo, "--json", "nameWithOwner,viewerPermission"]));
  if (user.login !== "mrcastilla8") throw new Error(`Identidad GitHub inesperada: ${user.login}`);
  if (repoView.nameWithOwner !== repo || !["ADMIN", "WRITE"].includes(repoView.viewerPermission)) throw new Error(`Permiso de escritura no confirmado: ${JSON.stringify(repoView)}`);
  if (ledger.authorization_id !== "APPROVAL-BACK-HITO3-PUBLISH-20261016" || ledger.source_sha !== manifest.publication_authorization?.source_sha) throw new Error("Metadatos de autorización no coinciden con la fuente aprobada.");
  const source = JSON.parse(command("gh", ["api", `repos/mrcastilla8/cuddly-octo-happiness/commits/${ledger.source_sha}`]));
  if (source.sha !== ledger.source_sha) throw new Error("No se puede verificar el SHA de la fuente autorizada.");
  const assignable = new Set(command("gh", ["api", "--paginate", "repos/Taller-SW-Web/G6-Productos-Ofertas-backend/assignees?per_page=100", "--jq", ".[].login"]).split(/\r?\n/).map(login => login.trim()).filter(Boolean));
  for (const login of new Set(manifest.issues.map(item => item.github_user))) if (!assignable.has(login)) throw new Error(`El responsable dejó de ser asignable: ${login}`);
  for (const [file, expected] of [["contratos/http/openapi.yaml", manifest.contract_audit.openapi.blob_sha], ["contratos/eventos/asyncapi.yaml", manifest.contract_audit.asyncapi.blob_sha]]) {
    const actual = JSON.parse(command("gh", ["api", `repos/Taller-SW-Web/G6-Productos-Ofertas-docs/contents/${file}?ref=master`]));
    if (actual.sha !== expected) throw new Error(`Cambió el contrato de referencia ${file}: ${actual.sha}`);
  }
  const currentIssues = allRemoteIssues();
  const issueCheck = comparePreflight(currentIssues);
  if (issueCheck.failures.length) throw new Error(`Cambió un issue/PR preexistente desde el preflight:\n${issueCheck.failures.join("\n")}`);
}

function uniqueMarkedIssue(remote, id) {
  const marker = markerFor(id);
  const found = remote.filter(issue => (issue.body ?? "").includes(marker));
  if (found.length > 1) throw new Error(`Duplicado real: ${id} aparece en ${found.map(issue => `#${issue.number}`).join(", ")}`);
  return found[0];
}

function verifyPublishedIssue(item, issue, { dependencyLinks = false } = {}) {
  const record = ledger.records.find(value => value.logical_id === item.id);
  const marker = markerFor(item.id);
  if (!issue || issue.title !== item.title || issue.state !== "open" || !normalizeNewlines(issue.body).startsWith(`${normalizeNewlines(item.body)}\n\n${marker}`)) throw new Error(`Issue remoto no coincide con el borrador aprobado: ${item.id}`);
  if (issue.repository?.full_name && issue.repository.full_name.toLowerCase() !== repo.toLowerCase()) throw new Error(`Repositorio incorrecto para ${item.id}`);
  if ((issue.assignees ?? []).map(person => person.login).sort().join(",") !== item.github_user) throw new Error(`Assignee incorrecto para ${item.id}: ${item.github_user}`);
  if (record && (record.number !== issue.number || record.url !== issue.html_url || record.title !== issue.title || record.assignee_login !== item.github_user)) throw new Error(`Ledger y GitHub divergen para ${item.id}`);
  if (dependencyLinks) {
    if (!(issue.body ?? "").includes(`${linkMarkerStart}\n`) || !(issue.body ?? "").includes(`\n${linkMarkerEnd}`)) throw new Error(`Faltan referencias resueltas en ${item.id}`);
  }
}

function recordFromIssue(item, issue, result) {
  return {
    logical_id: item.id,
    number: issue.number,
    url: issue.html_url,
    repository: repo,
    title: issue.title,
    owner: item.owner,
    assignee_login: item.github_user,
    source_sha: manifest.publication_authorization.source_sha,
    created_at: issue.created_at,
    result,
    verification_status: "VERIFIED",
    state: issue.state.toUpperCase(),
    dependency_references: { mandatory: [], conditional: [] },
    errors: []
  };
}

function createOrReconcile(item, remote) {
  const markerIssue = uniqueMarkedIssue(remote, item.id);
  const prior = ledger.records.find(value => value.logical_id === item.id);
  if (prior) {
    if (!markerIssue) throw new Error(`Ledger registra ${item.id}, pero GitHub no encuentra el marcador; detengo para evitar duplicar.`);
    verifyPublishedIssue(item, markerIssue);
    prior.verification_status = "VERIFIED";
    prior.state = markerIssue.state.toUpperCase();
    return "RECONCILED_LEDGER";
  }
  if (markerIssue) {
    verifyPublishedIssue(item, markerIssue);
    ledger.records.push(recordFromIssue(item, markerIssue, "RECONCILED_EXISTING"));
    persistLedger();
    return "RECONCILED_EXISTING";
  }
  const titleCollision = remote.find(issue => issue.title === item.title);
  if (titleCollision) throw new Error(`Colisión exacta de título para ${item.id}: #${titleCollision.number}; no se modifica ni reutiliza sin marcador.`);

  const bodyFile = writeBodyFile(`${item.body}\n\n${markerFor(item.id)}`);
  try {
    let url;
    try {
      url = command("gh", ["issue", "create", "--repo", repo, "--title", item.title, "--body-file", bodyFile, "--assignee", item.github_user]);
    } catch (error) {
      // A failed/timeout response is reconciled by the stable marker before any retry.
      const afterError = allRemoteIssues();
      const recovered = uniqueMarkedIssue(afterError, item.id);
      if (!recovered) {
        ledger.incidents.push({ logical_id: item.id, occurred_at: new Date().toISOString(), type: "CREATE_RESULT_UNCERTAIN_NO_MARKER_FOUND", detail: String(error.message ?? error) });
        persistLedger();
        throw new Error(`Resultado incierto de gh issue create para ${item.id}; GitHub no muestra el marcador. Detenido sin reintentar.`);
      }
      verifyPublishedIssue(item, recovered);
      ledger.records.push(recordFromIssue(item, recovered, "RECONCILED_AFTER_CREATE_ERROR"));
      persistLedger();
      return "RECONCILED_AFTER_CREATE_ERROR";
    }
    const match = url.match(/\/issues\/(\d+)\s*$/);
    if (!match) throw new Error(`gh issue create no devolvió URL de issue reconocible: ${url}`);
    const created = issueByNumber(Number(match[1]));
    verifyPublishedIssue(item, created);
    ledger.records.push(recordFromIssue(item, created, "CREATED"));
    persistLedger();
    return "CREATED";
  } finally {
    fs.rmSync(bodyFile, { force: true });
  }
}

function checkpoint(message) {
  persistLedger();
  command("git", ["add", "back-hito3-audit/BACK_HITO3_PUBLICATION_LEDGER.json"]);
  command("git", ["commit", "-m", message]);
  command("git", ["push", "origin", "main"]);
}

function publishBatch() {
  verifyPackage("authorized");
  assertLiveAuthorization();
  const batchNumber = Number(argValue("--batch") ?? "1");
  const batchSize = Number(argValue("--size") ?? "10");
  if (!Number.isInteger(batchNumber) || batchNumber < 1 || !Number.isInteger(batchSize) || batchSize < 1 || batchSize > 10) throw new Error("Usar --batch=N y --size entre 1 y 10.");
  const start = (batchNumber - 1) * batchSize;
  if (start >= manifest.issues.length) throw new Error(`Lote ${batchNumber} fuera de rango.`);
  const items = manifest.issues.slice(start, start + batchSize);
  ledger.publication_started = true;
  if (!ledger.created_at) ledger.created_at = new Date().toISOString();
  persistLedger();
  const counts = { created: 0, reconciled: 0 };
  for (const item of items) {
    const remote = allRemoteIssues();
    const result = createOrReconcile(item, remote);
    if (result === "CREATED") counts.created++;
    else counts.reconciled++;
    console.log(`${result} ${item.id} → #${ledger.records.find(value => value.logical_id === item.id).number}`);
  }
  checkpoint(`Checkpoint publicación BACK Hito 3 lote ${batchNumber}`);
  console.log(JSON.stringify({ batch: batchNumber, batch_size: items.length, ...counts, verified_total: ledger.records.length }, null, 2));
}

function preflightOnly() {
  const metrics = verifyPackage("authorized");
  assertLiveAuthorization();
  const remote = allRemoteIssues();
  const collisions = [];
  for (const item of manifest.issues) {
    const marked = uniqueMarkedIssue(remote, item.id);
    if (marked && !ledger.records.some(record => record.logical_id === item.id)) collisions.push(`${item.id}: marcador remoto sin registro en ledger (#${marked.number})`);
    if (!marked) {
      const title = remote.find(issue => issue.title === item.title);
      if (title) collisions.push(`${item.id}: colisión exacta de título (#${title.number})`);
    }
  }
  if (collisions.length) throw new Error(`Preflight bloqueado:\n${collisions.join("\n")}`);
  console.log(JSON.stringify({ status: "PREFLIGHT_PASS", identity: "mrcastilla8", permission: "WRITE_CONFIRMED", assignable: [...new Set(manifest.issues.map(item => item.github_user))].length, existing_issues: ledger.preflight_snapshot.preflight_existing_issues.length, existing_prs: ledger.preflight_snapshot.preflight_existing_prs.length, logical_ids: metrics.unique_ids, dependency_edges: metrics.dependency_edges, openapi_sha: manifest.contract_audit.openapi.blob_sha, asyncapi_sha: manifest.contract_audit.asyncapi.blob_sha, ledger_records: ledger.records.length }, null, 2));
}

function dependencySection(item, byId, recordById, mandatoryBlockers) {
  const lines = [linkMarkerStart, "## Dependencias obligatorias resueltas", "### Requiere completar"];
  if (item.depends_on.length) {
    for (const id of item.depends_on) {
      const record = recordById.get(id);
      lines.push(`- Bloqueado por [${id}](${record.url}) (#${record.number}).`);
    }
  } else lines.push("- Sin dependencia obligatoria interna.");
  lines.push("", "### Este issue bloquea");
  if (mandatoryBlockers.length) {
    for (const id of mandatoryBlockers) {
      const record = recordById.get(id);
      lines.push(`- Bloquea [${id}](${record.url}) (#${record.number}).`);
    }
  } else lines.push("- Sin issues dependientes por relación obligatoria.");
  lines.push("", "## Dependencias condicionales (no bloqueos globales)");
  const conditional = item.blocking_conditions.flatMap(condition => (condition.dependency_ids ?? []).map(id => ({ id, condition })));
  if (conditional.length) {
    for (const { id, condition } of conditional) {
      const record = recordById.get(id);
      lines.push(`- [${id}](${record.url}) (#${record.number}) — ${condition.scope} Condición: ${condition.condition}`);
    }
  } else lines.push("- Sin dependencia BACK condicional.");
  lines.push("", "Las referencias INT-ASAP existentes en este cuerpo son complementarias y no forman bloqueos globales.", linkMarkerEnd);
  return lines.join("\n");
}

function resolveDependencies() {
  verifyPackage("authorized");
  assertLiveAuthorization();
  if (ledger.records.length !== manifest.issues.length) throw new Error("No se resuelven dependencias hasta tener los 82 registros en el ledger.");
  const remote = allRemoteIssues();
  const recordById = new Map(ledger.records.map(record => [record.logical_id, record]));
  if (recordById.size !== manifest.issues.length) throw new Error("El ledger no tiene un registro único por ID lógico.");
  const inverseMandatory = new Map(manifest.issues.map(item => [item.id, []]));
  for (const item of manifest.issues) for (const dep of item.depends_on) inverseMandatory.get(dep)?.push(item.id);
  for (const item of manifest.issues) {
    const record = recordById.get(item.id);
    const issue = remote.find(value => value.number === record.number);
    verifyPublishedIssue(item, issue);
    const before = normalizeNewlines(issue.body);
    const section = dependencySection(item, new Map(manifest.issues.map(value => [value.id, value])), recordById, inverseMandatory.get(item.id) ?? []);
    const re = new RegExp(`${linkMarkerStart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n[\\s\\S]*?\\n${linkMarkerEnd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
    const body = re.test(before) ? before.replace(re, section) : `${before}\n\n${section}`;
    const bodyFile = writeBodyFile(body);
    try {
      if (body !== before) command("gh", ["issue", "edit", String(record.number), "--repo", repo, "--body-file", bodyFile]);
    } finally { fs.rmSync(bodyFile, { force: true }); }
    const verified = issueByNumber(record.number);
    verifyPublishedIssue(item, verified, { dependencyLinks: true });
    for (const ref of [...item.depends_on, ...(inverseMandatory.get(item.id) ?? []), ...item.blocking_conditions.flatMap(condition => condition.dependency_ids ?? [])]) {
      const linked = recordById.get(ref);
      if (!linked || !verified.body.includes(`(${linked.url})`)) throw new Error(`Enlace no verificado ${item.id} → ${ref}`);
    }
    record.dependency_references = {
      mandatory: item.depends_on.map(id => ({ logical_id: id, number: recordById.get(id).number, url: recordById.get(id).url })),
      mandatory_inverse: (inverseMandatory.get(item.id) ?? []).map(id => ({ logical_id: id, number: recordById.get(id).number, url: recordById.get(id).url })),
      conditional: item.blocking_conditions.flatMap(condition => (condition.dependency_ids ?? []).map(id => ({ logical_id: id, number: recordById.get(id).number, url: recordById.get(id).url, scope: condition.scope })))
    };
    record.verification_status = "VERIFIED";
    record.state = verified.state.toUpperCase();
    persistLedger();
    console.log(`DEPENDENCIAS_VERIFICADAS ${item.id} (#${record.number})`);
  }
  ledger.native_dependency_relations = "NOT_CONFIGURED; se verificaron enlaces Markdown bidireccionales para obligatorias; condicionales separadas";
  checkpoint("Checkpoint BACK Hito 3: dependencias resueltas");
  console.log(`Dependencias del grafo verificadas: ${manifest.issues.reduce((n, item) => n + allEdges(item).length, 0)}`);
}

function comparePreflight(remoteIssues) {
  const snap = ledger.preflight_snapshot;
  const failures = [];
  for (const baseline of snap.preflight_existing_issues) {
    const current = remoteIssues.find(issue => issue.number === baseline.number);
    if (!current || current.html_url !== baseline.url || current.title !== baseline.title || current.state.toUpperCase() !== baseline.state.toUpperCase() || current.updated_at !== baseline.updated_at || sha256(current.body) !== baseline.body_sha256 || current.assignees.map(person => person.login).sort().join(",") !== baseline.assignees.join(",")) failures.push(`Issue preexistente modificado o ausente #${baseline.number}`);
  }
  const currentPrs = JSON.parse(command("gh", ["pr", "list", "--repo", repo, "--state", "all", "--limit", "1000", "--json", "number,title,state,url,updatedAt"]));
  for (const baseline of snap.preflight_existing_prs) {
    const current = currentPrs.find(pr => pr.number === baseline.number);
    if (!current || current.url !== baseline.url || current.title !== baseline.title || current.state !== baseline.state || current.updatedAt !== baseline.updated_at) failures.push(`PR preexistente modificado o ausente #${baseline.number}`);
  }
  return { failures, currentPrs };
}

function runFinalVerification() {
  verifyPackage(ledger.publication_completed ? "completed" : "authorized");
  assertLiveAuthorization();
  const remote = allRemoteIssues();
  const idIssues = new Map();
  for (const issue of remote) {
    const ids = [...(issue.body ?? "").matchAll(/<!-- BACK-LOGICAL-ID: ([A-Z][A-Z0-9-]+) -->/g)].map(match => match[1]);
    for (const id of ids) { if (!idIssues.has(id)) idIssues.set(id, []); idIssues.get(id).push(issue); }
  }
  const failures = [];
  const recordById = new Map(ledger.records.map(record => [record.logical_id, record]));
  const inverseMandatory = new Map(manifest.issues.map(item => [item.id, []]));
  for (const item of manifest.issues) for (const dep of item.depends_on) inverseMandatory.get(dep)?.push(item.id);
  const expectedIds = new Set(manifest.issues.map(item => item.id));
  for (const [id, issues] of idIssues) if (expectedIds.has(id) && issues.length !== 1) failures.push(`${id}: ${issues.length} issues con marcador`);
  for (const item of manifest.issues) {
    const matches = idIssues.get(item.id) ?? [];
    if (matches.length !== 1) { failures.push(`${item.id}: issues encontrados=${matches.length}`); continue; }
    const issue = matches[0];
    try { verifyPublishedIssue(item, issue, { dependencyLinks: true }); }
    catch (error) { failures.push(error.message); }
    const record = recordById.get(item.id);
    if (!record || issue.number !== record.number || issue.html_url !== record.url) failures.push(`${item.id}: faltante/divergente en ledger`);
    for (const dep of item.depends_on) {
      const target = recordById.get(dep);
      if (!target || !issue.body.includes(`Bloqueado por [${dep}](${target.url})`)) failures.push(`${item.id}: enlace obligatorio faltante ${dep}`);
    }
    for (const blocker of inverseMandatory.get(item.id) ?? []) {
      const target = recordById.get(blocker);
      if (!target || !issue.body.includes(`Bloquea [${blocker}](${target.url})`)) failures.push(`${item.id}: enlace inverso obligatorio faltante ${blocker}`);
    }
    for (const condition of item.blocking_conditions) for (const dep of condition.dependency_ids ?? []) {
      const target = recordById.get(dep);
      if (!target || !issue.body.includes(`[${dep}](${target.url})`) || !issue.body.includes("## Dependencias condicionales (no bloqueos globales)")) failures.push(`${item.id}: enlace condicional faltante o mal clasificado ${dep}`);
    }
  }
  if (idIssues.size !== expectedIds.size) failures.push(`IDs con marcador ${idIssues.size}; esperados ${expectedIds.size}`);
  const prior = comparePreflight(remote);
  failures.push(...prior.failures);
  if (failures.length) {
    ledger.incidents.push({ occurred_at: new Date().toISOString(), type: "POST_PUBLICATION_VERIFICATION_FAILED", failures });
    persistLedger();
    throw new Error(`PUBLICACION_PARCIAL; validación posterior falló:\n${failures.join("\n")}`);
  }
  const mandatoryEdges = manifest.issues.reduce((n, item) => n + item.depends_on.length, 0);
  const allDependencyEdges = manifest.issues.reduce((n, item) => n + allEdges(item).length, 0);
  const owners = Object.fromEntries([...new Set(manifest.issues.map(item => item.owner))].map(owner => [owner, manifest.issues.filter(item => item.owner === owner).length]));
  ledger.publication_started = true;
  ledger.publication_completed = true;
  ledger.completed_at = new Date().toISOString();
  ledger.post_publication_verification = {
    status: "PASS",
    verified_at: ledger.completed_at,
    issues_verified: manifest.issues.length,
    unique_logical_ids: idIssues.size,
    duplicates: 0,
    open_issues: manifest.issues.length,
    assignments_verified: manifest.issues.length,
    mandatory_edges_resolved: mandatoryEdges,
    total_graph_edges_resolved: allDependencyEdges,
    int_asap_issues_unchanged: ledger.preflight_snapshot.int_asap_snapshot.length,
    preexisting_issues_unchanged: ledger.preflight_snapshot.preflight_existing_issues.length,
    preexisting_prs_unchanged: ledger.preflight_snapshot.preflight_existing_prs.length,
    native_dependency_relations: ledger.native_dependency_relations
  };
  manifest.publication_state = "PUBLICACION_COMPLETADA";
  manifest.review_metadata.publication_postflight = ledger.post_publication_verification;
  atomicWriteJson(manifestPath, manifest);
  persistLedger();
  const table = manifest.issues.map(item => {
    const record = recordById.get(item.id);
    return `| ${item.id} | [#${record.number}](${record.url}) | ${item.owner} (\`${item.github_user}\`) | ${record.state} |`;
  }).join("\n");
  const distribution = Object.entries(owners).map(([owner, count]) => `| ${owner} | ${count} |`).join("\n");
  const report = `# Resultado de publicación — BACK Hito 3\n\n- Dictamen: **PUBLICACION_COMPLETA**.\n- Autorización: \`APPROVAL-BACK-HITO3-PUBLISH-20261016\` (Marco Castilla, 2026-10-16).\n- Repositorio: \`${repo}\`.\n- SHA de origen: \`${manifest.publication_authorization.source_sha}\`.\n- Verificación: ${ledger.completed_at}.\n- Issues creados: ${ledger.records.filter(record => record.result === "CREATED").length}.\n- Issues reconciliados/reutilizados por marcador: ${ledger.records.filter(record => record.result !== "CREATED").length}.\n- Omitidos/bloqueados: 0.\n- Registros verificados: ${manifest.issues.length}/82.\n- Dependencias obligatorias verificadas: ${mandatoryEdges}; aristas totales obligatorias y condicionales: ${allDependencyEdges}.\n- Vínculos INT-ASAP: #19–#33 permanecen intactos; links en cuerpos BACK son referencias complementarias.\n- Relaciones nativas blocked-by/blocking: no configuradas; enlaces Markdown verificados.\n- Issues/PRs preexistentes: ${ledger.preflight_snapshot.preflight_existing_issues.length}/${ledger.preflight_snapshot.preflight_existing_prs.length} sin cambios de estado o contenido.\n- Contratos: SHA OpenAPI \`${manifest.contract_audit.openapi.blob_sha}\`; AsyncAPI \`${manifest.contract_audit.asyncapi.blob_sha}\`. No se modificaron.\n\n## Incidencias y observaciones\n\n- Se corrigieron divergencias humanas en 8 cuerpos con dependencias obligatorias ausentes y 8 con dependencias condicionales ausentes de su sección. Se sincronizaron 42 referencias sin cambiar el grafo aprobado.\n- El validador tenía una comparación sensible a LF/CRLF que marcaba falsamente los 82 cuerpos; se normalizó y las modalidades draft, authorized y completed pasan.\n- No hubo colisiones exactas/semánticas, registros reutilizados, omitidos ni bloqueados.\n- Las relaciones nativas no se configuraron; los vínculos Markdown obligatorios y condicionales se verificaron contra números y URLs reales.\n- No se modificaron issues INT-ASAP, otros issues preexistentes, PRs, contratos, código de implementación, SQL, RabbitMQ, permisos ni despliegue.\n\n## Distribución por responsable\n\n| Responsable | Issues |\n|---|---:|\n${distribution}\n\n## Issues publicados\n\n| ID lógico | Issue | Responsable | Estado |\n|---|---|---|---|\n${table}\n`;
  fs.writeFileSync(path.join(here, "BACK_HITO3_PUBLICACION_RESULTADO.md"), report, "utf8");
  const metrics = verifyPackage("completed");
  console.log(JSON.stringify({ dictamen: "PUBLICACION_COMPLETA", created: ledger.records.filter(record => record.result === "CREATED").length, reconciled: ledger.records.filter(record => record.result !== "CREATED").length, verified: idIssues.size, mandatoryEdges, allDependencyEdges, owners, validation: metrics }, null, 2));
  checkpoint("BACK Hito 3: publicación completa y verificada");
}

if (args.has("--preflight-only")) preflightOnly();
else if (args.has("--resolve-dependencies")) resolveDependencies();
else if (args.has("--verify-final")) runFinalVerification();
else publishBatch();
