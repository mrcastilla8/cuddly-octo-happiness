// Read-only diagnostic. Never accepts tokens, mutates data or changes guards.
import { writeFile } from "node:fs/promises";
const origin = new URL(process.env.G6_VERIFY_GATEWAY_ORIGIN ?? "");
if (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash)
  throw new Error("Indique un origen HTTPS explícito sin credenciales ni ruta.");
const evidence = { recordedAt: new Date().toISOString(), origin: origin.origin, kind: "REAL_GATEWAY_READ_ONLY", requests: [] };
async function read(path) {
  const correlationId = crypto.randomUUID();
  const started = Date.now();
  try {
    const response = await fetch(origin.origin + "/api/v1" + path, {
      method: "GET", credentials: "omit", redirect: "error", signal: AbortSignal.timeout(15000),
      headers: { accept: "application/json", "x-correlation-id": correlationId },
    });
    const body = await response.json().catch(() => null);
    evidence.requests.push({ method: "GET", path, status: response.status, contentType: response.headers.get("content-type"), code: body?.code ?? null, detail: typeof body?.detail === "string" ? body.detail : null,
      correlationId: response.headers.get("x-correlation-id") ?? correlationId, elapsedMs: Date.now() - started });
    return response.ok ? body : null;
  } catch (error) {
    evidence.requests.push({ method: "GET", path, error: error.name, message: error.message, correlationId, elapsedMs: Date.now() - started });
    return null;
  }
}
await read("/categorias");
const products = await read("/productos?canal=MARKETPLACE&estado=BORRADOR&pagina=1&tamanio=20&orden=NOMBRE_ASC");
const id = products?.items?.[0]?.product_id ?? process.env.G6_VERIFY_PRODUCT_ID;
if (typeof id === "string" && id) await read(`/precios/productos/${encodeURIComponent(id)}`);
else evidence.pricing = "NO_EJECUTADO: falta un product_id autorizado; catálogo no devolvió uno.";
evidence.result = evidence.requests.length === 3 && evidence.requests.every(row => row.status === 200) ? "READS_200_ONLY_NOT_END_TO_END" : "BLOCKED_EXTERNAL";
const output = process.env.G6_VERIFY_OUTPUT ?? "docs/evidencias/catalogo-h4/gateway-auditoria.json";
await writeFile(output, JSON.stringify(evidence, null, 2) + "\n");
console.log(JSON.stringify(evidence, null, 2));
