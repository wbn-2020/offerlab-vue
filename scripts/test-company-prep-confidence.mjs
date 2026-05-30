import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const api = readFileSync(new URL('../src/api/question.ts', import.meta.url), 'utf8')
const view = readFileSync(new URL('../src/views/CompanyPrepView.vue', import.meta.url), 'utf8')
const exporter = readFileSync(new URL('../src/utils/prepPackExport.ts', import.meta.url), 'utf8')

for (const field of ['questionSampleCount', 'postSampleCount', 'resultSampleCount', 'recentResultSampleCount', 'dataUpdatedAt']) {
  assert.match(api, new RegExp(`${field}\\??:\\s*(number|number\\s*\\|\\s*undefined)`), `CompanyPrep type must expose ${field}`)
  assert.match(api, new RegExp(`${field}:\\s*`), `CompanyPrep adapter must map ${field}`)
}

assert.match(view, /数据可信度/, 'CompanyPrepView must render a data confidence panel')
assert.match(view, /confidenceHint/, 'CompanyPrepView must explain confidence from sample size')
assert.match(view, /prep\.questionSampleCount/, 'CompanyPrepView must show full question sample count')
assert.match(view, /prep\.postSampleCount/, 'CompanyPrepView must show full post sample count')
assert.match(view, /prep\.resultSampleCount/, 'CompanyPrepView must show full result sample count')
assert.match(view, /prep\.recentResultSampleCount/, 'CompanyPrepView must show recent result sample count')
assert.match(view, /dataUpdatedText/, 'CompanyPrepView must show data freshness')
assert.match(view, /样本偏少/, 'CompanyPrepView must warn when data is sparse')
assert.match(view, /formatDate\(prep\.value\.dataUpdatedAt, 'YYYY-MM-DD HH:mm'\)/, 'CompanyPrepView must format dataUpdatedAt consistently')

assert.match(exporter, /题目样本: \$\{data\.questionSampleCount\}/, 'Markdown export must include question sample count')
assert.match(exporter, /面经样本: \$\{data\.postSampleCount\}/, 'Markdown export must include post sample count')
assert.match(exporter, /结果样本: \$\{data\.resultSampleCount\}/, 'Markdown export must include result sample count')
assert.match(exporter, /近 30 天结果样本: \$\{data\.recentResultSampleCount\}/, 'Markdown export must include recent result sample count')
assert.match(exporter, /data\.dataUpdatedAt \? formatDate\(data\.dataUpdatedAt, 'YYYY-MM-DD HH:mm'\) : '暂无记录'/, 'Markdown export must include data freshness')

console.log('company prep confidence guard passed')
