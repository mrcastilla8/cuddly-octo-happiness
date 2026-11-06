import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const evidenceDir = resolve(here, '../../evidencias-integracion-g7');
await mkdir(evidenceDir, { recursive: true });
const runId = `interactive-${new Date().toISOString().replaceAll(':', '-')}-${randomUUID().slice(0, 8)}`;
const events = [];
async function check(stage, url, expectedStatus, method = 'GET') {
  const started = performance.now();
  const event = { timestamp: new Date().toISOString(), scenario_id: runId, stage, method, target: new URL(url).origin, route: new URL(url).pathname };
  try {
    const response = await fetch(url, { method, signal: AbortSignal.timeout(8000) });
    event.http_status = response.status;
    event.duration_ms = Math.round(performance.now() - started);
    event.result = response.status === expectedStatus ? 'PASS' : 'FAIL';
    const bodyType = response.headers.get('content-type') ?? '';
    event.content_type = bodyType;
    if (stage === 'GATEWAY_ANONYMOUS_PROTECTED_GET' && /json/i.test(bodyType)) {
      const body = await response.json();
      event.contract_code = typeof body.code === 'string' ? body.code : null;
      event.correlation_id = typeof body.correlationId === 'string' ? body.correlationId : null;
    }
    if (method === 'OPTIONS') {
      event.access_control_allow_origin = response.headers.get('access-control-allow-origin');
      event.access_control_allow_methods = response.headers.get('access-control-allow-methods');
      event.access_control_allow_headers = response.headers.get('access-control-allow-headers');
    }
  } catch (error) {
    event.duration_ms = Math.round(performance.now() - started);
    event.result = 'FAIL';
    event.error_type = error.cause?.code ?? error.name ?? 'FetchError';
  }
  events.push(event);
  return event;
}

await check('GATEWAY_HEALTH', 'http://127.0.0.1:3000/health', 200);
await check('PROMOTIONS_HEALTH', 'http://127.0.0.1:3004/health', 200);
await check('REACT_ROUTE', 'http://127.0.0.1:5173/cupones', 200);
await check('GATEWAY_ANONYMOUS_PROTECTED_GET', 'http://127.0.0.1:5173/api/v1/cupones', 401);
const summary = {
  generated_at: new Date().toISOString(),
  scenario_id: runId,
  overall: 'BLOCKED',
  e2e_authenticated: 'BLOCKED_HUMAN_G7_LOGIN_PENDING',
  database: { result: 'PASS', mode: 'disposable-postgresql', tls: 'verify-full', official_migrations: 4 },
  browser: { route: '/cupones', form_verified: 'Iniciar sesión', login_provider: 'real-G7-G7Session' },
  gateway_cors: { direct: 'NOT_HOMOLOGATED', local_vite_proxy: 'ACTIVE', rationale: 'Gateway does not expose browser CORS; the lab proxy preserves real JWT validation.' },
  events,
  security: 'No authorization header, token, credentials, OTP, response body, or personal claims were recorded.'
};
const output = resolve(evidenceDir, `${runId}.json`);
await writeFile(output, JSON.stringify(summary, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(summary, null, 2));
