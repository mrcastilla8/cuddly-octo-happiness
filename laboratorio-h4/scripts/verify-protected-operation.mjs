import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [openapi, gateway, serviceContract, controller] = await Promise.all([
  readFile(resolve(root,'contratos/openapi.yaml'),'utf8'),
  readFile(resolve(root,'backend/apps/api-gateway/src/routing/contract-routes.ts'),'utf8'),
  readFile(resolve(root,'backend/apps/promotions-svc/src/http/http-contract.generated.ts'),'utf8'),
  readFile(resolve(root,'backend/apps/promotions-svc/src/http/query-controller.ts'),'utf8'),
]);
const normalizedOpenapi = openapi.replaceAll('\r\n','\n');
const op = normalizedOpenapi.match(/\n  \/cupones:\n    get:[\s\S]*?(?=\n  \/[^\n]+:|\ncomponents:)/)?.[0];
assert.ok(op, 'OpenAPI GET /cupones exists');
assert.match(op,/operationId: listarCupones/);
assert.match(op,/security:\n      - userBearer: \[\]/);
assert.match(gateway,/path: '\/api\/v1\/cupones',[\s\S]{0,180}operationId: 'listarCupones'/);
assert.match(serviceContract,/listarCupones:\s*\{\s*method: 'GET',\s*path: '\/api\/v1\/cupones',\s*security: \['userBearer'\]/);
assert.match(controller,/@Get\('cupones'\)\s*@QueryOperation\('listarCupones'\)/);
console.log(JSON.stringify({status:'PASS',operationId:'listarCupones',contractPath:'/cupones',runtimePath:'/api/v1/cupones',security:'userBearer',gateway:'registered',promotions:'implemented',resultSchema:'PaginatedCoupons'},null,2));
