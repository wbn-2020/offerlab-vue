import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8')
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const creatorWorkbenchGuard = readFileSync(
  new URL('./test-v4-creator-workbench-guards.mjs', import.meta.url),
  'utf8',
)

assert.doesNotMatch(workflow, /\t/, 'frontend CI workflow must use YAML spaces rather than tabs')
assert.match(
  workflow,
  / {6}- name: Check out backend contract source\s+ {8}uses: actions\/checkout@v4\s+ {8}with:\s+ {10}repository: wbn-2020\/offerlab-java\s+ {10}ref: \$\{\{ vars\.OFFERLAB_BACKEND_REF \|\| \(github\.ref_name == 'main' \|\| github\.ref_name == 'dev-v2'\) && github\.ref_name \|\| github\.base_ref \|\| 'dev-v2' \}\}\s+ {10}path: offerlab-java/,
  'backend checkout must honor an override, match stable branches, use the PR base ref, or fall back to dev-v2',
)
assert.doesNotMatch(workflow, /ref:\s+\$\{\{\s*github\.ref_name\s*\}\}/, 'feature branch names must not be reused unconditionally')
assert.equal(
  packageJson.scripts?.['test:ci-workflow'],
  'node scripts/test-ci-workflow.mjs',
  'package.json must expose the frontend CI workflow guard',
)
assert.match(
  packageJson.scripts?.['pretest:guards'] || '',
  /npm run test:ci-workflow/,
  'the full source guard suite must execute the frontend CI workflow guard',
)
assert.doesNotMatch(
  creatorWorkbenchGuard,
  /\.\.\/文档\//,
  'source guards must not depend on documentation outside the frontend repository',
)

console.log('frontend CI workflow guard passed')
