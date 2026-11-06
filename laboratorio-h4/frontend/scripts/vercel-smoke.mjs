import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = new URL(process.argv[2] ?? "http://127.0.0.1:5174");
assert(["https:", "http:"].includes(base.protocol) && !base.username && !base.password, "URL http(s) sin credenciales requerida");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(20_000);
const failures = [];
const assets = new Set();
page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
page.on("console", (message) => { if (message.type() === "error") failures.push(`console: ${message.text()}`); });
page.on("requestfailed", (request) => failures.push(`requestfailed: ${new URL(request.url()).pathname}`));
page.on("response", (response) => {
  const request = response.request();
  if (["script", "stylesheet"].includes(request.resourceType())) {
    assets.add(response.url());
    // Chromium puede revalidar el caché al abrir otra ruta o refrescar.
    if (!response.ok() && response.status() !== 304) failures.push(`asset HTTP ${response.status()}: ${new URL(response.url()).pathname}`);
  }
});
try {
  for (const path of ["/", "/precios", "/productos", "/categorias", "/carga-masiva"]) {
    const response = await page.goto(new URL(path, base).href, { waitUntil: "networkidle" });
    assert(response?.ok(), `${path}: HTTP ${response?.status()}`);
    assert.match(response.headers()["content-type"] ?? "", /text\/html/);
    await page.locator("main").waitFor();
    const heading = page.getByRole("heading", { level: 1 });
    await heading.waitFor();
    const text = await heading.innerText();
    const expected = path === "/" || path === "/precios" ? /precios/i : path === "/productos" ? /productos/i : path === "/categorias" ? /categor[ií]as/i : /carga|importaci[oó]n/i;
    assert.match(text, expected, `${path}: pantalla esperada`);
    assert.doesNotMatch(text, /no encontrad|no disponible|error/i);
    if (["/", "/precios", "/productos", "/categorias"].includes(path)) await page.getByRole("table").first().waitFor();
    if (path === "/productos") {
      const reload = await page.reload({ waitUntil: "networkidle" });
      assert(reload?.ok(), "Refresh /productos");
      await page.getByRole("table").first().waitFor();
      assert.match(await heading.innerText(), /productos/i);
    }
    console.log(`PASS ${path}${path === "/productos" ? " + refresh" : ""}`);
  }
  assert([...assets].some((url) => /\.js(?:\?|$)/.test(url)), "Sin JS cargado");
  assert([...assets].some((url) => /\.css(?:\?|$)/.test(url)), "Sin CSS cargado");
  for (const url of assets) {
    const response = await page.request.get(url);
    assert(response.ok(), `Recurso HTTP ${response.status()}`);
    const mime = response.headers()["content-type"] ?? "";
    assert.match(mime, /\.css(?:\?|$)/.test(url) ? /text\/css/ : /javascript/, `MIME de ${new URL(url).pathname}`);
  }
  assert.deepEqual(failures, [], "Errores críticos de arranque/recursos");
  console.log(`PASS smoke mock: cinco rutas, refresh, ${assets.size} recursos JS/CSS, cero errores; ${base.origin}`);
} finally {
  await browser.close();
}
