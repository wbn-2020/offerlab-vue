import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const readVue = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/^\uFEFF/, '')
const has = (source, pattern, message) => assert.match(source, pattern, message)
const missing = (source, pattern, message) => assert.doesNotMatch(source, pattern, message)

const packageJson = JSON.parse(readVue('package.json'))
const searchApi = readVue('src/api/search.ts')
const suggestSearch = readVue('src/components/search/SuggestSearch.vue')
const discoveryTool = readVue('src/utils/searchSuggestionDiscovery.ts')

has(
  packageJson.scripts['test:v4-search-suggestion-zero-result'] || '',
  /node scripts\/test-v4-search-suggestion-zero-result\.mjs/,
  'package.json must expose the V4 search suggestion and zero-result contract guard.',
)

has(searchApi, /export type SearchSuggestionType\s*=\s*'keyword'\s*\|\s*'tag'\s*\|\s*'topic'\s*\|\s*'collection'\s*\|\s*'correction'\s*\|\s*'synonym'/, 'SearchSuggestionType must cover keyword/tag/topic/collection/correction/synonym.')
has(searchApi, /export type SearchDiscoverySource\s*=\s*'remote'\s*\|\s*'local'\s*\|\s*'fallback'\s*\|\s*'demo'/, 'Suggestion/action source must distinguish remote/local/fallback/demo.')
has(searchApi, /export type SearchReviewStatus\s*=\s*'SAFE'\s*\|\s*'REVIEW_REQUIRED'\s*\|\s*'REJECTED'/, 'Review status must distinguish SAFE/REVIEW_REQUIRED/REJECTED.')
has(searchApi, /export interface SearchSuggestionItem[\s\S]*text:\s*string[\s\S]*suggestionType:\s*SearchSuggestionType[\s\S]*source:\s*SearchDiscoverySource[\s\S]*reasonText\?:\s*string[\s\S]*targetHref\?:\s*string[\s\S]*persistable:\s*boolean[\s\S]*reviewStatus:\s*SearchReviewStatus/, 'SearchSuggestionItem must expose the required structured fields.')
has(searchApi, /export interface ZeroResultAction[\s\S]*actionType:\s*ZeroResultActionType[\s\S]*label:\s*string[\s\S]*targetHref\?:\s*string[\s\S]*payload\?:\s*Record<string,\s*unknown>[\s\S]*requiresLogin:\s*boolean[\s\S]*requiresReview:\s*boolean[\s\S]*source:\s*SearchDiscoverySource/, 'ZeroResultAction must expose the required structured fields.')
has(searchApi, /suggest:\s*(?:async\s*)?\(q:\s*string\):\s*Promise<Result<SearchSuggestionItem\[\]>>/, 'searchApi.suggest must return structured suggestion items.')
has(searchApi, /hotSearches:\s*(?:async\s*)?\(\):\s*Promise<Result<SearchSuggestionItem\[\]>>/, 'searchApi.hotSearches must return structured suggestion items.')
has(searchApi, /adaptSearchSuggestionItems/, 'search API must normalize remote/local/fallback/demo suggestion payloads.')
has(searchApi, /buildZeroResultActions/, 'search API must expose zero-result action construction.')
has(searchApi, /isPersistableSearchDiscoveryItem/, 'search API must expose the source/reviewStatus persistability gate.')
has(searchApi, /isDownstreamZeroResultAction/, 'search API must expose the source/review zero-result downstream gate.')

has(discoveryTool, /export const isFormalSearchDiscoverySource = \(item: Pick<SearchSuggestionItem \| ZeroResultAction, 'source'>\)/, 'Discovery tool must centralize formal source checks.')
has(discoveryTool, /item\.source === 'remote'/, 'Only remote source can be treated as formal discovery.')
has(discoveryTool, /reviewStatus === 'SAFE'/, 'Only SAFE reviewed suggestions can be persistable.')
has(discoveryTool, /source === 'fallback' \|\| source === 'demo'/, 'Fallback/demo items must be explicitly detected.')
has(discoveryTool, /persistable:\s*isPersistableSearchDiscoveryItem/, 'Suggestion normalization must force persistability through the gate.')
has(discoveryTool, /export const isFormalZeroResultAction[\s\S]*item\.source === 'remote'|export const isFormalZeroResultAction[\s\S]*isFormalSearchDiscoverySource/, 'Zero-result actions must use the same remote-only formal source gate.')
has(discoveryTool, /isFormalZeroResultAction[\s\S]*!action\.requiresReview/, 'Zero-result downstream actions must not require review.')
has(discoveryTool, /originalQuery/, 'Correction/synonym actions must retain the original query.')
has(discoveryTool, /actionType:\s*'create_gap'[\s\S]*requiresReview:\s*true/, 'Zero-result gap creation must require review.')
has(discoveryTool, /actionType:\s*'open_editor'[\s\S]*requiresLogin:\s*true[\s\S]*requiresReview:\s*true/, 'Zero-result editor action must require login and review.')
has(discoveryTool, /source:\s*'fallback'/, 'Client-built repair actions must be marked fallback unless explicitly remote/local.')

has(suggestSearch, /defineEmits<[\s\S]*select[\s\S]*SearchSuggestionItem[\s\S]*zero-action[\s\S]*ZeroResultAction/, 'SuggestSearch must emit structured suggestion and zero-result actions.')
has(suggestSearch, /correction|synonym/, 'SuggestSearch must render correction/synonym suggestions without automatic replacement.')
has(suggestSearch, /persistable/, 'SuggestSearch must expose persistability state for downstream callers.')
has(suggestSearch, /fallback|demo/, 'SuggestSearch must visibly distinguish fallback/demo display-only items.')
missing(suggestSearch, /trackAnalytics\(/, 'SuggestSearch must not send fallback/demo suggestions into analytics directly.')

console.log('V4 search suggestion and zero-result guard passed.')
