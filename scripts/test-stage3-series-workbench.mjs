import { existsSync, readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const router = readFileSync(new URL('../src/router/index.ts', import.meta.url), 'utf8')
const header = readFileSync(new URL('../src/components/layout/AppHeader.vue', import.meta.url), 'utf8')
const home = readFileSync(new URL('../src/views/HomeView.vue', import.meta.url), 'utf8')
const seriesApi = readFileSync(new URL('../src/api/contentSeries.ts', import.meta.url), 'utf8')
const seriesViewUrl = new URL('../src/views/SeriesWorkbenchView.vue', import.meta.url)

assert.equal(existsSync(seriesViewUrl), true, 'SeriesWorkbenchView.vue must exist')
const seriesView = readFileSync(seriesViewUrl, 'utf8')

assert.match(seriesApi, /export interface ContentSeriesRecord\b/, 'content series API must define a series record contract')
assert.match(seriesApi, /export const contentSeriesApi\b/, 'content series API must expose contentSeriesApi')
assert.match(seriesApi, /listMine:\s*async/, 'content series API must list current user series')
assert.match(seriesApi, /create:\s*async/, 'content series API must create series')
assert.match(seriesApi, /update:\s*async/, 'content series API must update series')
assert.match(seriesApi, /status:\s*'fallback'/, 'content series API must keep a local fallback mode')

assert.match(router, /path:\s*'\/series\/workbench'/, 'router must expose the series workbench route')
assert.match(router, /SeriesWorkbenchView\.vue/, 'router must lazy-load the series workbench view')
assert.match(router, /requiresAuth:\s*true/, 'series workbench route must require login')

assert.match(seriesView, /contentSeriesApi/, 'SeriesWorkbenchView must use the content series API')
assert.match(seriesView, /系列工作台/, 'SeriesWorkbenchView must render the workbench title')
assert.match(seriesView, /创建系列/, 'SeriesWorkbenchView must provide a create action')
assert.match(seriesView, /编辑系列/, 'SeriesWorkbenchView must provide an edit action')
assert.match(seriesView, /进度/, 'SeriesWorkbenchView must render series progress')
assert.match(seriesView, /series-progress-bar/, 'SeriesWorkbenchView must render a visual progress bar')
assert.match(seriesView, /loadSeriesWorkbench/, 'SeriesWorkbenchView must load workbench data')
assert.match(seriesView, /saveSeriesDraft/, 'SeriesWorkbenchView must save create or edit changes')

assert.match(header, /系列工作台/, 'AppHeader must expose the series workbench entry')
assert.match(home, /系列工作台/, 'HomeView must surface the series workbench entry')

console.log('stage3 series workbench guard passed')
