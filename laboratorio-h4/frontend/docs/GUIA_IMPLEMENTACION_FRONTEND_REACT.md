# Guía de implementación Frontend React — Productos y Ofertas

> **Ubicación de destino:** `frontend/docs/GUIA_IMPLEMENTACION_FRONTEND_REACT.md`  
> **Contexto histórico:** esta guía nació como plan de ejecución de una futura aplicación. Las referencias a una inicialización pendiente, a un stack objetivo y a la revisión de Foundation describen esos momentos; no describen por sí solas el estado actual del repositorio.
> **Estado vigente:** Frontend ya contiene una aplicación React. Esta guía mantiene instrucciones de implementación; para el estado actual de rutas y capacidades, consulta [README.md](../README.md), [AGENTS.md](../AGENTS.md) y `package.json`. Las instrucciones de trabajo vigentes se encuentran en `AGENTS.md`; esta guía las complementa.
> **Ámbito:** Frontend de **Productos y Ofertas** del proyecto Taller de Construcción de Software Web.  
> **Stack:** consulta `package.json` para las versiones instaladas; la lista de esta guía expresa las tecnologías usadas, no versiones objetivo.
> **Alcance UX vigente:** **Web Desktop**, revisión de referencia a **1440 px**. No exigir variantes mobile/tablet sin decisión expresa.

> **Inventario y evidencia:** consultar [COMPONENTES_FOUNDATION.md](COMPONENTES_FOUNDATION.md) para las APIs y rutas reales de la base y [VALIDACION_FOUNDATION.md](VALIDACION_FOUNDATION.md) para resultados de su revisión. Los ejemplos/estructuras objetivo de esta guía no implican que todos los MK estén implementados.

> **Antecedente de revisión de Foundation:** en aquella revisión se consultó DESIGN 1.1.0 de Docs `master` en `be5c2db16aca6d6d18b3005a2da4205f724038e3`; la base auditada de Frontend fue `ceee9d2`. Estos SHAs y el resultado de esa revisión son contexto histórico, no referencias automáticas a HEAD o a la última versión normativa. El shell, la navegación y los registros de rutas de producto/demostración viven en módulos separados de `src/app/`; la aprobación de correcciones requiere revisión humana independiente.

---

## 0. Cómo se usa este documento

Esta guía describe **cómo ejecutar** la implementación. No sustituye:

- `frontend/AGENTS.md`: instrucciones obligatorias y restricciones para los agentes.
- `frontend/README.md`: propósito, organización y operación del repositorio.
- `docs/ux/mockups/DESIGN.md`: norma visual oficial del módulo.
- SPEC, HU, Flow, contratos HTTP y decisiones UX aprobadas en Docs.

**Orden de trabajo:** `AGENTS.md` → `README.md` → issue → fuentes de Docs → inventario/plan breve → cambios pequeños → pruebas → reporte.

**Regla de oro:** un HTML es una referencia de pantalla, **no código productivo ni autoridad para crear reglas de negocio**. React debe expresar la UX aprobada y el `DESIGN.md` vigente, no repetir errores visuales del HTML.

**Regla de independencia:** una pantalla puede estar `MOCK_INTEGRATED` y ser útil para desarrollo/demostración sin afirmar que ya funciona con microservicios reales.

---

## 1. Organización de los tres repositorios

El workspace local esperado es:

```text
G6-Productos-Ofertas/                # Carpeta contenedora; NO crear aquí otro .git
├── frontend/                  # Repositorio independiente
│   ├── .git/
│   ├── README.md
│   ├── AGENTS.md
│   ├── docs/
│   │   └── GUIA_IMPLEMENTACION_FRONTEND_REACT.md
│   └── src/                   # Aplicación React/TypeScript
├── backend/                   # Repositorio independiente
│   └── .git/
└── docs/                      # Repositorio independiente
    ├── .git/
    ├── ux/
    ├── requisitos/
    ├── contratos/
    └── arquitectura/
```

### 1.1 Lo que Git hace y no hace

- El `.gitignore` de `frontend/` **no necesita** listar `docs/` ni `backend/`, porque están **fuera** de su árbol de trabajo.
- `git status` desde `frontend/` no rastrea los archivos de sus carpetas hermanas.
- `../docs/` **sí puede leerse** localmente si el entorno y los permisos del agente lo permiten. `gitignore` no impide lecturas.
- No crear un monorepo en la carpeta padre; no copiar Docs a Frontend; no crear submódulos Git salvo una decisión explícita posterior.
- Las tareas Frontend **no editan** `../docs/` ni `../backend/` sin encargo separado.

### 1.2 Comprobación obligatoria en Windows PowerShell

Ejecutar desde la raíz real de `frontend/`, **antes de modificar archivos**:

```powershell
Get-Location
git rev-parse --show-toplevel
git status --short
Test-Path .\AGENTS.md
Test-Path .\README.md
Test-Path .\docs\GUIA_IMPLEMENTACION_FRONTEND_REACT.md
Test-Path ..\docs\ux\mockups\DESIGN.md
Test-Path ..\docs\ux\mockups\ux\ux-guidelines.md
```

Si `../docs` no existe: comprobar directorio actual y permisos; si el agente solo tiene checkout de Frontend, habilitar otro checkout de Docs de solo lectura o consultar el repositorio autorizado. **No adivinar el contenido de los archivos ausentes.**

### 1.3 Referencia documental oficial

- Repositorio: <https://github.com/Taller-SW-Web/G6-Productos-Ofertas-docs>
- Rama documental habitual: `master`; comprobar SHA actual cuando se consume una fuente.
- Design System: `../docs/ux/mockups/DESIGN.md`
- UX transversal: `../docs/ux/mockups/ux/`
- MK: `../docs/ux/mockups/MK-XXX/`
- Requisitos: `../docs/requisitos/`
- OpenAPI del módulo: `../docs/contratos/http/openapi.yaml`
- AsyncAPI del módulo: `../docs/contratos/eventos/asyncapi.yaml`

> **Atención:** `../docs/ux/wireframes/DESIGN.md` pertenece a **baja fidelidad**. No utilizarlo para el theme del frontend final.

---

## 2. Qué fuente manda para cada clase de decisión

**No aplicar una jerarquía única indiscriminada.** Cada fuente gobierna su dominio.

| Pregunta | Fuente competente | Regla para el agente |
|---|---|---|
| ¿Qué debe hacer el negocio? | SPEC, HU, Flow y acuerdos funcionales vigentes | No deducir reglas desde un color o botón HTML. |
| ¿Qué pantalla, acción y navegación existen? | `component-spec.md`, Flow, decisiones UX y mockup | Revisar todos los estados y pantallas asociados. |
| ¿Qué color, fuente, espaciado, estado visual o componente corresponde? | `DESIGN.md`, UX Guidelines y UX Decisions | Los defectos visuales del HTML **no se copian**. |
| ¿Qué entrada/salida acepta un servicio? | OpenAPI/AsyncAPI del **provider** | El frontend no inventa endpoints, DTO, scopes ni estados backend. |
| ¿Cómo se organiza React? | `AGENTS.md`, esta guía y arquitectura aprobada en Frontend | No introducir frameworks/capas arbitrarias. |
| ¿Quién aprueba o corrige? | Issue, owners y `EQUIPO_Y_RESPONSABILIDADES.md` | Un agente no asigna ownership ajeno. |

### 2.1 Resolución de conflictos

1. **HTML vs `DESIGN.md` (solo apariencia):** aplicar `DESIGN.md` en React, registrar diferencia (`MK`, pantalla, elemento, regla, cambio) y continuar si el flujo está claro.
2. **HTML vs SPEC/HU/Flow (comportamiento):** registrar la contradicción; implementar únicamente la parte inequívoca. No inventar la regla faltante.
3. **Guía de mockups vs guía de frontend:** la primera gobierna la validación documental del mockup; esta guía gobierna la implementación productiva. No tratar una ruta académica `/MKXXX/SXX` como ruta productiva obligatoria.
4. **Narrativa vs contrato API:** localizar el contrato ejecutable vigente del provider, documentar drift y no crear una tercera versión en Frontend.
5. **Contrato abierto o P0:** aislarlo detrás de un servicio/interfaz + mock tipado; declarar el bloqueo de integración, no fingir que está resuelto.
6. **Falta fuente imprescindible:** marcar `BLOCKED_DOCS` para esa parte. Se permite avanzar en tareas independientes que sí estén especificadas.

---

## 3. Alcances diferenciados: Foundation, UI, mock y API

### 3.1 Foundation v1

Entrega común y transversal, bajo la coordinación de UI/UX y con **revisión técnica independiente**. No incluye los 16 MK.

**Mínimos:**

- React + TypeScript y Vite configurados, con scripts reales.
- Mantine y Tabler Icons configurados.
- Theme/tokens trazables a `DESIGN.md` (incluidos estados y foco).
- Providers, AppShell, navegación base y layout desktop.
- Componentes visuales compartidos **solo si los consume el piloto**.
- Una feature piloto con interfaces/adapters mocks y estados verificables.
- Documentación de arranque y validaciones ejecutadas.

### 3.2 UI por MK

Transforma las pantallas seleccionadas del mockup en componentes React con estructura, acciones locales, navegación, estilos y estados de UI. **No significa API real**.

### 3.3 Mock integrated

La UI accede a un servicio con interfaces tipadas y un adapter mock; permite flujo funcional local y pruebas deterministas sin backend.

### 3.4 API integrated

Se implementa únicamente cuando el provider publicó y validó el contrato pertinente y están claros autenticación, autorización, errores, estados e idempotencia aplicables.

### 3.5 Validated

No basta con compilar. Requiere evidencia verificable de visual, estado/flujo, build, pruebas relevantes y, si existe integración real, contrato ejecutado.

| Estado | Qué se puede afirmar | Qué **NO** se puede afirmar |
|---|---|---|
| `UI_PROVISIONAL` | Existe estructura visual aún sujeta a validación de mockup. | Que está aprobada por UX. |
| `UI_COMPLETE` | La interfaz y sus interacciones locales fueron verificadas. | Que usa el backend real. |
| `MOCK_INTEGRATED` | La UI consume mocks a través de interfaces/adapters. | Que la API existe o está aprobada. |
| `API_INTEGRATED` | Se conecta al provider publicado. | Que pasó todas las pruebas. |
| `VALIDATED` | Los criterios pertinentes fueron realmente comprobados. | Que contratos ajenos futuros no cambiarán. |
| `BLOCKED_CONTRACT` | Integración concreta detenida por una decisión/contrato. | Que toda la UI está bloqueada. |

---

## 4. Readiness de cada MK: no exigir que todo esté perfecto

La presencia de archivos `.html` **no equivale a aprobación**, y una discrepancia de margen tampoco obliga a detener toda una feature.

Antes de implementar, inspeccionar `component-spec.md`, `plan.md`, `tasks.md`, los HTML reales y `validation-report.md` **si existe**.

| Clasificación de trabajo | Condición verificable | Qué se permite |
|---|---|---|
| `GREEN` | Pantallas y flujo necesarios definidos; validación UX aprobada o evidencia equivalente confirmada. | Implementación React normal; API según contrato. |
| `YELLOW` | Pantallas/flujo claros, pero hay defectos visuales menores frente a `DESIGN.md`. | Implementar React conforme a `DESIGN.md`; registrar diferencias. |
| `ORANGE` | Parte del flujo está definida, pero faltan pantallas/estados o existen problemas estructurales importantes. | Implementar solo segmentos claros; identificar el bloqueo real y no declarar feature completa. |
| `RED` | Falta información funcional esencial o hay contradicción que impide definir el comportamiento principal. | No inventar la feature; sí crear patrones shared independientes. |

**Estas etiquetas son una política de planificación de Frontend, no reemplazan las aprobaciones oficiales del pipeline UX**. Si `validation-report.md` dice `PENDIENTE`, no declararlo `APROBADO` por usar `YELLOW`.

### 4.1 Qué se corrige directamente en React

Si `DESIGN.md` establece claramente la solución: token, tipo/tamaño de fuente, separación, focus, radios, color semántico, icono, bordes y márgenes. Registrar desviaciones relevantes en la PR. **No editar automáticamente el HTML original en Docs**.

### 4.2 Qué requiere resolver primero el mockup o la especificación

- Pantalla requerida inexistente o incompleta.
- Acción sin destino/resultado definido.
- Campos o validaciones empresariales contradictorias.
- Cambio de navegación o flujo material.
- Responsive estructural que exige rediseñar una pantalla dentro del alcance oficial.
- Datos que no pueden existir en el contrato previsto y determinan la funcionalidad principal.

### 4.3 Registro mínimo de readiness

```text
MK: MK-0XX
PANTALLAS VERIFICADAS: MK-0XX-S01, S02, ...
HTML ENCONTRADOS: <lista real>
VALIDATION-REPORT: APROBADO / PENDIENTE / NO EXISTE
DESIGN: CONFORME / DIFERENCIAS MENORES / PROBLEMAS MAYORES
FLUJO: COMPLETO / PARCIAL / CONTRADICTORIO
CLASE FRONTEND: GREEN / YELLOW / ORANGE / RED
IMPLEMENTABLE AHORA: <pantallas/partes concretas>
BLOQUEOS: <rutas, decisiones, IDs>
```

---

## 5. Arquitectura mínima: organización por feature, no por MK aislado

La estructura propuesta es **orientativa**, y debe adaptarse a código real existente sin rehacerlo innecesariamente:

```text
frontend/
├── AGENTS.md
├── README.md
├── docs/
│   └── GUIA_IMPLEMENTACION_FRONTEND_REACT.md
├── src/
│   ├── app/
│   │   ├── providers/
│   │   ├── layout/
│   │   └── router/
│   ├── theme/
│   │   ├── theme.ts
│   │   ├── tokens.ts
│   │   └── component-defaults.ts
│   ├── components/shared/
│   ├── features/
│   │   ├── bulk/              # MK-001
│   │   ├── combos/            # MK-002
│   │   ├── catalog/           # MK-003, MK-004
│   │   ├── promotions/        # MK-005, MK-006, MK-007
│   │   ├── taxonomy/          # MK-008 ... MK-012
│   │   ├── pricing/           # MK-013
│   │   ├── price-audit/       # MK-014
│   │   └── inventory/         # MK-015, MK-016
│   ├── services/              # Servicios realmente compartidos
│   ├── adapters/              # Adapters realmente compartidos
│   ├── mocks/                 # Fixtures comunes si se justifican
│   ├── types/                 # Tipos globales mínimos
│   └── utils/
└── package.json
```

Una feature puede incluir `pages/`, `components/`, `hooks/`, `services/`, `adapters/`, `mocks/`, `types/` y `tests/` **cuando los use**. No crear carpetas vacías para cumplir un dibujo.

### 5.1 Fronteras obligatorias

```text
Página / componente de presentación
    ↓
Hook o controlador de interacción
    ↓
Servicio o caso de uso de Frontend
    ↓
Interfaz (puerto / repositorio)
    ↓
Adapter mock   |   Adapter HTTP (si existe contrato real)
```

- No hacer `fetch()` ni administrar bearer tokens dentro de páginas/componentes.
- No mezclar un fixture grande con JSX.
- No meter estados de negocio autoritativos en el theme ni componentes `shared`.
- No crear un servicio global gigante para todos los microservicios.
- No duplicar la misma consulta/transformación en múltiples pantallas.
- Mantener `productId`, `sku`, `barcode`, `orderId` y `locationRef` como identidades diferenciadas.

### 5.2 Cuándo crear un componente compartido

**Primero:** buscar si Mantine o el proyecto ya lo resuelven. **Después:** crear wrapper/patrón propio solo si añade semántica, composición o reutilización verificable.

Ejemplos válidos según necesidad del piloto: `PageHeader`, `FilterBar`, `EntityTable`, `StatusBadge`, `ConfirmDialog`, `EmptyState`.

No crear sin necesidad `CustomButton`, `CustomTextInput`, `CustomModal` que únicamente repitan la API de Mantine. No mover un componente muy específico de Inventory a `shared/` solo porque parece reusable.

---

## 6. Implementación del Design System con Mantine

`DESIGN.md` sigue siendo la **única fuente visual normativa**, y React materializa esos valores. No crear un `DESIGN_REACT.md` independiente con decisiones de color contradictorias.

### 6.1 Leer antes de escribir

Inspeccionar en el `DESIGN.md` real:

1. Tokens de superficie, texto, borde y acento.
2. Semántica y austeridad cromática.
3. Familias Inter y Oswald, pesos, tamaños y roles.
4. Espaciados y alturas de control.
5. Radios, bordes, estados hover/disabled y foco.
6. Elevación, overlays y componentes de navegación.
7. Iconografía Tabler y criterios de accesibilidad.
8. Patrones de tabla, filtros, formularios, modales y estados.

**No sustituir los HEX oficiales por tonos “equivalentes” de Mantine.** Tampoco asignar colores diferentes a categorías, módulos, cards, KPIs o iconos decorativos.

### 6.2 Correspondencia visual

Una tabla interna de implementación puede relacionar:

| Fuente normativa | Materialización en React |
|---|---|
| `color/surface/*` | Valores tipados y variables CSS del theme. |
| `color/text/*` | Text, headings y componentes con tokens semánticos. |
| `color/focus/default` | Focus ring accesible, **no** primary naranja. |
| Tipografía Inter / Oswald | `fontFamily`, estilos de headings y carga local/autorizada. |
| Escala de spacing/radius | Tokens semánticos + defaults de Mantine. |
| DS-CXX, cuando exista patrón | Componentes Mantine o composición shared validada. |
| Estados disabled/error/success | Semántica explícita; no colorear superficies enteras por decoración. |

Los valores concretos se toman del documento vigente **al implementar**, no se duplican aquí para evitar mantener dos paletas.

### 6.3 Verificación visual obligatoria

Comparar **React renderizado vs criterio oficial** a 1440 px, revisando:

- jerarquía tipográfica (incluida carga de fuentes);
- margen externo, spacing entre bloques y densidad;
- altura y tamaño de botones/inputs;
- tablas, badges, headers, acciones y menús;
- foco por teclado, contraste y elementos deshabilitados;
- desbordes, solapamientos, recortes y modales;
- estados empty/loading/error;
- comportamiento de navegación y overlays.

No basta con que la UI “se vea parecida”. Las desviaciones se anotan por pantalla y regla aplicable.

---

## 7. Mocks tipados sin inventar contratos

Cuando la API no exista o tenga una discrepancia pendiente, el Frontend debe poder funcionar con un **puerto estable de UI** sin declarar un DTO backend falso.

Ejemplo **ilustrativo** de modelo frontend para una tabla de catálogo (no es un DTO oficial de OpenAPI):

```ts
// Modelo de presentación, NO contrato del backend.
export interface ProductListItem {
  id: string;
  name: string;
  skuCount: number;
  displayStatus: 'active' | 'inactive';
}

export interface ProductCatalogPort {
  list(): Promise<ProductListItem[]>;
}

// Adapter exclusivamente local de demostración.
export class MockProductCatalogAdapter implements ProductCatalogPort {
  async list(): Promise<ProductListItem[]> {
    return [
      { id: 'fixture-1', name: 'Producto de demostración', skuCount: 2, displayStatus: 'active' },
    ];
  }
}
```

**Importante:** el `id` de fixture no pretende ser el formato oficial de Productos. Cuando se implemente un adapter HTTP, este **debe obtenerse del OpenAPI vigente** y mapear su respuesta al modelo de presentación. No inventar URLs ni estructuras de API para completar el ejemplo.

### 7.1 Reglas sobre fixtures

- Fuera del JSX, preferiblemente por feature.
- Deterministas: mismo estado → mismos datos esperados.
- No incluir secretos, datos de clientes reales ni credenciales.
- Cubrir `default`, `loading`, `empty`, `error` y otros estados previstos.
- Distinguir una simulación de pago/stock/precio de una operación real.
- Si una API carece de contrato confirmado, usar nombres **de dominio de UI**, no nombres presentados como DTO oficial.
- No añadir un nuevo selector de mocks en cada pantalla; reutilizar la configuración de la foundation si existe.

### 7.2 Estados de interfaz

Una pantalla con datos normalmente necesita:

```text
IDLE / INITIAL
  ├── LOADING
  ├── SUCCESS + DATA
  ├── EMPTY
  └── ERROR + RETRY (si aplica)
```

Y un formulario, cuando corresponda:

```text
READY -> VALIDATING -> SUBMITTING -> SUCCESS / VALIDATION_ERROR / ERROR
```

No confundir esos estados locales con estados backend (`CREADO`, `PAGADO`, `RESERVA_EXPIRADA`, etc.).

---

## 8. Contratos P0: límites de lo que puede decidir Frontend

Hasta que se cierre cada discrepancia aplicable, la UI puede construirse con mocks **pero la integración real queda bloqueada**.

| Contexto | No asumir ni hardcodear | Comportamiento seguro de Frontend |
|---|---|---|
| Checkout/pago | `CREADO` = listo para pagar. | Usar una condición de presentación `paymentReady` alimentada por adapter confirmado o mock marcado. |
| Inventario | `DISPONIBLE` asegura cualquier cantidad solicitada. | Consultar la capacidad cuantitativa **solo cuando esté publicada**; mientras tanto mock. |
| Cupón | Validación = consumo/aseguramiento definitivo. | Separar validación visual del resultado transaccional. |
| Pago rechazado | Un intento fallido = anulación terminal. | Presentar intentos/errores según contrato definitivo. |
| Identificación | `barcode === sku`, `productId === sku`. | Mantener tipos y campos conceptualmente distintos. |
| Tienda | Store code = UUID interno de Inventory. | Usar referencia externa contratada. |
| Stock | Retail/canal consume/libera/reintegra inventario. | El Frontend solicita operaciones propias del provider autorizado, no mutaciones de stock. |
| Total/precios | El navegador calcula el monto final autoritativo. | Mostrar snapshot del owner comercial; cálculos locales solo ilustrativos si son mocks. |
| Pickup/offline | Estados/rutas inventados para completar demo. | UI de flujo provisional con contrato P0 registrado. |
| Reembolso parcial | Frontend prorratea descuentos según criterio propio. | Mostrar monto/resultados provistos por el backend cuando el contrato exista. |

**No se debe bloquear todo React por estos P0.** La dependencia bloquea **solo** la integración específica y los comportamientos que no pueden definirse con seguridad.

Ejemplo de registro:

```text
MK: MK-015
PANTALLA: MK-015-S01
ENTREGA: MOCK_INTEGRATED
API REAL: BLOCKED_CONTRACT
MOTIVO: Falta contrato acordado para cantidad comercial/origen de stock
SIMULACIÓN: Sí, fixture determinista (no API real)
```

Los códigos de discrepancia (`F-P0-*`, `X-P0-*`) son IDs de coordinación usados en la matriz de auditoría; **verificar vigencia/estado en el seguimiento actual**, no tratarlos como identificadores oficiales de OpenAPI.

---

## 9. Procedimiento A: implementar Frontend UI Foundation v1

Esta fase es transversal. El responsable UI/UX puede ser Vera, con revisión técnica separada; **no sustituye el ownership de las features**.

### A0. Entrada y comprobación

- [ ] Leer `AGENTS.md`, `README.md`, esta guía y el issue de Foundation.
- [ ] Confirmar raíz de Frontend y `git status`.
- [ ] Leer `../docs/ux/mockups/DESIGN.md`, UX Guidelines y UX Decisions.
- [ ] Inspeccionar `package.json`, `src/`, theme y componentes existentes **si están presentes**.
- [ ] Identificar un MK piloto representativo **aprobado en el issue**; no elegirlo unilateralmente si la decisión es externa.
- [ ] Registrar ausencia o bloqueo de fuentes, sin inventarlas.

### A1. Plan breve, sin cambios todavía

Entregar un inventario inicial que identifique:

1. Archivos actuales reales de Frontend.
2. Stack/dependencias instaladas o pendientes.
3. Fuentes Docs realmente leídas (rutas y SHA, si disponible).
4. Mapeo del Design System a theme y defaults.
5. Componentes shared que el piloto necesitará.
6. Rutas y estados de la feature piloto.
7. Estructura mínima de services/adapters/mocks.
8. Archivos previstos para crear/modificar.
9. Qué **no** se implementará en Foundation.

### A2. Inicialización mínima

- Si **no** existe aplicación, crear la base React/TypeScript con Vite conforme al issue.
- Si **ya** existe, inspeccionarla y evolucionarla; no recrearla ni destruir archivos.
- Elegir y documentar un gestor de paquetes; no mezclar lockfiles.
- Configurar Mantine y Tabler Icons según versiones instaladas/compatibles; no asumir APIs de versión futura.
- Crear providers/layout/routing suficientes para el piloto, sin levantar una arquitectura especulativa.

### A3. Theme y patrones comunes

- Centralizar tokens sin cambiar su significado.
- Configurar tipografía, focus, estados y componentes de base.
- Implementar AppShell, navegación y solo los componentes shared que realmente usa el piloto.
- Comprobar a 1440 px y teclado.

### A4. Piloto

- Implementar las pantallas piloto con adapters mock.
- Demostrar cómo otro MK reutilizaría theme, AppShell, filtros, tabla/modal u otros patrones implementados.
- No copiar el HTML a un único componente monolítico.
- Registrar divergencias visuales originales del HTML.

### A5. Gate de cierre Foundation

- [ ] El proyecto inicia usando comandos **reales** documentados en `package.json`.
- [ ] `typecheck`/`build`/`lint`/tests disponibles se ejecutaron y reportaron con resultado real.
- [ ] Theme deriva del `DESIGN.md` vigente y no existen HEX arbitrarios.
- [ ] Piloto muestra estados principales sin backend obligatorio.
- [ ] Otra feature puede empezar sin redefinir fonts, botones, layout o acceso a mocks.
- [ ] Reviewer técnico independiente inspeccionó la PR.
- [ ] README refleja únicamente comandos/configuración que existen.

**No cerrar como `VALIDATED` si únicamente se escribió código.**

---

## 10. Procedimiento B: implementar un MK específico

Ejecutar el ciclo **por funcionalidad**; no convertir todas las pantallas HTML en lote sin análisis.

### B0. Inspección de entradas

1. Verificar raíz Frontend, rama y estado Git.
2. Leer `AGENTS.md`, `README.md`, issue y esta guía.
3. Buscar la SPEC/HU/FLOW que corresponde al ID MK; **no inventar sufijos de filenames**.
4. Leer UX Guidelines, UX Decisions, `DESIGN.md` y `MK-XXX/component-spec.md`.
5. Leer `plan.md` y `tasks.md` como contexto documental; son del pipeline de mockups, no instrucciones para reemplazar arquitectura React.
6. Comprobar `validation-report.md`, si existe, y anotar su estado real.
7. Inspeccionar **todos** los HTML del MK; distinguir SXX de variantes (`_b`, `_p`, `_r`, etc.) por su función real.
8. Inspeccionar componentes/feature ya implementados antes de crear archivos.
9. Identificar dependencias API P0 y estado de acceso a Docs.

### B1. Inventario de pantallas y componentes

Construir antes de editar:

| Pantalla | Propósito | Componentes reutilizables | Componentes específicos | Estados | Ruta de UI propuesta | Fuente |
|---|---|---|---|---|---|---|
| `MK-XXX-S01` | Describir desde la fuente real | Lo comprobado en código | Solo lo necesario | Default/loading/empty/error según spec | Definir con router actual | Archivo real |

La ruta académica `/MKXXX/SXX` **no obliga** a usarla en el producto. Si el equipo necesita deep links para revisión, implementarlos explícitamente como rutas de QA separadas, sin sustituir la navegación real.

### B2. Diseño técnico mínimo

Definir:

- feature de destino por dominio, no carpeta de código por MK a ciegas;
- páginas que se implementarán;
- modelos de presentación, no DTO inventados;
- servicios y puertos necesarios;
- fixtures y estados de UI;
- componentes `shared` existentes y nuevos justificados;
- acciones locales simuladas y bloqueos externos;
- archivos que se crearán/modificarán.

No inventar componentes, rutas o capas para hipotéticas features futuras.

### B3. Implementación por pantalla

Orden recomendado:

1. Layout y composición.
2. Componentes compartidos existentes.
3. Componentes específicos de la feature.
4. Types y estados locales.
5. Hook/servicio y MockAdapter.
6. Interacciones del flujo (filtros, modales, confirmaciones, navegación).
7. Loading/empty/error/disabled/submitting según correspondan.
8. Keyboard/focus y respuesta visual desktop.
9. Revisión contra `DESIGN.md`, no simple copia de HTML.

Hacer cambios pequeños; validar antes de abrir la siguiente pantalla.

### B4. Comprobación de comportamiento

Verificar cada acción visible:

| Elemento | Prueba requerida |
|---|---|
| Botón | Hace la acción declarada, está disabled cuando procede, no es decorativo con click falso. |
| Filtro/búsqueda | Cambia el resultado mock visible o su estado, según intención UX. |
| Tabla | Renderiza datos, empty/loading/error, paginación/orden si están especificados. |
| Formulario | Valida campos locales, muestra errores y resultado de envío simulado. |
| Modal/Drawer | Abre/cierra, conserva foco y comportamiento de cancelar/confirmar. |
| Navegación | Llega a la vista prevista sin inventar rutas productivas. |
| Badge/alerta | Expresa solo semántica permitida por DS y estado documentado. |

**No declarar una acción funcional por estar dibujada.**

### B5. Validación y reporte

- Revisar contra criterios de UX a 1440 px.
- Ejecutar los scripts que existan (no inventarlos).
- Registrar P0, diferencias visuales y bloqueos.
- Indicar claramente `UI_PROVISIONAL`, `UI_COMPLETE`, `MOCK_INTEGRATED`, etc.
- Relacionar la PR con `MK-XXX-SXX` concretos.

---

## 11. Procedimiento C: reemplazar un mock por API real

**Condición de entrada:** provider identificable; contrato aprobado y accesible; scope/audience/permisos conocidos; decisiones P0 pertinentes resueltas para esa operación. Si faltan, no saltar directamente a integración.

### C1. Revisar el provider

- Leer OpenAPI/AsyncAPI actual del **dueño** del recurso.
- Verificar método, path, headers, autenticación, parámetros, body, respuesta, errores y semántica de reintento.
- Verificar identificadores externos sin convertirlos arbitrariamente (`orderId` no es necesariamente un número).
- Confirmar que el backend correspondiente está disponible en el entorno de integración, si procede.

### C2. Adapter real

- Implementar adapter HTTP en la capa de integración, no en JSX.
- Mapear DTO válido → modelo de UI existente.
- Centralizar manejo de errores y token de acceso; no copiar secretos a Frontend.
- Conservar el MockAdapter para pruebas/demo si está previsto por el proyecto.
- No introducir lógica autoritativa de precios, inventario o pagos en navegador.

### C3. Sustitución controlada

1. Probar adapter aislado contra un fixture válido derivado del contrato.
2. Probar casos 200/2xx, errores de validación, no autorizado, conflicto y backend no disponible según casos pertinentes.
3. Sustituir la configuración mock→API sin reescribir componentes visuales.
4. Comparar estados de UI antes/después.
5. Ejecutar contract/integration tests acordados.
6. Declarar exactamente qué endpoints quedaron integrados y cuáles siguen en mock.

**Prohibido** cambiar silenciosamente el frontend para acomodarse a un backend que viola OpenAPI: registrar discrepancia y corregir con el provider.

---

## 12. Calidad, validaciones y comandos

Antes de ejecutar comandos, **inspeccionar `package.json` y confirmar scripts presentes**. Los siguientes son ejemplos condicionados, no afirmaciones de configuración existente:

```powershell
# Solo si package.json existe y tiene scripts correspondientes
npm run build
npm run lint
npm run typecheck
npm run test
```

Si existe `package-lock.json`, usar preferentemente `npm ci` para instalación reproducible. No mezclar npm/pnpm/yarn sin decisión aprobada.

### 12.1 Matriz de control

| Área | Qué comprobar | Evidencia válida |
|---|---|---|
| Tipos | TypeScript sin errores del trabajo | Comando y salida de typecheck/build. |
| Build | Build de producción | Comando ejecutado y resultado. |
| Lint | Reglas de lint configuradas | Comando ejecutado y resultado. |
| Tests | Unit/component/integration aplicables | Suite y resultado real. |
| Visual | 1440 px; token, spacing, contraste, cortes | Captura o inspección verificable; señalar si no se hizo. |
| Accesibilidad | Teclado, focus, labels, estados y contraste | Caso/screen inspeccionado. |
| UI states | Loading, empty, error, disabled según corresponda | Fixture/ruta/caso reproducible. |
| Mocks | Sin datos ad hoc en JSX ni APIs fingidas | Paths concretos de adapter/fixtures. |
| Contratos | Ningún endpoint/DTO/estado inventado | Referencia verificable al provider o bloqueo declarado. |
| Git | Solo archivos Frontend y cambios previos respetados | `git status`/diff antes y después. |

Los resultados posibles son `PASS`, `FAIL`, `NO CONFIGURADO`, `NO EJECUTADO` y `BLOQUEADO`, según corresponda. **Jamás marcar `PASS` porque “debería funcionar”.**

### 12.2 Definición de terminado por pantalla/MK

Para cerrar un issue de UI:

- [ ] Cada pantalla comprometida está identificada y renderiza.
- [ ] Sus interacciones/estados contratados para la entrega pueden probarse.
- [ ] La implementación respeta `DESIGN.md`; las desviaciones del HTML fueron tratadas explícitamente.
- [ ] Se reutilizaron componentes existentes y no se duplicó Mantine innecesariamente.
- [ ] No hay fetch/HTTP directo en componentes presentacionales.
- [ ] Modelos/fixtures/adapters están aislados.
- [ ] Se ejecutaron y documentaron controles reales (o su imposibilidad).
- [ ] Los bloqueos P0 no se presentan como integraciones completas.
- [ ] Owner/reviewer exigidos por el issue revisaron el resultado.

---

## 13. Formato estándar para la PR y la entrega del agente

Usar este formato y **rellenar solamente información verificada**:

```text
TAREA / ISSUE:
MK / PANTALLAS:
BRANCH FRONTEND:
GIT STATUS INICIAL:
DOCS REF (branch / commit):

FUENTES LEÍDAS:
- <ruta real, no ruta supuesta>

READINESS:
- GREEN / YELLOW / ORANGE / RED
- Validation report: APROBADO / PENDIENTE / NO EXISTE

CAMBIOS REALIZADOS:
- <archivo>: <cambio concreto>

REUTILIZACIÓN:
- <componente del proyecto/Mantine utilizado>

ESTADOS PROBADOS:
- Default:
- Loading:
- Empty:
- Error:
- Otros:

INTEGRACIONES:
- Mock: SÍ / NO
- API real: SÍ / NO
- Contrato provider comprobado: <ruta/ref>
- Bloqueos P0: <ID/explicación o ninguno>

VALIDACIONES:
- Typecheck: PASS / FAIL / NO CONFIGURADO / NO EJECUTADO
- Build: PASS / FAIL / NO CONFIGURADO / NO EJECUTADO
- Lint: PASS / FAIL / NO CONFIGURADO / NO EJECUTADO
- Tests: PASS / FAIL / NO CONFIGURADO / NO EJECUTADO
- Visual desktop 1440 px: PASS / FAIL / NO EJECUTADO

DIFERENCIAS RESPECTO A HTML/DESIGN:
- <MK-SXX, elemento, regla aplicada>

PENDIENTES:
- <lo que queda sin hacer y owner/dependencia>

ESTADO FINAL:
- UI_PROVISIONAL / UI_COMPLETE / MOCK_INTEGRATED /
  API_INTEGRATED / VALIDATED / PARCIAL
```

---

## 14. Decisiones que el agente **NO** puede tomar por su cuenta

Quedan prohibidas, sin una decisión explícita del owner pertinente:

- crear endpoints, scopes, audiences, DTO o estados backend;
- cambiar SPEC/HU/FLOW/OpenAPI/AsyncAPI desde una tarea de frontend;
- reescribir `DESIGN.md` desde Frontend;
- convertir wireframes de baja fidelidad en autoridad visual sobre mockups;
- sustituir automáticamente la UX vigente por el criterio estético del modelo;
- rediseñar pantallas para tablet/mobile por inercia;
- modificar reglas de precio, cupón, reserva, pago, stock o reembolso;
- introducir otro Design System paralelo;
- crear una carpeta `MK-XXX` como dominio separado sin razón técnica;
- implementar los 16 MK dentro del issue de Foundation;
- introducir 30–40 wrappers/shared components hipotéticos;
- crear backend falso, pagar realmente o tocar infraestructura desde un issue de UI;
- modificar `../docs`, `../backend`, remotos Git, secretos o ramas ajenas sin autorización explícita;
- declarar APIs integradas, pruebas aprobadas o mockups aprobados sin evidencia.

**Sí puede** nombrar componentes internos, extraer hooks, refactorizar duplicación de su propia feature y tomar decisiones pequeñas de código que no alteren contratos ni comportamiento observable.

---

## 15. Guía rápida para asignar una feature al agente

Esta instrucción complementa `AGENTS.md`; siempre sustituir los marcadores por valores **reales**:

> Implementa en React la funcionalidad **MK-0XX**, exclusivamente las pantallas **[SXX identificadas]**, dentro de la feature que corresponda según la arquitectura existente.
>
> 1. Verifica la raíz del repositorio Frontend, su Git y los archivos ya existentes.
> 2. Lee por completo `AGENTS.md`, `README.md`, `docs/GUIA_IMPLEMENTACION_FRONTEND_REACT.md` y las fuentes de `../docs/` aplicables.
> 3. Antes de editar, presenta inventario de pantallas, componentes reutilizables, estados, fuentes y archivos propuestos.
> 4. Implementa según `DESIGN.md`; no copies defectos visuales del HTML ni rediseñes UX.
> 5. Usa Mantine/Tabler y patrones compartidos existentes; no construyas un monolito por pantalla.
> 6. Aísla lógica en hooks/services/adapters; usa mocks tipados donde la API esté pendiente y **no inventes contratos**.
> 7. Valida estados UI, teclado, desktop 1440 px, TypeScript, build/lint/tests existentes.
> 8. No modifiques Docs/Backend; no publiques cambios remotos sin autorización.
> 9. Entrega archivos cambiados, pruebas ejecutadas, diferencias del mockup, bloqueos P0 y nivel real de completitud.

Para Foundation, **reemplazar** la frase “implementa MK-0XX” por “implementa Frontend UI Foundation v1 y el piloto indicado por el issue”, siguiendo el **Procedimiento A**.

---

## 16. Fallos frecuentes y respuesta obligatoria

| Error frecuente del agente | Respuesta correcta |
|---|---|
| “No veo `../docs`, así que invento el theme.” | Diagnosticar workspace/permisos; bloquear solo tokens visuales dependientes. |
| “Hay HTML, por tanto el mockup está aprobado.” | Leer `validation-report.md` si existe; registrar estado real. |
| “El HTML tiene un badge fucsia, lo reproduzco en React.” | Contrastar con token/semántica `DESIGN.md`; usar diseño vigente. |
| “Creé 16 componentes completos dentro de Foundation.” | Revertir sobrealcance de forma controlada; solo shared/piloto. |
| “Me falta un endpoint, crearé una ruta temporal `/api/v1/...`.” | Crear mock adapter **sin afirmar contrato** y registrar `BLOCKED_CONTRACT`. |
| “Este botón es solo visual, no hace nada, pero está listo.” | Implementar interacción local o dejar explícitamente pendiente; no declarar funcionalidad. |
| “Voy a calcular descuento final con `number` en UI.” | No usurpar cálculo autoritativo; mostrar snapshot/fixtures. |
| “No tengo scripts; `npm run build` debería pasar.” | Confirmar scripts, ejecutar solo los existentes; declarar NO CONFIGURADO si falta. |
| “Haré la versión mobile porque es best practice.” | Respetar scope Desktop hasta cambio aprobado. |
| “Voy a añadir `../docs` al `.gitignore`.” | No sirve ni hace falta; las carpetas hermanas ya están fuera del Git de Frontend. |

---

## 17. Resultado esperado del proceso

```text
            DOCS (fuente normativa)
           SPEC/HU/FLOW/UX/DESIGN
                       |
              Mockup MK-XXX
                       |
              Verificación readiness
                       |
                  FRONTEND
                       |
          React + TypeScript + Mantine
                       |
             Componentes y UI
                       |
              Modelos de vista
                       |
                Interfaces
                       |
              Services / adapters
                 /           \
           Mock tipado     API confirmada
                 \           /
                 Validación real
                       |
          Evidencia por pantalla/PR
```

El objetivo no es “copiar todos los HTML a React”, sino **construir un frontend consistente, demostrable y desacoplado**, usando el Design System ya existente, permitiendo avance paralelo a la corrección de mockups y a los acuerdos intermodulares.

**Estado de cualquier entrega = lo que fue comprobado, nunca lo que el agente supone.**
