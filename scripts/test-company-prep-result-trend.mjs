import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const api = readFileSync(new URL('../src/api/question.ts', import.meta.url), 'utf8')
const view = readFileSync(new URL('../src/views/CompanyPrepView.vue', import.meta.url), 'utf8')
const exporter = readFileSync(new URL('../src/utils/prepPackExport.ts', import.meta.url), 'utf8')

assert.match(api, /interviewResultDistribution:\s*NameCount\[\]/, 'CompanyPrep type must expose total interview result distribution')
assert.match(api, /recentResultDistribution:\s*NameCount\[\]/, 'CompanyPrep type must expose recent interview result distribution')
assert.match(api, /raw\?\.interviewResultDistribution[\s\S]*map\(adaptNameCount\)/, 'CompanyPrep adapter must map total result distribution')
assert.match(api, /raw\?\.recentResultDistribution[\s\S]*map\(adaptNameCount\)/, 'CompanyPrep adapter must map recent result distribution')

assert.match(view, /反馈趋势/, 'CompanyPrepView must render a community feedback trend panel')
assert.match(view, /ResultTrendList/, 'CompanyPrepView must use a dedicated result trend renderer')
assert.match(view, /prep\.recentResultDistribution/, 'CompanyPrepView must render recent result distribution')
assert.match(view, /prep\.interviewResultDistribution/, 'CompanyPrepView must render total result distribution')
assert.match(view, /近 30 天/, 'CompanyPrepView must label the recent trend window')
assert.match(view, /全部样本/, 'CompanyPrepView must label the all-time trend window')
assert.match(view, /result-bar-fill/, 'CompanyPrepView must show proportional result trend bars')
assert.match(view, /暂无结果样本/, 'CompanyPrepView must show an empty state for missing result trend data')

assert.match(exporter, /## 反馈趋势/, 'Company prep Markdown export must include result trend section')
assert.match(exporter, /data\.recentResultDistribution/, 'Company prep Markdown export must include recent result distribution')
assert.match(exporter, /data\.interviewResultDistribution/, 'Company prep Markdown export must include total result distribution')

console.log('company prep result trend guard passed')
