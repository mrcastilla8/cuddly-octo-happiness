import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = resolve(root, 'evidencias-integracion-g7');
const files = await readdir(evidence);
const scanned = [];
for (const name of files) {
  if (!/\.(json|jsonl|md)$/.test(name)) continue;
  const path = join(evidence, name);
  if (!(await stat(path)).isFile()) continue;
  const content = await readFile(path, 'utf8');
  assert.doesNotMatch(content, /\bBearer\s+\S+/i, `${name} contains a bearer value`);
  assert.doesNotMatch(content, /eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/, `${name} contains a JWT-shaped value`);
  assert.doesNotMatch(content, /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/, `${name} contains a private key`);
  scanned.push(name);
}
const envFile = resolve(root, 'frontend/.env.local');
const ignored = spawnSync('git', ['check-ignore', '--quiet', envFile], {
  cwd: resolve(root, '..'),
  windowsHide: true,
});
assert.equal(ignored.status, 0, 'frontend/.env.local must be ignored by Git');
console.log(JSON.stringify({
  status: 'PASS',
  scanned_files: scanned.length,
  private_env_ignored: true,
  credential_patterns_found: 0,
}, null, 2));
