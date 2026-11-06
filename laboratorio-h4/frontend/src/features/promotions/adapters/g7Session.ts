// G7 OpenAPI bf819dd, SPEC-06 / H-11: memory only, one refresh in flight,
// rotation without automatic retries after an unknown result. No service token.
export interface SessionUser {
  id: string;
  nombreCompleto: string;
  correo: string;
  roles: readonly string[];
}
export interface SessionView {
  user: SessionUser | null;
  mfa: boolean;
  busy: boolean;
  notice: string;
}
interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}
class SessionFailure extends Error {
  constructor(readonly code: string) {
    super("No se pudo completar la sesión.");
  }
}
const messages = {
  CREDENCIALES_INVALIDAS: "El correo o la contraseña no son correctos.",
  PASSWORD_CADUCADA:
    "Debes actualizar tu contraseña en Seguridad antes de continuar.",
  CODIGO_INVALIDO: "El código no es correcto. Revísalo e intenta de nuevo.",
  OTP_INTENTOS_AGOTADOS: "Solicita un código nuevo para continuar.",
  DEMASIADAS_SOLICITUDES:
    "Se alcanzó el límite de intentos. Intenta más tarde.",
  REFRESCO_INVALIDO: "Tu sesión terminó. Inicia sesión de nuevo.",
  TOKEN_INVALIDO: "El desafío terminó. Inicia sesión de nuevo.",
} as const;
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new SessionFailure("INVALID_RESPONSE");
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || /[\r\n]/.test(value))
    throw new SessionFailure("INVALID_RESPONSE");
  return value;
}
function positive(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0)
    throw new SessionFailure("INVALID_RESPONSE");
  return value;
}
export function secureBase(value: string, originOnly = false): string {
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (originOnly && url.pathname !== "/") ||
    (url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      ))
  )
    throw new Error("Configura una URL HTTPS válida para la integración.");
  return url.href.replace(/\/$/, "");
}
async function json(response: Response): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new SessionFailure("INVALID_RESPONSE");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 65536) throw new SessionFailure("INVALID_RESPONSE");
      chunks.push(part.value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}
async function waitFor<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  let stop = () => {};
  try {
    return await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        stop = () =>
          reject(new DOMException("Consulta cancelada", "AbortError"));
        signal.addEventListener("abort", stop, { once: true });
        if (signal.aborted) stop();
      }),
    ]);
  } finally {
    signal.removeEventListener("abort", stop);
  }
}
export class G7Session {
  readonly #base: string;
  #tokens: Tokens | null = null;
  #challenge: { token: string; expiresAt: number } | null = null;
  #refresh: Promise<string | null> | null = null;
  #generation = 0;
  #listeners = new Set<() => void>();
  #view: SessionView = { user: null, mfa: false, busy: false, notice: "" };
  constructor(
    base: string,
    private readonly clock: () => number = Date.now,
  ) {
    this.#base = secureBase(base);
  }
  snapshot = (): SessionView => this.#view;
  subscribe = (notify: () => void) => {
    this.#listeners.add(notify);
    return () => {
      this.#listeners.delete(notify);
    };
  };
  #publish(change: Partial<SessionView>) {
    this.#view = { ...this.#view, ...change };
    this.#listeners.forEach((notify) => notify());
  }
  #clear(notice: string) {
    this.#generation++;
    this.#tokens = null;
    this.#challenge = null;
    this.#refresh = null;
    this.#publish({ user: null, mfa: false, busy: false, notice });
  }
  async #post(path: string, body: unknown, expected = 200): Promise<unknown> {
    const response = await fetch(this.#base + path, {
      method: "POST",
      signal: AbortSignal.timeout(6500),
      credentials: "omit",
      redirect: "error",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.status !== expected) {
      const problem = object(await json(response));
      throw new SessionFailure(
        typeof problem.code === "string" &&
          Object.hasOwn(messages, problem.code)
          ? problem.code
          : "UNAVAILABLE",
      );
    }
    return expected === 204 ? null : json(response);
  }
  #accept(value: unknown) {
    const dto = object(value),
      raw = object(dto.usuario);
    const accessToken = text(dto.accessToken),
      refreshToken = text(dto.refreshToken);
    if (
      dto.tokenType !== "Bearer" ||
      !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(accessToken) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        text(raw.id),
      ) ||
      !Array.isArray(raw.roles)
    )
      throw new SessionFailure("INVALID_RESPONSE");
    const user = {
      id: text(raw.id),
      nombreCompleto: text(raw.nombreCompleto),
      correo: text(raw.correo),
      roles: raw.roles.map(text),
    };
    this.#tokens = {
      accessToken,
      refreshToken,
      expiresAt: this.clock() + positive(dto.expiresIn) * 1000,
    };
    this.#challenge = null;
    this.#publish({ user, mfa: false, notice: "" });
  }
  async #action(work: () => Promise<void>) {
    if (this.#view.busy) return;
    this.#publish({ busy: true, notice: "" });
    const generation = this.#generation;
    try {
      await work();
    } catch (error) {
      if (generation === this.#generation) {
        if (error instanceof SessionFailure && error.code === "TOKEN_INVALIDO")
          this.#clear(messages.TOKEN_INVALIDO);
        else
          this.#publish({
            notice:
              (error instanceof SessionFailure &&
                messages[error.code as keyof typeof messages]) ||
              "No pudimos conectar con Seguridad. Intenta de nuevo.",
          });
      }
    } finally {
      if (generation === this.#generation) this.#publish({ busy: false });
    }
  }
  login(correo: string, contrasena: string) {
    return this.#action(async () => {
      const generation = this.#generation;
      const started = this.clock();
      const dto = object(
        await this.#post("/auth/login", { correo, contrasena }),
      );
      if (generation !== this.#generation) return;
      if (dto.mfaRequerido === true) {
        this.#challenge = {
          token: text(dto.challengeToken),
          expiresAt: started + positive(dto.expiraEn) * 1000,
        };
        this.#publish({ mfa: true, user: null });
      } else this.#accept(dto);
    });
  }
  #challengeToken() {
    if (!this.#challenge || this.clock() >= this.#challenge.expiresAt)
      throw new SessionFailure("TOKEN_INVALIDO");
    return this.#challenge.token;
  }
  sendCode() {
    return this.#action(async () => {
      const generation = this.#generation;
      const dto = object(
        await this.#post(
          "/auth/otp/solicitar",
          { challengeToken: this.#challengeToken(), canal: "EMAIL" },
          202,
        ),
      );
      if (generation !== this.#generation) return;
      // These response properties are optional in G7 OpenAPI. An accepted send
      // never extends the original challenge deadline, even without metadata.
      if (dto.expiraEn !== undefined) positive(dto.expiraEn);
      if (dto.desafioExpiraEn !== undefined) positive(dto.desafioExpiraEn);
      this.#publish({
        notice: "Enviamos el código a tu correo. Revisa tu bandeja de entrada.",
      });
    });
  }
  verifyCode(codigo: string) {
    return this.#action(async () => {
      if (!/^\d{6}$/.test(codigo)) throw new SessionFailure("CODIGO_INVALIDO");
      const generation = this.#generation;
      const dto = await this.#post("/auth/otp/verificar", {
        challengeToken: this.#challengeToken(),
        codigo,
      });
      if (generation === this.#generation) this.#accept(dto);
    });
  }
  #renew(): Promise<string | null> {
    if (this.#refresh) return this.#refresh;
    if (!this.#tokens) return Promise.resolve(null);
    const token = this.#tokens.refreshToken,
      generation = this.#generation;
    const work = (async () => {
      try {
        const dto = await this.#post("/auth/refresh", { refreshToken: token });
        if (generation !== this.#generation) return null;
        const rotated = object(dto);
        if (rotated.refreshToken === token)
          throw new SessionFailure("INVALID_RESPONSE");
        this.#accept(rotated);
        return this.#tokens?.accessToken ?? null;
      } catch {
        // A lost response may already have consumed the refresh token. Never
        // retry it, keep using it, or restore the old token after a timeout.
        if (generation === this.#generation)
          this.#clear(messages.REFRESCO_INVALIDO);
        return null;
      } finally {
        if (generation === this.#generation) this.#refresh = null;
      }
    })();
    this.#refresh = work;
    return work;
  }
  getAccessToken = async (signal: AbortSignal): Promise<string | null> => {
    signal.throwIfAborted();
    if (!this.#tokens) return null;
    if (this.#tokens.expiresAt - this.clock() > 60000 && !this.#refresh)
      return this.#tokens.accessToken;
    return waitFor(this.#renew(), signal);
  };
  refreshAccessToken = async (rejected: string, signal: AbortSignal) => {
    signal.throwIfAborted();
    if (!this.#tokens) return null;
    if (this.#tokens.accessToken !== rejected)
      return this.getAccessToken(signal);
    return waitFor(this.#renew(), signal);
  };
  invalidateAccessToken = (rejected: string) => {
    if (this.#tokens?.accessToken === rejected)
      this.#clear(messages.REFRESCO_INVALIDO);
  };
  async logout() {
    const token = this.#tokens?.refreshToken;
    this.#clear("Cerraste sesión.");
    if (token) {
      try {
        await this.#post("/auth/logout", { refreshToken: token }, 204);
      } catch {
        /* Local logout is unconditional. */
      }
    }
  }
}
