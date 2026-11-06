import { randomUUID } from 'node:crypto';
import { writeFile, mkdir, access, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const lab = resolve(here, '..');
const output = resolve(lab, 'evidencias-integracion-g7');
const g7 = process.env.G7_AUTH_BASE_URL || 'https://g7-auth-service.onrender.com';
const discoveryPath = '/api/v1/auth/.well-known/openid-configuration';
const origin = process.env.G6_BROWSER_ORIGIN || 'http://127.0.0.1:5173';
const gateway = process.env.G6_GATEWAY_BASE_URL || 'http://127.0.0.1:3000';
const runId = `diag-${new Date().toISOString().replaceAll(':', '-')}-${randomUUID().slice(0, 8)}`;
const events = [];
const rows = [];
const isoNow = () => new Date().toISOString();
const envSet = (...names) => Object.fromEntries(names.map(n => [n, Boolean(process.env[n])]));
function classify(url, error) {
  const s = String(error ?? '');
  if (url.startsWith(g7)) return /certificate|TLS|SSL/i.test(s) ? 'G7_TLS' : /ENOTFOUND|DNS|getaddrinfo/i.test(s) ? 'G7_DNS' : /timeout|timed out/i.test(s) ? 'G7_TIMEOUT' : 'G7_NETWORK';
  return 'G6_GATEWAY_NETWORK';
}
async function request(stage, url, init = {}) {
  const id = randomUUID();
  const start = performance.now();
  const method = init.method || 'GET';
  let status = null, classification = null, result = 'FAIL', code = null;
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(12000), redirect: 'error' });
    status = res.status;
    const requestId = res.headers.get('x-correlation-id') || res.headers.get('x-request-id');
    const ct = res.headers.get('content-type') || '';
    let json;
    if (/json/i.test(ct)) { try { json = await res.json(); } catch {} }
    code = json && typeof json.code === 'string' ? json.code.slice(0, 80) : null;
    const cors = Object.fromEntries(['access-control-allow-origin','access-control-allow-methods','access-control-allow-headers','access-control-allow-credentials'].map(k => [k, res.headers.get(k)]).filter(([,v]) => v));
    result = res.ok ? 'PASS' : 'FAIL';
    let preflight;
    if (method === 'OPTIONS') {
      const allowOrigin = cors['access-control-allow-origin'];
      const requestedMethod = init.headers?.['access-control-request-method'] || '';
      const requestedHeaders = (init.headers?.['access-control-request-headers'] || '').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
      const allowedMethods = (cors['access-control-allow-methods'] || '').split(',').map(x=>x.trim().toUpperCase());
      const allowedHeaders = (cors['access-control-allow-headers'] || '').split(',').map(x=>x.trim().toLowerCase());
      const methodAllowed = !requestedMethod || allowedMethods.includes(requestedMethod.toUpperCase());
      const headersAllowed = requestedHeaders.every(x=>allowedHeaders.includes(x));
      result = res.ok && (allowOrigin === origin || allowOrigin === '*') && methodAllowed && headersAllowed ? 'PASS' : 'FAIL';
      if (result === 'FAIL') classification = stage.startsWith('G7_') ? 'G7_CORS' : 'G6_GATEWAY_CORS';
      preflight = { requested_method:requestedMethod, requested_headers:requestedHeaders, method_allowed:methodAllowed, headers_allowed:headersAllowed };
    }
    events.push({ timestamp: isoNow(), scenario_id: runId, stage, correlation_id: id, upstream_correlation_id: requestId, method, target: new URL(url).origin, route: new URL(url).pathname, http_status: status, contract_code: code, duration_ms: Math.round(performance.now() - start), result, classification, confidence: classification ? 'CONFIRMED' : 'OBSERVED', cors, preflight, body_type: ct, json_keys: json && typeof json === 'object' ? Object.keys(json).slice(0, 20) : [] });
    return { response: res, json, event: events.at(-1) };
  } catch (e) {
    classification = classify(url, e.cause?.code || e.name || e.message);
    events.push({ timestamp: isoNow(), scenario_id: runId, stage, correlation_id: id, method, target: new URL(url).origin, route: new URL(url).pathname, http_status: null, contract_code: null, duration_ms: Math.round(performance.now() - start), result: 'FAIL', classification, confidence: 'CONFIRMED', error_type: e.cause?.code || e.name || 'FetchError' });
    return { error: e, event: events.at(-1) };
  }
}
async function main() {
  await mkdir(output, { recursive: true });
  const manifest = JSON.parse(await readFile(resolve(lab,'MANIFIESTO-SHAS.json'),'utf8'));
  const node = process.versions.node;
  const backend = resolve(lab, 'backend');
  const frontend = resolve(lab, 'frontend');
  const npmVersion = process.platform === 'win32'
    ? spawnSync('cmd.exe', ['/d','/s','/c','npm.cmd --version'], { encoding:'utf8', windowsHide:true })
    : spawnSync('npm', ['--version'], { encoding:'utf8' });
  const dockerVersion = spawnSync('docker', ['--version'], { encoding:'utf8' });
  const dockerDaemon = spawnSync('docker', ['info','--format','{{.ServerVersion}}'], { encoding:'utf8', timeout:5000, windowsHide:true });
  const version = node.split('.').map(Number);
  const frontendNodeOk = version[0] === 22 && version[1] >= 12;
  const backendNodeOk = (version[0] === 22 && version[1] >= 22) || (version[0] === 24 && version[1] >= 15) || version[0] >= 25;
  const exists = async p => { try { await access(p); return true; } catch { return false; } };
  const [frontEnv, backEnv, frontDir, backDir] = await Promise.all([Promise.all(['.env','.env.local','.env.development.local'].map(n=>exists(resolve(frontend,n)))).then(x=>x.some(Boolean)), Promise.all(['.env','.env.local','.env.development.local'].map(n=>exists(resolve(backend,n)))).then(x=>x.some(Boolean)), exists(frontend), exists(backend)]);
  const envKeys = async path => { try { return (await readFile(path,'utf8')).split(/\r?\n/).map(x=>x.trim()).filter(x=>x&&!x.startsWith('#')).map(x=>x.split('=',1)[0]); } catch { return []; } };
  const [frontendEnvKeys,backendEnvKeys] = await Promise.all([envKeys(resolve(frontend,'.env.local')),envKeys(resolve(backend,'apps/promotions-svc/.env.local'))]);
  const toolchainOk = frontendNodeOk && backendNodeOk && npmVersion.status === 0 && dockerVersion.status === 0 && dockerDaemon.status === 0 && frontDir && backDir;
  const frontendConfigOk = ['VITE_DATA_MODE','VITE_GATEWAY_ORIGIN','VITE_G7_API_BASE'].every(x=>frontendEnvKeys.includes(x));
  const runtimeConfigOk = frontendConfigOk && backEnv;
  rows.push({ phase:'F0', timestamp:isoNow(), status:!toolchainOk?'FAIL':runtimeConfigOk?'PASS':'PARTIAL', toolchain_status:toolchainOk?'PASS':'FAIL', runtime_config_status:runtimeConfigOk?'PASS':'PARTIAL', node, npm_version:npmVersion.stdout?.trim() || null, docker_cli:dockerVersion.status===0, docker_daemon:dockerDaemon.status===0, frontend_node_compatible:frontendNodeOk, backend_node_compatible:backendNodeOk, origin, g7_origin:new URL(g7).origin, gateway_origin:new URL(gateway).origin, secret_presence:envSet('G7_CLIENT_SECRET','G7_TEST_USERNAME','G7_TEST_PASSWORD','DATABASE_URL','JWT_PUBLIC_KEY'), private_env_files:{frontend:frontEnv,backend:backEnv}, config_keys:{frontend:frontendEnvKeys,backend:backendEnvKeys}, source_dirs_present:frontDir&&backDir });
  const discoveryUrl = new URL(discoveryPath, g7).toString();
  const discovery = await request('G7_DISCOVERY', discoveryUrl, { headers: { accept:'application/json' } });
  if (discovery.json && typeof discovery.json.issuer === 'string' && typeof discovery.json.jwks_uri === 'string') {
    const jwks = await request('G7_JWKS', discovery.json.jwks_uri, { headers: { accept:'application/json' } });
    let validJwks = false;
    if (jwks.json && Array.isArray(jwks.json.keys)) validJwks = jwks.json.keys.some(k => k.kty === 'RSA' && typeof k.kid === 'string' && (!k.alg || k.alg === 'RS256') && k.use !== 'enc');
    rows.push({ phase:'F1_DISCOVERY', timestamp:isoNow(), status: discovery.response?.ok && validJwks ? 'PASS' : 'FAIL', http_status:discovery.event.http_status, duration_ms:discovery.event.duration_ms, issuer_https: discovery.json.issuer.startsWith('https://'), issuer_origin: new URL(discovery.json.issuer).origin, jwks_uri_https: discovery.json.jwks_uri.startsWith('https://'), jwks_http_status:jwks.event.http_status, jwks_duration_ms:jwks.event.duration_ms, jwks_has_rs256_rsa_key: validJwks, correlation_id: discovery.event.correlation_id, jwks_correlation_id: jwks.event.correlation_id });
  } else rows.push({ phase:'F1_DISCOVERY', timestamp:isoNow(), status:'FAIL', diagnosis: discovery.event.classification || (discovery.response ? 'G7_CONTRACT' : 'G7_NETWORK'), correlation_id:discovery.event.correlation_id });
  for (const [stage, url, requestedMethod, requestedHeaders] of [
    ['G7_CORS_LOGIN',new URL('/api/v1/auth/login',g7).toString(),'POST','content-type'],
    ['G7_CORS_CORRELATION',new URL('/api/v1/auth/.well-known/openid-configuration',g7).toString(),'GET','authorization,content-type,x-correlation-id'],
    ['G6_GATEWAY_CORS',new URL('/api/v1/cupones',gateway).toString(),'GET','authorization,content-type,x-correlation-id'],
  ]) {
    const r = await request(stage,url,{method:'OPTIONS',headers:{origin, 'access-control-request-method':requestedMethod,'access-control-request-headers':requestedHeaders}});
    rows.push({ phase:stage, timestamp:isoNow(), status:r.event.result, classification:r.event.classification, http_status:r.event.http_status, correlation_id:r.event.correlation_id, cors:r.event.cors, preflight:r.event.preflight, error_type:r.event.error_type });
  }
  const summary = { schema_version:1, generated_at:isoNow(), scenario_id:runId, source_shas:{frontend:manifest.repositories.find(x=>x.name==='G6-Productos-Ofertas-frontend')?.sha,backend:manifest.repositories.find(x=>x.name==='G6-Productos-Ofertas-backend')?.sha}, overall:'PARTIAL', phases:rows, note:'No human login, JWT-protected API call, or database write is attempted by this diagnostic runner.' };
  await writeFile(resolve(output,`${runId}-solicitudes-http.jsonl`), events.map(x=>JSON.stringify(x)).join('\n')+'\n','utf8');
  await (await import('node:fs/promises')).writeFile(resolve(output,`${runId}.json`),JSON.stringify(summary,null,2)+'\n','utf8');
  await writeFile(resolve(output,'resumen.json'),JSON.stringify(summary,null,2)+'\n','utf8');
  await writeFile(resolve(output,'matriz-fronteras.json'),JSON.stringify({scenario_id:runId,generated_at:summary.generated_at,phases:rows},null,2)+'\n','utf8');
  console.log(JSON.stringify(summary,null,2));
}
main().catch(e=>{ console.error(`diagnostic runner failed: ${e.name}`); process.exitCode=1; });
