import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { delimiter, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// La CLI administra las credenciales. Nunca se leen ni imprimen tokens.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repo = "Taller-SW-Web/G6-Productos-Ofertas-frontend";
const projectName = "g6-productos-ofertas";
const argv = process.argv.slice(2);
const apply = argv.includes("--apply");
const teamIndex = argv.indexOf("--team");
const teamArg = teamIndex < 0 ? undefined : argv[teamIndex + 1];
const shaIndex = argv.indexOf("--verify-sha");
const sha = shaIndex < 0 ? undefined : argv[shaIndex + 1];
const allowed = argv.filter((_, i) => ![teamIndex, shaIndex].some((index) => index >= 0 && [index, index + 1].includes(i)));
assert(allowed.every((arg) => ["--apply", "--inspect"].includes(arg)), "Uso: --inspect | --apply [--team slug] [--verify-sha SHA]");
assert(shaIndex < 0 || /^[a-f0-9]{40}$/.test(sha ?? ""), "--verify-sha requiere SHA completo");
assert(!sha || !apply, "La verificación posterior al merge es de solo lectura: --inspect --verify-sha SHA");
assert(!(apply && argv.includes("--inspect")), "Elige --inspect o --apply");
assert(teamIndex < 0 || /^[\w-]+$/.test(teamArg ?? ""), "Falta --team válido");

function command(bin, args, input) {
  const result = spawnSync(bin, args, {
    cwd: root, input, encoding: "utf8", timeout: 120_000,
    windowsHide: true, maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    // No reenviar stdout/stderr: respuestas API pueden contener secretos ajenos.
    throw new Error(`Falló ${bin === process.execPath ? "Vercel CLI" : bin} ${args.slice(0, bin === process.execPath ? 3 : 1).join(" ")}. Comprueba sesión/permisos; usa vercel login o revisa GitHub App en https://github.com/apps/vercel/installations/new`);
  }
  return result.stdout.trim();
}

async function main() {
  const major = Number(process.versions.node.split(".")[0]);
  assert(major === 22 && Number(process.versions.node.split(".")[1]) >= 12, "Usa Node 22 >=22.12 (ver .nvmrc)");
  assert.equal(command("git", ["rev-parse", "--show-toplevel"]).replaceAll("\\", "/").toLowerCase(), root.replaceAll("\\", "/").toLowerCase());
  const origin = command("git", ["remote", "get-url", "origin"]);
  assert([`https://github.com/${repo}.git`, `https://github.com/${repo}`, `git@github.com:${repo}.git`].includes(origin), "El remoto origin no es el repositorio oficial");
  const config = JSON.parse(readFileSync(resolve(root, "vercel.json"), "utf8"));
  assert.deepEqual(config.git.deploymentEnabled, { "**": false, master: true });
  assert.equal(config.framework, "vite");
  assert.equal(config.installCommand, "npm ci");
  assert.equal(config.buildCommand, "npm run build");
  assert.equal(config.outputDirectory, "dist");
  assert.deepEqual(config.rewrites, [{ source: "/(.*)", destination: "/index.html" }]);

  const cli = process.env.VERCEL_CLI_PATH ?? (process.env.PATH ?? "").split(delimiter)
    .flatMap((dir) => [resolve(dir, "../vercel/dist/index.js"), resolve(dir, "node_modules/vercel/dist/index.js")])
    .find(existsSync);
  assert(cli && existsSync(cli), "CLI ausente. Ejecuta: npm exec --yes --package=vercel@64.3.1 -- node scripts/vercel-bootstrap.mjs --inspect");
  function vc(args, input) { return command(process.execPath, [cli, ...args], input); }
  function api(path, { method = "GET", body, team } = {}) {
    const endpoint = team ? `${path}${path.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(team.id)}` : path;
    const args = ["api", endpoint, "--method", method];
    if (body) args.push("--input", "-");
    return JSON.parse(vc(args, body ? JSON.stringify(body) : undefined));
  }
  function list(path, key, team) {
    const items = [];
    let cursor;
    do {
      const page = api(`${path}${path.includes("?") ? "&" : "?"}limit=100${cursor ? `&until=${cursor}` : ""}`, { team });
      items.push(...page[key]);
      cursor = page.pagination?.next;
    } while (cursor);
    return items;
  }
  const user = api("/v2/user").user;
  const teams = list("/v2/teams", "teams");
  assert(teams.length, "No hay equipos accesibles en Vercel");
  const projects = teams.flatMap((team) => list("/v10/projects", "projects", team).map((p) => ({ ...p, team })));
  const linked = projects.filter((p) => p.link?.type === "github" && `${p.link.org}/${p.link.repo}`.toLowerCase() === repo.toLowerCase());
  assert(linked.length <= 1, "Hay varios proyectos asociados al repositorio: resolver ownership antes de continuar");
  let project = linked[0];
  const named = projects.filter((p) => p.name === projectName);
  assert(named.length <= 1, "Nombre de proyecto ambiguo entre equipos");
  project ??= named[0];
  if (project?.link) assert.equal(`${project.link.org}/${project.link.repo}`.toLowerCase(), repo.toLowerCase(), "El nombre pertenece a otro repositorio");
  const team = teamArg ? teams.find((t) => [t.id, t.slug].includes(teamArg)) : project?.team ?? (teams.length === 1 ? teams[0] : undefined);
  assert(team, `Selecciona --team: ${teams.map((t) => t.slug).join(", ")}`);
  assert(!project || project.team.id === team.id, "Existe proyecto en otro equipo; no se duplicará");
  const localLink = resolve(root, ".vercel/project.json");
  if (existsSync(localLink)) {
    const local = JSON.parse(readFileSync(localLink, "utf8"));
    assert(local.projectId === project?.id && local.orgId === team.id, "Vinculación local ajena; resolver antes de aplicar");
  }
  console.log(JSON.stringify({ mode: apply ? "apply" : "inspect", user: user.username, team: team.slug, project: project?.name ?? null, projectId: project?.id ?? null }));
  const expected = { framework: "vite", rootDirectory: null, nodeVersion: "22.x", installCommand: "npm ci", buildCommand: "npm run build", outputDirectory: "dist", previewDeploymentsDisabled: true };
  if (!project) {
    console.log("PLAN crear g6-productos-ofertas; no se encontró proyecto existente en equipos accesibles");
    if (!apply) { process.exitCode = 2; return; }
    // nodeVersion se configura por PATCH: el endpoint de creación no lo acepta.
    const creation = { name: projectName, ...expected };
    delete creation.nodeVersion;
    project = api("/v11/projects", { method: "POST", team, body: creation });
  }
  const path = `/v9/projects/${project.id}`;
  project = api(path, { team });
  const changes = Object.fromEntries(Object.entries(expected).filter(([k, v]) => project[k] !== v));
  console.log(`Configuración pendiente: ${Object.keys(changes).join(", ") || "ninguna"}`);
  if (apply && Object.keys(changes).length) project = api(path, { method: "PATCH", team, body: changes });
  const envs = api(`/v10/projects/${project.id}/env`, { team }).envs;
  const production = envs.filter((e) => e.key === "VITE_DATA_MODE" && e.target?.includes("production"));
  assert(production.length <= 1, "Variable Production duplicada; requiere revisión");
  const variable = production[0];
  const value = variable ? api(`/v1/projects/${project.id}/env/${variable.id}`, { team }).value : undefined;
  const envOk = value === "mock";
  console.log(`VITE_DATA_MODE Production: ${envOk ? "correcta" : variable ? "requiere actualización" : "ausente"}`);
  if (apply && !envOk) {
    // Evitar cambiar Preview/Development si comparten el mismo registro.
    assert(!variable || (variable.target.length === 1 && !variable.customEnvironmentIds?.length), "Variable compartida con otros ámbitos; separar manualmente para preservar sus valores");
    const body = { key: "VITE_DATA_MODE", value: "mock", type: "plain", target: ["production"] };
    api(variable ? `/v9/projects/${project.id}/env/${variable.id}` : `/v10/projects/${project.id}/env`, { method: variable ? "PATCH" : "POST", team, body });
  }
  if (!project.link && apply) {
    // --project evita vincular/escribir .vercel y nunca invoca deploy.
    try {
      vc(["git", "connect", `https://github.com/${repo}.git`, "--project", project.id, "--scope", team.slug, "--yes"]);
    } catch {
      console.log("BLOCKED GitHub: autorizar https://github.com/apps/vercel/installations/new para el repositorio oficial y vincular GitHub en https://vercel.com/account/settings/authentication; volver a ejecutar --apply");
    }
  }
  project = api(path, { team });
  const connected = project.link?.type === "github" && `${project.link.org}/${project.link.repo}`.toLowerCase() === repo.toLowerCase();
  const settingsOk = Object.entries(expected).every(([k, v]) => project[k] === v);
  const finalEnvs = api(`/v10/projects/${project.id}/env`, { team }).envs;
  const finalEnv = finalEnvs.find((e) => e.key === "VITE_DATA_MODE" && e.target?.includes("production"));
  const finalValue = finalEnv && api(`/v1/projects/${project.id}/env/${finalEnv.id}`, { team }).value;
  const branch = project.link?.productionBranch;
  console.log(JSON.stringify({ project: project.name, projectId: project.id, team: team.slug, githubConnected: connected, productionBranch: branch ?? null, settingsOk, mockProduction: finalValue === "mock" }));
  if (branch && branch !== "master") console.log(`BLOCKED: configurar Production Branch master en https://vercel.com/${team.slug}/${project.name}/settings/environments (no hay escritura de rama documentada en la API usada)`);
  if (!(connected && settingsOk && finalValue === "mock" && branch === "master")) process.exitCode = 2;
  if (sha) {
    const current = project.targets?.production;
    assert(current?.id, "Todavía no existe deployment asignado a Production");
    const deployment = api(`/v13/deployments/${current.id}?withGitRepoInfo=true`, { team });
    const publishedSha = deployment.meta?.githubCommitSha ?? deployment.gitSource?.sha;
    const publishedBranch = deployment.meta?.githubCommitRef ?? deployment.gitSource?.ref;
    console.log(JSON.stringify({ deploymentId: deployment.id, sha: publishedSha, branch: publishedBranch, state: deployment.readyState, source: deployment.source, url: deployment.url, aliases: deployment.alias }));
    assert.equal(publishedSha, sha, "El SHA servido en Production no es el esperado");
    assert.equal(publishedBranch, "master", "La rama publicada no es master");
    assert.equal(deployment.readyState, "READY");
    assert.equal(deployment.target, "production");
    // OpenAPI define source como heurística de métricas, no evidencia autoritativa.
    assert(deployment.alias?.length, "Falta alias de producción");
    // Verificar tanto el deployment inmutable como el alias realmente servido.
    for (const host of new Set([deployment.url, ...deployment.alias])) {
      console.log(command(process.execPath, [resolve(root, "scripts/vercel-smoke.mjs"), `https://${host}`]));
    }
    console.log("PASS SHA/branch/READY y smoke de deployment + aliases de Production. Corroborar el evento push del merge en GitHub/Vercel para acreditar activación automática; source es solo informativo.");
  }
}

main().catch((error) => { console.error(`BLOCKED: ${error.message}`); process.exitCode = 1; });
