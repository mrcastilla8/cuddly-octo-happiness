# Uso de componentes Foundation

Entrega del encargo de componentes reutilizables, relacionado con issue #1. Incluye el piloto de consulta MK-013-S01 con mocks. La galería de componentes no implementa los flujos comerciales de MK-002/003/006 ni los de escritura/importación de MK-013.

## Fuente y correspondencia

Fuente visual vigente: `ux/mockups/DESIGN.md` **1.1.0**, Docs `master`, SHA `be5c2db16aca6d6d18b3005a2da4205f724038e3`. Se contrastaron además `ux/mockups/ux/ux-guidelines.md`, `ux-decisions.md` 2.0 y el HTML S01 de esa revisión. Las capturas proporcionadas sirven para reconocer composición; la norma vigente gobierna estilo y semántica. El reporte registra las correcciones FND-01–06 sobre el commit entregado `ceee9d2`.

React 19.3.0, Mantine 9.7.1, Vite 8.3.4, React Router 7.18.4 y Tabler 3.49.0, fijados en package/lockfile. Esta versión de Mantine está publicada; no se instaló la 9.6.2 solo por aparecer en una referencia antigua. Se verificaron las APIs de [theme](https://mantine.dev/theming/theme-object/) y [Modal](https://mantine.dev/core/modal/) en la documentación oficial.

| DESIGN.md | Implementación |
|---|---|
| §4.1 colores/roles/alias | `src/theme/tokens.ts`, `semanticTokens`, resolver `--po-*`; aliases comparten el valor documentado |
| §4.2 Inter/Oswald | `theme.ts`, `Title`, fuentes Latin locales; H1–H3 mayúsculas, H4 y modal Inter |
| §4.3–4 radios, spacing y foco | Theme spacing/radius y `global.css`; foco signal de 2 px con offset 2 px |
| §4.5 sombras/overlay/capas | Tokens, defaults Modal/Drawer/Select/Tooltip; sin sombras de cards |
| §5 layout | `src/app/layout/ApplicationShell.tsx`: header 64, sidebar 240, padding 32; rutas y navegación separadas |
| DS-C01–09, C16, C18, C20–21, C24 | Primitivas Mantine configuradas centralmente, sin wrappers que repitan APIs |
| DS-C12–14, C17, C19, C21–22, C25, C28 | Composiciones shared de la tabla siguiente |

Los arrays de colores Mantine tienen diez entradas repetidas del rol documentado. No son escalas nuevas ni autorizan usar `brand.3` como tono distinto. Para estados usar `semanticTokens`/composiciones, para acciones las variantes configuradas. No usar otras paletas automáticas ni HEX locales en features.

DESIGN 1.1.0 §4.1.1: «Activo», «Inactivo», tipo y origen son neutrales por defecto. `success` requiere un resultado semánticamente confirmado; `info` seguimiento/información; `warning` atención o parcial; `error` fallo/acción destructiva; `promotion` contenido promocional con fuente. El componente no deduce semántica desde el enum. La galería de variantes es una muestra explícita, no un mapeo de entidades por color.

## Catálogo compartido

Importar desde `src/components/shared/index.ts`. Todas las composiciones se usan en la galería.

| Componente | API principal | Responsabilidad / muestra |
|---|---|---|
| `PageHeader` | `title`, `description`, `breadcrumbs[{label,to?}]`, `actions` | Jerarquía, retorno y acciones que envuelven; tres páginas |
| `SectionCard` | `title`, `description`, `actions`, `children` | Región con encabezado accesible, sin regla de dominio; formularios/estados |
| `FilterBar` | `children`, `summary`, `applied` | Controles y resumen/aplicados en superficie plana; listado |
| `SearchField` | `label`, `value`, `onChange`, `placeholder` | Campo controlado y limpiar accesible; sin debounce universal |
| `StatusBadge` | `semantic`, `size: sm/md`, `children` | Estado textual neutral/info/success/warning/error/promotion; no mapea enums de negocio |
| `FeedbackAlert` | `semantic`, `title`, `children`, `actions` | Texto e icono persistentes; error usa role alert, otros status |
| `EmptyState` | `title`, `description`, `action` | Ausencia/sin coincidencias según texto aportado; no inventa acciones |
| `EntityTable<T>` | `caption`, `columns`, `rows`, `rowKey`, `state`, `empty`, `pagination?`, `minWidth?` | Tabla semántica, región de desplazamiento etiquetada, estados y rango conocido |
| `ConfirmDialog` | `opened`, `title`, `confirmLabel`, `onCancel`, `onConfirm`, `children`, `submitting`, `error`, `destructive` | Impacto aportado por caller, foco seguro en cancelar, cierre/retorno de foco; formularios/estados |
| `MetricCard` | `label`, `value`, `description` | KPI neutral, sin calcular cantidades/precios; S01 y muestra de resultado S05 |
| `FileSelection` | `label`, `value: File/null`, `onChange`, `description`, `accept?`, `error?`, `disabled?` | Selección nativa con nombre/tamaño real del archivo; no parser, validación ni restricciones inventadas |

`Button`, `TextInput`, `NumberInput`, `Textarea`, `Select`, `MultiSelect`, `Checkbox`, `Radio`, `Drawer`, `Pagination`, `Tooltip` vienen de `@mantine/core`. Ejemplo: `<Button variant="outline">Volver al listado</Button>`. Variante destructiva: `<Button color="danger">Eliminar</Button>` únicamente con una operación autorizada; `ConfirmDialog` la aplica cuando recibe `destructive`.

El tema cubre los controles efectivamente mostrados y Tooltip, utilizado como primitiva opcional de accesibilidad. Tabs, Stepper, FileInput y Radio.Card ahora tienen defaults de Foundation y muestras de uso en Pricing. Fecha/hora se compone con `TextInput type="datetime-local"` etiquetado y zona explícita; el calendario es el nativo del navegador, sin declarar un calendario Mantine personalizado. No se declara un catálogo exhaustivo de los 29 DS-C: Switch, Menu, Toast y otros controles se configurarán al aparecer un uso real.

## Tabla: separación y límites

```tsx
import { EntityTable, type TableColumn } from '../../components/shared';

interface ItemView { id: string; name: string; }
const columns: TableColumn<ItemView>[] = [
  { key: 'name', header: 'Nombre', render: (row) => row.name },
];
// Dentro de una página: items/result/state provienen de su hook.
<EntityTable caption="Listado de ejemplos" columns={columns} rows={items}
  rowKey={(row) => row.id} state={{ status: 'success' }}
  empty={{ title: 'Sin registros', description: 'La consulta no contiene registros.' }} />;
```

`pagination` recibe `page`, `pageSize`, `total`, `onChange`. El caller aporta **las filas de esa página**: la tabla no pagina, ordena ni filtra datos en secreto. Si total no está publicado, omitir esta paginación y diseñar los controles que soporte el provider. Números se alinean con `align: 'right'`; la unidad y ausencia/null se presentan en `render`. Columna identidad recibe ancho restante. No añade selección masiva ni mutaciones por fila.

El hook debe reiniciar página cuando cambian filtros y conservarlos al abrir detalles. La galería demuestra búsqueda/filtros locales sobre todo el fixture, no orden global de una API. Se revisa primero la jerarquía de columnas según §9. Si aún se requiere anchura, la tabla conserva el contenido dentro de una región horizontal etiquetada y operable con teclado: no ensancha la página ni recorta celdas.

`minWidth` permite aportar una anchura mínima de composición. Si se omite, se suman anchos numéricos de columnas y se reserva 160 px por columna flexible como punto de partida; no es una regla de datos. El caller ajusta esos anchos según identidad, cantidades y acciones. Los identificadores envuelven sin ellipsis, los badges largos mantienen su texto y los controles de celda respetan el ancho. La muestra «Ver tabla extensa» y `tests/foundation-review.spec.ts` comprueban SKU sin espacios, contenido largo, números, badges y consulta en la última columna.

## Añadir una feature

1. Leer las fuentes del MK y su alcance antes de decidir datos/acciones.
2. Crear únicamente archivos usados en `src/features/<dominio>/`: página, hook, puerto/service, adapter y fixture según necesidad.
3. Definir un modelo de presentación tipado, sin acoplar componentes al DTO externo. Los shared no conocen endpoints ni tokens.
4. Registrar el componente diferido en `src/app/routes/productPages.tsx`, la ruta en `productRoutes.tsx` y su navegación en `src/app/navigation/navigation.ts` cuando exista una ruta funcional aprobada. Registrar las muestras en `demoPages.tsx`/`demoRoutes.tsx`. El shell usa Outlet y no registra páginas; `App.tsx` solo monta `AppRoutes`. Las rutas `/foundation/*` son demostraciones.
5. Consumir shared y primitivas Mantine con el provider/theme de `src/main.tsx`. No importar otro theme por feature.
6. Modelar loading/empty/error/success y acciones submitting/disabled cuando aplican. No transformar un error de consulta en saldo cero.
7. Ejecutar typecheck/build/lint y recorridos pertinentes; revisar desktop a 1440 px.

Referencia implementada: `features/foundation/pages/ListDemo.tsx` → `hooks/useDemoList.ts` → `services/demoService.ts` → `DemoRepository` → `adapters/mockDemoRepository.ts` → `mocks/items.ts`. La elección de adapter tiene un único punto en `demoService.ts`; no hay env flags diferentes por componente. Una respuesta de consulta cancelada no sobrescribe una consulta nueva.

Para API futura: leer primero contrato exacto del provider, implementar mapper DTO→presentación y reemplazar el adapter en ese punto. No hay adapter HTTP, endpoint o scope provisional. `confirmExample` es una simulación local que no persiste: no debe reutilizarse para guardar productos.

## Revisión local

`npm ci`, `npm run dev`; abrir listado/formulario/estados desde sidebar. En listado elegir los cuatro escenarios de revisión. En formulario revisar required/error, cancelar, fallo simulado y éxito local. En estados abrir confirmación destructiva y carga localizada. El escenario loading deliberadamente permanece hasta cambiarlo; solo es un fixture de revisión.

`npx playwright install chromium` prepara el navegador; `npm test` inicia servidor y genera capturas en `docs/evidencias/`. No se requiere backend. Las capturas son evidencia técnica y no un visto bueno humano de UX.

## Cobertura del piloto y de las referencias MK-013

| Referencia adjunta | Patrones / cobertura real | Límite |
|---|---|---|
| S01 Precio vigente | PageHeader, FilterBar/Select, MetricCard, StatusBadge, EntityTable, FeedbackAlert y estados de consulta | Piloto implementado en `/precios`, mocks tipados |
| S02 Editar precio | Radio.Card para alcance, NumberInput, acción de oferta condicional, Textarea, ConfirmDialog | Muestra en `/foundation/pricing?panel=edit`; sin PATCH, conflicto ni guardado comercial |
| S03 Programaciones | Table/Badge, Select/NumberInput, fechas con zona y Textarea | Muestra en `?panel=schedule`; sin crear/cancelar vigencias; el calendario es nativo |
| S04 Carga masiva | FileSelection/FileInput, Stepper de dos etapas, Radio, feedback persistente | Muestra en `?panel=import`; archivo nuevo invalida revisión; no parser/admisión por Q-013-01/02 |
| S05 Resultado | MetricCard, Table/Badge, alerta parcial y explicación de recuperación | Muestra en `?panel=result`; fixture 3/2/1, sin lote real o CSV generado |

El `FilterBar` admite `align: 'flex-start'/'flex-end'` para alinear labels/controles cuando hay ayudas de distinta altura. El valor original es flex-end; Pricing usa flex-start. `MetricCard` recibe su valor de la fuente: no calcula precio final, descuento ni contadores. `FileSelection.accept` solo se configura cuando el contrato de archivo define formatos.

S01 usa `features/pricing/pages/CurrentPricePage` → `hooks/useCurrentPrice` → `services/pricingService` → `PricingRepository` → `mockPricingRepository` → `mocks/prices`. Las lecturas anteriores se conservan únicamente para el mismo objetivo/canal y se marcan si falla o está pendiente la actualización. Respuestas canceladas no reemplazan la selección nueva.

El selector producto/SKU usa contexto ficticio de Catálogo; un producto base no admite filtro de canal en esta muestra, conforme a la operación de lectura publicada. Retail solicitado puede resolver a global efectivo en SKU. Cambios de filtros requieren Consultar; al ir a muestras y regresar se conserva el contexto aplicado mediante parámetros de navegación, no como parámetros HTTP nuevos.

El borrador editable tiene la vida del contexto aplicado `target/channel`: Atrás/Adelante o una URL diferente restaura los controles desde ese contexto. Cambios pendientes no sustituyen los resultados; al navegar por historial se descartan únicamente esos filtros de consulta sin aplicar, sin escrituras comerciales. Un cambio de escenario no reinicia ediciones dentro del mismo contexto. El recorrido se prueba en FND-06.
