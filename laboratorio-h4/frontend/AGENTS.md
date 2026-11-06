# AGENTS.md — Instrucciones obligatorias para cualquier agente de Frontend

> **LEER COMPLETO ANTES DE EDITAR.** Este archivo está redactado intencionalmente para un agente que podría asumir rutas, inventar componentes, ignorar documentación o declarar pruebas no ejecutadas. No se permite asumir que lo que no verificaste existe.
>
> **Ámbito:** únicamente el repositorio `frontend/` de Productos y Ofertas.
>
> **Regla cero:** **VERIFICA → LEE → PLANIFICA → IMPLEMENTA → PRUEBA → REPORTA.** Nunca inviertas este orden para tareas importantes.

## 0. Definiciones que no debes confundir

- **Workspace local:** carpeta padre `G6-Productos-Ofertas/`. No es un cuarto repositorio Git.
- **Frontend:** carpeta `frontend/`; único lugar donde puedes crear/modificar código en esta tarea, salvo instrucción explícita distinta.
- **Docs:** carpeta hermana `../docs/`, repositorio independiente. Se consulta **solo para lectura**.
- **Backend:** carpeta hermana `../backend/`, repositorio independiente. Se consulta **solo para lectura** cuando sea necesario.
- **Mockup:** prototipo de UI en Docs, **no** código productivo ni verdad absoluta de reglas de negocio.
- **`DESIGN.md`:** fuente normativa de apariencia del mockup de alta fidelidad; React la implementa, no la reemplaza.
- **API contract:** operación publicada por el provider en sus contratos; no es un endpoint que puedas inventar porque "suena lógico".
- **Mock adapter:** simulador local de acceso a datos; no es prueba de que una API exista.
- **P0:** discrepancia bloqueante de integración/consistencia; **no la resuelves inventando un payload, ruta o estado**.
- **UI complete:** pantalla visualmente utilizable; **NO equivale a API integrada ni validada**.

## 1. PRIMER PASO SIEMPRE: identifica dónde estás

**Antes de cualquier modificación**, localiza el directorio raíz de Frontend. Nunca asumas que la terminal está en el directorio correcto.

En PowerShell, desde `frontend/`:

```powershell
Get-Location
git rev-parse --show-toplevel
git status --short
Test-Path .\README.md
Test-Path .\AGENTS.md
Test-Path ..\docs\ux\mockups\DESIGN.md
```

En Bash, desde `frontend/`:

```bash
pwd
git rev-parse --show-toplevel
git status --short
test -f README.md && echo 'README disponible'
test -f AGENTS.md && echo 'AGENTS disponible'
test -f ../docs/ux/mockups/DESIGN.md && echo 'Docs disponible'
```

**Comprueba el resultado de cada comando.** No escribas "OK" si el comando falló.

**Si Frontend todavía no tiene `.git`:** puede tratarse de su primera inicialización. No borres contenido para recrearlo y no crees un repositorio Git en `G6-Productos-Ofertas/`. Si el issue pide inicialización, prepara la estructura de Frontend; las operaciones Git se realizan según las instrucciones del owner.

**Si existen cambios previos sin commit:** consérvalos. No ejecutes `git reset --hard`, `git clean -fd`, force push, `git checkout -- .`, ni sobrescribas archivos sin inspeccionar sus diferencias.

## 2. Lecturas obligatorias (orden estricto)

### 2.1 Para CUALQUIER tarea

1. `frontend/AGENTS.md` (este archivo).
2. `frontend/README.md`.
3. Árbol real del frontend: `package.json`, `src/`, configuración, carpetas y patrones existentes **si existen**.
4. Issue/tarea concreta; identifica su alcance, restricciones, archivos afectados y criterio de aceptación.
5. `../docs/ux/mockups/DESIGN.md` y `../docs/ux/mockups/ux/ux-guidelines.md` si trabajas en UI.
6. `../docs/ux/mockups/ux/ux-decisions.md` si decides patrones, estructura o interacción.

### 2.2 Si trabajas en un MK-XXX

Sustituye XXX por el ID real. **No uses literalmente `MK-XXX` como carpeta.** Comprueba, en este orden:

```text
../docs/requisitos/specs/SPEC-XXX-*.md
../docs/requisitos/hu/HU-XXX-*.md
../docs/requisitos/flujos/FLOW-XXX-*.md
../docs/ux/wireframes/flows/   (localiza WF-XXX si aplica)
../docs/ux/mockups/ux/propuesta-ux.md
../docs/ux/mockups/ux/ux-decisions.md
../docs/ux/mockups/ux/ux-guidelines.md
../docs/ux/mockups/DESIGN.md
../docs/ux/mockups/MK-XXX/component-spec.md
../docs/ux/mockups/MK-XXX/plan.md
../docs/ux/mockups/MK-XXX/tasks.md
../docs/ux/mockups/MK-XXX/validation-report.md (solo si existe)
../docs/ux/mockups/MK-XXX/prototipo/*.html
```

**No adivines sufijos** de archivos SPEC/HU/FLOW: busca el archivo que comienza por el ID. Si hay varias coincidencias, inspecciona cuáles son vigentes. Si un archivo no existe, anota `NO ENCONTRADO`; no lo sustituyas por texto inventado.

**Para integrar una API**, lee también el contrato exacto de su owner:

```text
../docs/contratos/http/openapi.yaml
../docs/contratos/http/catalogo-errores.md
../docs/contratos/eventos/asyncapi.yaml    (si aplica)
../docs/contratos/pruebas/                 (si aplica)
```

Si el contrato pertenece a **otro módulo**, consulta la fuente oficial de ese otro provider; el OpenAPI de Productos no es autoridad de Ventas, Retail, Seguridad o Despacho.

### 2.3 Si no puedes acceder a Docs

1. Comprueba si realmente existe `../docs/` y no estás en un subdirectorio de `src/`.
2. Si hay permiso, consulta la documentación en el repositorio oficial: https://github.com/Taller-SW-Web/G6-Productos-Ofertas-docs (rama `master`).
3. Si trabajas en un ambiente remoto de un único repositorio, utiliza el mecanismo autorizado para montar/clonar Docs como **segunda fuente de solo lectura**.
4. **Si no puedes leer una fuente que es imprescindible para ejecutar correctamente una tarea, marca esa parte como `BLOCKED_DOCS`. No la inventes.** Puedes continuar una parte de foundation que no dependa de ese contenido; por ejemplo configurar herramientas sin definir tokens visuales.
5. No copies masivamente Docs dentro de `frontend/`, no modifiques su Git y no descargues archivos secretos.

## 3. Fuentes de verdad: decide según la naturaleza del dato

**No existe una única jerarquía plana para todo.** Resuelve cada pregunta con la fuente competente:

| Pregunta | Fuente autorizada |
|---|---|
| ¿Qué regla empresarial debe cumplirse? | `SPEC-XXX`, HU, Flow y decisiones funcionales aprobadas. |
| ¿Qué datos acepta/devuelve el provider? | OpenAPI/AsyncAPI del **provider** correspondiente. |
| ¿Qué pantalla/acción/estado de UI se espera? | `component-spec.md`, Flow, decisiones UX y mockup de referencia. |
| ¿Qué color, espaciado, tipografía o patrón visual corresponde? | `ux/mockups/DESIGN.md` y guías/decisiones UX. |
| ¿Cómo se implementa en React? | Arquitectura y convenciones de **Frontend**, sin contradecir las fuentes anteriores. |
| ¿Quién es owner o revisor? | Issue, `EQUIPO_Y_RESPONSABILIDADES.md` y acuerdos vigentes. |

**Si HTML y `DESIGN.md` difieren en color/margen/typography:** usa `DESIGN.md`; registra la diferencia, no copies el defecto.

**Si HTML y SPEC/HU/Flow difieren en una regla/acción:** no elijas al azar. Identifica el conflicto; no implementes una regla contradictoria como si estuviera aprobada.

**Si OpenAPI y documentación narrativa difieren en contrato HTTP:** no diseñes tu propia tercera opción. Registra conflicto y usa mock tipado si el contrato aún no puede ejecutarse.

**Nunca uses `ux/wireframes/DESIGN.md` para estilizar el frontend final**: rige wireframes de baja fidelidad, no la UX de mockups.

## 4. Alcance de plataforma: DESKTOP, NO SUPONER MOBILE

La documentación de mockups vigente declara **Web Desktop**, con **1440 px como viewport canónico de revisión**. Por tanto:

- Diseña y valida primero a 1440 px.
- Evita overflow horizontal involuntario, superposiciones, recortes y campos que no funcionan con teclado.
- No inventes variantes tablet/mobile ni cambies la disposición oficial para acomodarlas **salvo que el issue apruebe expresamente el cambio de alcance**.
- Si el layout presenta un problema grave incluso en desktop, no lo escondas con scroll arbitrario: diagnostica y ajusta conforme a `DESIGN.md`.
- Respeta el enfoque de color austero del Design System; sin arcoíris en badges/KPIs ni iconos coloreados por decoración.

## 5. ANTES DE PROGRAMAR: miniinventario obligatorio

En tareas de feature, componente complejo o foundation, primero escribe una nota breve (en tu respuesta; no es obligatorio crear archivo) con el siguiente formato:

```text
TAREA: <issue / MK-XXX / pantalla>
RAÍZ FRONTEND: <ruta comprobada>
BRANCH FRONTEND: <rama real>
DOCS ACCESIBLE: SÍ / NO
DOCS REF: <rama y SHA, si se puede obtener>
ESTADO GIT: LIMPIO / ARCHIVOS PREEXISTENTES (listar)
FUENTES LEÍDAS: <rutas reales>
PANTALLAS: <IDs SXX encontrados; no inventar>
COMPONENTES EXISTENTES PARA REUTILIZAR: <nombres reales>
ARCHIVOS PREVISTOS PARA CAMBIAR: <rutas>
CONTRATOS P0/BLOQUEOS: <IDs o NINGUNO CONFIRMADO>
NIVEL DE ENTREGA: UI_COMPLETE / MOCK_INTEGRATED / API_INTEGRATED
```

Si una tarea simple solo edita texto o una línea, basta la comprobación proporcional; **no conviertas este control en burocracia**. Para una implementación de MK o foundation sí es obligatorio.

**No preguntes constantemente por pequeñas decisiones internas.** Si la información existe, léela; si una decisión de negocio/contrato está abierta, deja bloqueada solo esa integración y avanza con partes seguras.

## 6. Regla técnica fundamental: NO COPIAR HTML COMO REACT MONOLÍTICO

**Prohibido:** convertir `mk_003_s01.html` a un único `MK003S01.tsx` de cientos de líneas que contiene estilos, datos, validaciones, navegación y HTTP.

**Obligatorio:** detectar patrones, usar Mantine, separar responsabilidades y reutilizar componentes reales.

```text
Página React
   ↓
Componentes visuales
   ↓
Hook / controlador de UI
   ↓
Servicio / interfaz de repositorio
   ↓
Adapter Mock   o   Adapter HTTP
```

**Ejemplo correcto:** `features/catalog/pages/ProductsPage.tsx` reutiliza `PageHeader`, filtros, `DataTable` y servicios. Los componentes no conocen URLs, bearer tokens, retries HTTP ni formato crudo de respuesta.

**Ejemplo incorrecto:** un componente contiene `fetch('/api/v1/...')`, un array de productos de 100 elementos y reglas de reserva de stock.

**No crees componentes compartidos por anticipación.** `Button`, `TextInput`, `Modal`, `Table`, etc. provienen de Mantine si satisfacen el patrón aprobado. Un componente propio `shared/` se justifica por uso transversal real.

## 7. Implementación de Mantine y `DESIGN.md`

1. **Lee la tabla real de tokens** antes de escribir theme.
2. Usa los **HEX exactos** definidos por Docs; no colores "parecidos" de Mantine ni paletas elegidas a ojo.
3. Centraliza mapping de colores, tipografía, espaciado, radios, tamaños, focus y defaults en `src/theme/`.
4. No pongas colores HEX locales en componentes si ya existe token.
5. Respeta tipografía Inter/Oswald según roles definidos en Docs; no sustituir encabezados por fuentes del navegador por gusto.
6. Usa el set de iconos **Tabler Icons**, con tamaños/stroke/`currentColor` normativos.
7. Un `StatusBadge` solo debe colorearse cuando el color expresa el estado semántico autorizado; **no uses badges multicolor para categorías**.
8. Respeta foco según `color/focus/default`; no confundas focus con primary naranja.
9. No extiendas el Design System porque una pantalla parezca difícil: propone una mejora documentada si realmente falta un patrón.
10. Para Foundation v1 implementa **solo** los patrones que necesita el piloto y que ofrecen reutilización real.

**Si encuentras una desviación en un HTML:** anota `MK-XXX-SXX, elemento, regla DESIGN.md, corrección aplicada en React`. No reescribas automáticamente ese HTML en Docs.

## 8. Los mockups NO equivalen a funcionalidades finalizadas

Antes de implementar un MK:

- Identifica todos los archivos `mk_xxx_s*.html` realmente presentes; cuenta pantallas solo después de inspeccionar IDs/variantes.
- Comprueba `component-spec.md`, `tasks.md` y `validation-report.md` **si existe**.
- Si el reporte marca `PENDIENTE`, **no escribas "aprobado"**.
- Puedes trabajar una UI **provisional** con fuentes suficientes y fixtures, pero declara el estado real: `UI_PROVISIONAL` o `MOCK_INTEGRATED`; no `VALIDATED`.
- Si falta un flujo o dato esencial, no lo inventes: informa el bloqueo particular.
- El entorno `../docs/ux/mockups/prototipo/` es de validación académica, **no** una app productiva que debas copiar/usar como base sin inspección.
- La convención de rutas `/MKXXX/SXX` pertenece al entorno de prototipos; **no la conviertas por defecto en rutas productivas**. Si se necesitan rutas de auditoría visual, sepáralas de la navegación real.

## 9. La API es un límite, no una invitación a inventar

**Está prohibido** crear en el frontend:

- endpoints o paths no publicados por su provider;
- payloads/DTO inventados presentados como contratos definitivos;
- scopes/audiences inventados;
- estados de pedido/pago/reserva/entrega inventados;
- mutaciones comerciales que pertenecen a Ventas/Inventario/Promociones;
- reglas de negocio distintas de SPEC/contrato vigente.

**Reglas concretas que no debes romper:**

- `CREADO` **no** significa necesariamente `APTO_PARA_PAGO`.
- `barcode` **no** es necesariamente `sku`.
- `productId` **no** es necesariamente `sku`.
- código externo de tienda **no** es el UUID interno de Inventory.
- disponibilidad comercial **no** equivale a saldo exacto ni garantiza arbitrariamente N unidades.
- cupón válido **no** significa cupón consumido/reservado.
- rechazo de un intento de pago **no** siempre equivale a cancelación terminal.
- Retail/canales no son dueños del saldo; Stock lo gobierna Inventory.
- el navegador no es autoridad para precio final, cupón, pago, stock ni reembolso parcial.

Si un contrato necesario todavía está abierto, define un **modelo de presentación** estable y crea **MockAdapter** con fixtures deterministas. Marca la dependencia `BLOCKED_CONTRACT: <ID o explicación>`. No uses nombres inventados para simular que la API existe.

## 10. Types, servicios, adapters y fixtures

- Define tipos TypeScript explícitos para los modelos que usa la UI.
- No conviertas un DTO API externo en la forma interna de toda la UI.
- Centraliza mapping DTO→modelo de presentación en un adapter/mapper.
- Coloca fixtures en `mocks/` o en la carpeta de feature que corresponda, **no** arrays grandes en JSX.
- Implementa estados `loading`, `empty`, `error`, `success`, `disabled` y `submitting` donde correspondan.
- Simula escenarios relevantes **sin presentar la simulación como backend real**.
- Evita `any` innecesarios, conversiones no verificadas de IDs y aritmética monetaria arbitraria con `float`.
- Configura y utiliza un solo mecanismo de selección mock/API definido en frontend. No agregues flags distintas por cada componente.
- No inventes una capa de abstracción por cada archivo; diseña lo mínimo necesario y reutilizable.

## 11. Qué puede editar el agente

**Permitido si el issue lo requiere:** archivos dentro de `frontend/` necesarios para la tarea, dependencias del frontend, tests y documentación de implementación frontend.

**Solo lectura:** `../docs/` y `../backend/` (salvo petición explícita independiente).

**No hagas sin autorización explícita:**

- `git push`, `git push --force`, borrar ramas, `reset --hard` o `clean -fd`;
- modificar remoto, `.git/config`, secretos o reglas de protección;
- crear o editar SPEC/HU/Flow/DESIGN/OpenAPI/AsyncAPI en Docs;
- refactorizar features ajenas sin necesidad relacionada con el issue;
- crear un monorepo raíz, submódulos o una copia completa de Docs;
- mover MK HTML del repositorio Docs al productivo sin una razón aprobada;
- declarar el frontend desplegado o las APIs integradas sin prueba real;
- asignar decisiones empresariales o ownership entre módulos por cuenta propia.

### Convención de mensajes de commit

Redacta en español la descripción de todos los mensajes de commit nuevos. Se permiten prefijos técnicos de Conventional Commits, por ejemplo: `fix(bulk): corregir estados de consulta`. No reescribas commits ya publicados solo para traducirlos.

Si encuentras una discrepancia en Docs, indica: `Ruta fuente`, `regla observada`, `problema`, `propuesta`, `owner de decisión`. **No la arregles silenciosamente desde este repositorio.**

## 12. Flujo de implementación (sin ensayo/error indiscriminado)

### Paso A — Inspección

Lee issue, archivos reales, dependencias y fuentes. Comprueba si hay código existente, conflictos locales y componentes disponibles. No ejecutes scaffolding antes de inspeccionar.

### Paso B — Clasificación

Separa requisitos en:

- `SAFE_NOW`: se puede implementar ya (UI, theme, mocks, etc.).
- `NEEDS_DECISION`: cambia reglas, diseño normativo o API de otro owner.
- `BLOCKED_DOCS`: fuente imprescindible no disponible.

No bloquees todo por una sola integración P0; trabaja `SAFE_NOW` y reporta lo pendiente.

### Paso C — Plan mínimo comprobable

Para cada modificación define: archivo, intención, fuente normativa y cómo verificarla. Reutiliza código existente. Evita crear 20 archivos vacíos antes de terminar un componente funcional.

### Paso D — Implementación

Trabaja incrementalmente por secciones pequeñas, mantén build ejecutable y no modifiques archivos fuera de scope. No cambies tokens visuales a ojo para "parecerse" a screenshots.

### Paso E — Validación

- Revisa `package.json` para identificar scripts reales.
- Ejecuta TypeScript/build/lint/tests que estén **configurados**, y registra el resultado completo.
- En foundation, si falta un mecanismo básico acordado, configúralo y verifica que realmente funcione.
- Valida visualmente a **1440 px** en browser/captura si el entorno lo permite.
- Revisa controles, focus, navegación por teclado, estados y errores.
- No digas `PASS` si no ejecutaste el comando/inspección correspondiente.

### Paso F — Entrega

Enumera archivos creados/modificados, pantallas, patrones reutilizados, qué es mock, qué es API real, resultados de pruebas, bloqueos y diferencias frente a los documentos normativos. No ocultes lo que no pudiste validar.

## 13. Qué debes hacer específicamente en el issue "Frontend UI Foundation v1"

**Objetivo:** habilitar que otros integrantes implementen features sin reinventar arquitectura, tema o componentes.

**Debes:**

1. Comprobar si Frontend ya tiene proyecto. Si existe, inspeccionarlo y preservarlo.
2. Establecer React + TypeScript y el stack acordado (Vite/Mantine/Tabler si es nuevo).
3. Leer el `DESIGN.md` actual; documentar de qué revisión deriva el theme.
4. Definir `src/theme/` central, sin otro Design System normativo.
5. Crear `AppShell` y navegación básica sin inventar rutas funcionales definitivas no definidas.
6. Crear **solo** patrones shared necesarios para un MK piloto representativo.
7. Crear estructura mínima de feature/hook/service/adapter/mock y demostrar su uso en piloto.
8. Separar estados visuales de estados del backend.
9. Probar funcionalidad visual, build/lint/typecheck y revisar desktop 1440 px.
10. Dejar README actualizado con pasos **reales** de ejecución; pedir revisión técnica independiente.

**No debes:** implementar los 16 MK, inventar contratos de Backend, meter todos los HTML en `src/`, crear 40 componentes hipotéticos, añadir soporte móvil obligatorio ni adjudicarte los MK de otros owners.

**Criterio de cierre de foundation:** otro desarrollador puede crear una nueva feature con tema, layout, componentes, mocks y arquitectura existentes **sin repetir decisiones transversales**.

## 14. Matriz de verificación — marcar solo lo comprobado

Al entregar una feature/PR, rellena:

```text
[ ] Fuentes normativas verificadas (rutas, versión/commit)
[ ] Alcance y pantallas realmente identificados
[ ] Git inicial inspeccionado; cambios previos respetados
[ ] React/TypeScript compila (comando y resultado)
[ ] Build PASS (comando y resultado) / NO CONFIGURADO / NO EJECUTADO
[ ] Lint PASS / NO CONFIGURADO / NO EJECUTADO
[ ] Tests PASS / NO CONFIGURADO / NO EJECUTADO
[ ] Revisión visual desktop 1440 px PASS / NO EJECUTADA
[ ] Estados loading/empty/error verificados cuando aplican
[ ] No hay llamadas HTTP directas desde componentes visuales
[ ] No hay HEX arbitrarios ni variantes cromáticas nuevas
[ ] No se inventaron contratos/estados/scopes
[ ] No se modificaron repos Docs ni Backend
[ ] Dependencias P0 y limitaciones registradas
[ ] Se especificó UI_COMPLETE / MOCK_INTEGRATED / API_INTEGRATED / VALIDATED
```

**Si falta una comprobación, escribe NO EJECUTADO.** No declares éxito por intuición o porque un archivo "se ve bien".

## 15. Formato obligatorio de respuesta final

```text
RESUMEN:
  - Qué quedó hecho y para qué MK/issue.

FUENTES CONSULTADAS:
  - Rutas existentes verificadas; Git SHA de Docs si fue accesible.

ARCHIVOS CREADOS/MODIFICADOS:
  - Ruta: razón concreta de cada cambio.

RESULTADO VISUAL/FUNCIONAL:
  - Pantallas, estados e interacciones verificadas.

INTEGRACIÓN:
  - MOCK_ONLY / API_INTEGRATED / BLOCKED_CONTRACT.
  - Contratos abiertos: IDs + impacto concreto.

VALIDACIONES:
  - Typecheck: comando, resultado o NO EJECUTADO.
  - Build: comando, resultado o NO EJECUTADO.
  - Lint: comando, resultado o NO EJECUTADO.
  - Tests: comando, resultado o NO EJECUTADO.
  - Visual 1440 px: evidencia o NO EJECUTADO.

PENDIENTES Y RIESGOS:
  - Pendientes reales, sin inventar que fueron solucionados.

ESTADO FINAL:
  - UI_COMPLETE / MOCK_INTEGRATED / API_INTEGRATED / VALIDATED / PARCIAL.
```

## 16. Ejemplos de malas decisiones (NO HACER)

| Mala decisión del agente | Conducta correcta |
|---|---|
| "La carpeta Docs está en `.gitignore`, así que no puedo leerla." | Es carpeta hermana; comprobar `../docs`, permisos y workspace. |
| "No hay `package.json`, pero ejecutaré `npm run dev` y diré que funciona." | Verificar y, si es issue de foundation, inicializar antes de ejecutar. |
| "El HTML tiene badges morados/rosados; los copiaré." | Usar únicamente tokens/semántica de `DESIGN.md`. |
| "`CREADO` es un estado, por tanto habilito pago." | Estado de readiness debe provenir de contrato confirmado; si está abierto, mock tipado sin afirmar API. |
| "No aparece endpoint para X, crearé `/api/v1/x/confirmar`." | No inventar rutas; reportar bloqueo contractual. |
| "El mockup ya tiene 5 HTML, así que está aprobado." | Leer validation-report; existencia no equivale a aprobación. |
| "`MK-003` y `MK-004` necesitan botones distintos." | Reutilizar patrones del Design System y components existentes. |
| "No ejecuté tests, pero los marcaré PASS." | Marcar `NO EJECUTADO`. |
| "Voy a editar `../docs/ux/mockups/DESIGN.md` desde Frontend." | Proponer cambio al owner Docs; no modificarlo sin encargo explícito. |
| "Haré una app mobile-first porque es estándar." | Respetar Web Desktop 1440 px vigente; ampliación solo por acuerdo. |

---

**Mandato final:** no improvisar contratos ni decisiones de negocio. Usa fuentes verificadas, adapta código a la arquitectura real, entrega cambios pequeños comprobables y declara con precisión qué quedó implementado, simulado, bloqueado o sin probar.
