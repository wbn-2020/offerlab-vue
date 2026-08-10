import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'

const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8')
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const scriptsDirectory = new URL('./', import.meta.url)

assert.doesNotMatch(workflow, /\t/, 'frontend CI workflow must use YAML spaces rather than tabs')
assert.match(
  workflow,
  / {6}- name: Check out backend contract source\s+ {8}uses: actions\/checkout@v4\s+ {8}with:\s+ {10}repository: wbn-2020\/offerlab-java\s+ {10}ref: \$\{\{ \(github\.head_ref == 'main' \|\| github\.head_ref == 'dev-v2'\) && github\.head_ref \|\| \(github\.ref_name == 'main' \|\| github\.ref_name == 'dev-v2'\) && github\.ref_name \|\| github\.base_ref \|\| 'dev-v2' \}\}\s+ {10}path: offerlab-java/,
  'backend checkout must always align stable frontend branches with the same backend branch before using the PR base or fallback',
)
assert.doesNotMatch(
  workflow,
  /ref:\s+\$\{\{\s*(?:github\.head_ref|github\.ref_name)\s*\}\}/,
  'feature branch names must not be reused unconditionally across repositories',
)
assert.equal(
  packageJson.scripts?.['test:ci-workflow'],
  'node scripts/test-ci-workflow.mjs',
  'package.json must expose the frontend CI workflow guard',
)
assert.equal(
  packageJson.scripts?.['test:cross-repository-contracts'],
  'npm run test:v4-community-knowledge-contracts && npm run test:v4-knowledge-asset-guards && npm run test:v4-search-discovery-guards && npm run test:v4-topic-lifecycle-guards',
  'package.json must aggregate every standalone cross-repository V4 contract guard',
)
assert.ok(
  (packageJson.scripts?.['pretest:guards'] || '').startsWith(
    'npm run test:ci-workflow && npm run test:cross-repository-contracts && ',
  ),
  'the full source guard suite must validate CI and cross-repository contracts first',
)

const guardFiles = readdirSync(scriptsDirectory, { withFileTypes: true })
  .filter(
    (entry) =>
      entry.isFile() &&
      entry.name.endsWith('.mjs') &&
      entry.name !== 'test-ci-workflow.mjs',
  )

for (const guardFile of guardFiles) {
  const source = readFileSync(new URL(guardFile.name, scriptsDirectory), 'utf8')
  assert.doesNotMatch(
    source,
    /\.\.\/文档\//,
    `${guardFile.name} must not depend on documentation outside the frontend repository`,
  )
}

console.log('frontend CI workflow guard passed')
