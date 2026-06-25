import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const script = readFileSync(new URL('../../offerlab-java/scripts/preview-mojibake-repair.mjs', import.meta.url), 'utf8')

assert.match(script, /MOJIBAKE_MARKERS/, 'repair preview must define mojibake markers')
assert.match(script, /--confirm PREVIEW_ONLY/, 'repair SQL generation must require an explicit preview-only confirmation')
assert.match(script, /No database writes were executed/, 'preview report must state that no writes were executed')
assert.match(script, /ROLLBACK;/, 'generated SQL must default to rollback for manual review')
assert.match(script, /WHERE \$\{sqlIdent\('id'\)\} = \$\{sqlString\(hit\.id\)\} AND/, 'repair SQL must guard by exact row id and old value')
assert.doesNotMatch(script, /createConnection|mysql2|execFileSync\(['"]mysql|spawnSync\(['"]mysql|COMMIT;/, 'repair preview tool must not connect to MySQL or auto-commit updates')
assert.doesNotMatch(script, /\bDELETE\s+FROM\b|\bTRUNCATE\b|\bDROP\s+TABLE\b/i, 'repair preview tool must not contain destructive SQL')

console.log('mojibake repair preview guard passed')
