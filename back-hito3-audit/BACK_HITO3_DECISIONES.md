# Decisiones y restricciones aplicadas — BACK Hito 3

- G6 mantiene ownership de los ocho bounded contexts. Ventas conserva pedido/pago/orquestación; Retail, Marketplace, Postventa, G5 y Seguridad conservan sus responsabilidades.
- DEC-F-001..015 están adoptadas internamente; no prueban homologación externa. No se introduce DEC-F-016.
- OpenAPI 0.6.0-rc.1 y AsyncAPI 0.6.0-rc.2 se citan como candidatas del master consultado, no como contratos externamente homologados. La AsyncAPI RC3 local sucia no se toma como fuente. Retry/DLX productivo sigue bloqueado.
- Cada operación userBearer se conserva. El demo sin login no autoriza quitar guards, usar tokens de servicio en Vite ni exponer microservicios/broker. La resolución se realiza por operationId con G7/Seguridad y Marco.
- PostgreSQL/Drizzle local y pruebas aisladas pueden avanzar. No hay SQL, grants/policies, escritura shared Supabase ni reescritura de migraciones en esta planificación.
- Supabase: se observaron 84 tablas con RLS desactivado y un advisory menciona anon/authenticated. Esto no prueba exposición pública efectiva de todas las tablas. Separar RLS, grants, schemas API, credenciales directas y rutas públicas; la demo pública espera esa revisión.
- Mantener fixtures/mocks para pruebas aisladas; en VITE_DATA_MODE=api el error real no cae a mocks.
- Cada issue tiene un PR en un repositorio de código. BACK-08 permanece centralizado en Backend y crea PR solo en Frontend. Ningún issue requiere un único PR que edite Backend y Frontend a la vez.
- El trabajo sin owner transversal aprobado queda OWNER_PENDIENTE. Candidatos en el manifiesto son propuestas, no asignaciones.
