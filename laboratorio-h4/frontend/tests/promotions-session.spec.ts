import { test, expect } from "@playwright/test";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { once } from "node:events";
import {
  G7Session,
  secureBase,
} from "../src/features/promotions/adapters/g7Session";
import { createHttpPromotionServices } from "../src/features/promotions/adapters/httpPromotionServices";

const signal = () => new AbortController().signal;
const dto = (version = 1) => ({
  accessToken: `eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJzeW50aGV0aWMifQ.signature${version}`,
  refreshToken: `synthetic-refresh-${version}`,
  tokenType: "Bearer",
  expiresIn: 900,
  usuario: {
    id: "11111111-1111-4111-8111-111111111111",
    nombreCompleto: "Gestora de prueba",
    correo: "isolated@example.test",
    roles: ["GESTOR_COMERCIAL"],
  },
});
type Request = {
  path: string;
  body: Record<string, unknown>;
  auth: string | undefined;
};
async function fixture(
  work: (
    origin: string,
    calls: Request[],
    set: (
      handler: (
        request: Request,
        response: ServerResponse,
        raw: IncomingMessage,
      ) => void,
    ) => void,
  ) => Promise<void>,
) {
  const calls: Request[] = [];
  let handle: (
    request: Request,
    response: ServerResponse,
    raw: IncomingMessage,
  ) => void = (_request, response) => {
    response.end(JSON.stringify(dto()));
  };
  const server = createServer(async (raw, response) => {
    let body = "";
    for await (const chunk of raw) body += String(chunk);
    const request = {
      path: raw.url!,
      body: body ? (JSON.parse(body) as Record<string, unknown>) : {},
      auth: raw.headers.authorization,
    };
    calls.push(request);
    response.setHeader("content-type", "application/json");
    handle(request, response, raw);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("NO_PORT");
  try {
    await work(`http://127.0.0.1:${address.port}`, calls, (handler) => {
      handle = handler;
    });
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
}

test("G7: login usa el DTO real, mantiene secretos fuera de la vista y logout usa solo refreshToken", async () => {
  await fixture(async (origin, calls, set) => {
    const session = new G7Session(origin + "/api/v1");
    await session.login("isolated@example.test", "synthetic-password");
    expect(calls[0]).toEqual({
      path: "/api/v1/auth/login",
      body: {
        correo: "isolated@example.test",
        contrasena: "synthetic-password",
      },
      auth: undefined,
    });
    expect(session.snapshot().user?.roles).toEqual(["GESTOR_COMERCIAL"]);
    expect(JSON.stringify(session.snapshot())).not.toMatch(
      /eyJ|synthetic-refresh|synthetic-password/,
    );
    expect(await session.getAccessToken(signal())).toBe(dto().accessToken);
    set((_r, response) => {
      response.statusCode = 204;
      response.end();
    });
    await session.logout();
    expect(calls.at(-1)).toEqual({
      path: "/api/v1/auth/logout",
      body: { refreshToken: dto().refreshToken },
      auth: undefined,
    });
    expect(await session.getAccessToken(signal())).toBeNull();
  });
});
test("G7: credenciales inválidas no exponen detail ni conceden sesión", async () => {
  await fixture(async (origin, _calls, set) => {
    set((_r, response) => {
      response.statusCode = 401;
      response.end(
        JSON.stringify({
          code: "CREDENCIALES_INVALIDAS",
          detail: "secret diagnostic",
        }),
      );
    });
    const session = new G7Session(origin);
    await session.login("test@example.test", "wrong");
    expect(session.snapshot().notice).toBe(
      "El correo o la contraseña no son correctos.",
    );
    expect(session.snapshot().user).toBeNull();
  });
});
test("G7: MFA no habilita el API antes de solicitar/verificar el código", async () => {
  await fixture(async (origin, calls, set) => {
    set((request, response) => {
      if (request.path.endsWith("/login"))
        response.end(
          JSON.stringify({
            mfaRequerido: true,
            challengeToken: "synthetic-challenge",
            expiraEn: 300,
            canal: "EMAIL",
          }),
        );
      else if (request.path.endsWith("/solicitar")) {
        response.statusCode = 202;
        response.end(JSON.stringify({ expiraEn: 300, desafioExpiraEn: 240 }));
      } else response.end(JSON.stringify(dto()));
    });
    const session = new G7Session(origin);
    await session.login("test@example.test", "synthetic-password");
    expect(session.snapshot().mfa).toBe(true);
    expect(await session.getAccessToken(signal())).toBeNull();
    await session.sendCode();
    await session.verifyCode("123456");
    expect(calls[1]?.body).toEqual({
      challengeToken: "synthetic-challenge",
      canal: "EMAIL",
    });
    expect(calls[2]?.body).toEqual({
      challengeToken: "synthetic-challenge",
      codigo: "123456",
    });
    expect(await session.getAccessToken(signal())).toBe(dto().accessToken);
  });
});
test("G7: un desafío vencido exige login sin reenviar el desafío al servidor", async () => {
  await fixture(async (origin, calls, set) => {
    let now = 0;
    set((_r, response) => {
      response.end(
        JSON.stringify({
          mfaRequerido: true,
          challengeToken: "synthetic-challenge",
          expiraEn: 300,
        }),
      );
    });
    const session = new G7Session(origin, () => now);
    await session.login("test@example.test", "synthetic-password");
    now = 300001;
    await session.sendCode();
    expect(session.snapshot().mfa).toBe(false);
    expect(calls).toHaveLength(1);
  });
});

test("G7: envío OTP acepta metadatos opcionales ausentes sin prolongar el desafío", async () => {
  await fixture(async (origin, calls, set) => {
    let now = 0;
    set((request, response) => {
      if (request.path.endsWith("/login"))
        response.end(
          JSON.stringify({
            mfaRequerido: true,
            challengeToken: "synthetic-challenge",
            expiraEn: 300,
          }),
        );
      else {
        response.statusCode = 202;
        response.end("{}");
      }
    });
    const session = new G7Session(origin, () => now);
    await session.login("test@example.test", "synthetic-password");
    await session.sendCode();
    expect(session.snapshot().notice).toContain("Enviamos el código");
    now = 300001;
    await session.verifyCode("123456");
    expect(session.snapshot().mfa).toBe(false);
    expect(calls).toHaveLength(2);
  });
});
test("G7: consultas simultáneas comparten un solo refresh y rotan ambos tokens", async () => {
  await fixture(async (origin, calls, set) => {
    let now = 0;
    const session = new G7Session(origin, () => now);
    await session.login("test@example.test", "synthetic-password");
    now = 850000;
    set((_r, response) => {
      setTimeout(() => {
        response.end(JSON.stringify(dto(2)));
      }, 20);
    });
    const values = await Promise.all(
      Array.from({ length: 6 }, () => session.getAccessToken(signal())),
    );
    expect(new Set(values)).toEqual(new Set([dto(2).accessToken]));
    expect(calls.filter((r) => r.path === "/auth/refresh")).toHaveLength(1);
    set((_r, response) => {
      response.statusCode = 204;
      response.end();
    });
    await session.logout();
    expect(calls.at(-1)?.body.refreshToken).toBe(dto(2).refreshToken);
  });
});
test("G7: cancelar una consulta no cancela el refresh compartido", async () => {
  await fixture(async (origin, calls, set) => {
    let now = 0;
    const session = new G7Session(origin, () => now);
    await session.login("test@example.test", "synthetic-password");
    now = 850000;
    set((_r, response) => {
      setTimeout(() => {
        response.end(JSON.stringify(dto(2)));
      }, 30);
    });
    const controller = new AbortController();
    const first = session.getAccessToken(controller.signal);
    const second = session.getAccessToken(signal());
    controller.abort();
    await expect(first).rejects.toThrow("Consulta cancelada");
    expect(await second).toBe(dto(2).accessToken);
    expect(calls).toHaveLength(2);
  });
});
for (const mode of ["invalid", "network", "same-refresh"] as const)
  test(`G7: refresh ${mode} cierra sesión y nunca reutiliza el token`, async () => {
    await fixture(async (origin, calls, set) => {
      let now = 0;
      const session = new G7Session(origin, () => now);
      await session.login("test@example.test", "synthetic-password");
      now = 850000;
      set((_r, response, raw) => {
        if (mode === "network") {
          raw.socket.destroy();
          return;
        }
        if (mode === "invalid") {
          response.statusCode = 401;
          response.end(JSON.stringify({ code: "REFRESCO_INVALIDO" }));
        } else response.end(JSON.stringify(dto()));
      });
      expect(await session.getAccessToken(signal())).toBeNull();
      expect(await session.getAccessToken(signal())).toBeNull();
      expect(calls).toHaveLength(2);
      expect(session.snapshot().user).toBeNull();
    });
  });
test("G7: logout durante login no permite que una respuesta tardía restaure la sesión", async () => {
  await fixture(async (origin, calls, set) => {
    let finish = () => {};
    set((_r, response) => {
      finish = () => {
        response.end(JSON.stringify(dto()));
      };
    });
    const session = new G7Session(origin);
    const login = session.login("test@example.test", "synthetic-password");
    await expect.poll(() => calls.length).toBe(1);
    await session.logout();
    finish();
    await login;
    expect(session.snapshot().user).toBeNull();
    expect(await session.getAccessToken(signal())).toBeNull();
  });
});
test("G7: origen HTTPS configurable; no acepta credenciales, query o HTTP remoto", () => {
  for (const url of [
    "http://external.test",
    "https://user:pass@example.test",
    "https://example.test?token=x",
    "https://example.test/#token",
  ])
    expect(() => secureBase(url)).toThrow();
  expect(secureBase("https://example.test/api/v1/")).toBe(
    "https://example.test/api/v1",
  );
});
test("Gateway: TOKEN_INVALIDO permite un solo reintento GET; un segundo 401 invalida la sesión", async () => {
  await fixture(async (origin, calls, set) => {
    let refreshes = 0,
      invalidated = "";
    set((_r, response) => {
      response.statusCode = 401;
      response.end(JSON.stringify({ code: "TOKEN_INVALIDO" }));
    });
    const api = createHttpPromotionServices({
      gatewayOrigin: origin,
      getAccessToken: async () => dto().accessToken,
      refreshAccessToken: async () => {
        refreshes++;
        return dto(2).accessToken;
      },
      invalidateAccessToken: (token) => {
        invalidated = token;
      },
    });
    await expect(api.coupons.read("id", signal())).rejects.toMatchObject({
      kind: "session",
    });
    expect(refreshes).toBe(1);
    expect(calls).toHaveLength(2);
    expect(invalidated).toBe(dto(2).accessToken);
    expect(calls.map((r) => r.auth)).toEqual([
      `Bearer ${dto().accessToken}`,
      `Bearer ${dto(2).accessToken}`,
    ]);
  });
});
test("Gateway: un 403 o un 401 desconocido no dispara renovación", async () => {
  await fixture(async (origin, calls, set) => {
    let refreshed = false;
    const api = createHttpPromotionServices({
      gatewayOrigin: origin,
      getAccessToken: async () => dto().accessToken,
      refreshAccessToken: async () => {
        refreshed = true;
        return dto(2).accessToken;
      },
    });
    for (const status of [403, 401]) {
      set((_r, response) => {
        response.statusCode = status;
        response.end(JSON.stringify({ code: "UNKNOWN" }));
      });
      await expect(api.coupons.read("id", signal())).rejects.toBeTruthy();
    }
    expect(refreshed).toBe(false);
    expect(calls).toHaveLength(2);
  });
});
test("Gateway: no reenvía una escritura rechazada ni reusa la sesión invalidada", async () => {
  await fixture(async (origin, calls, set) => {
    let refreshed = false,
      invalidated = false;
    set((_r, response) => {
      response.statusCode = 401;
      response.end(JSON.stringify({ code: "TOKEN_INVALIDO" }));
    });
    const api = createHttpPromotionServices({
      gatewayOrigin: origin,
      getAccessToken: async () => dto().accessToken,
      refreshAccessToken: async () => {
        refreshed = true;
        return dto(2).accessToken;
      },
      invalidateAccessToken: () => {
        invalidated = true;
      },
    });
    await expect(
      api.coupons.changeStatus("id", "inactive", signal()),
    ).rejects.toMatchObject({ kind: "access" });
    expect(refreshed).toBe(false);
    expect(invalidated).toBe(true);
    expect(calls).toHaveLength(1);
  });
});
