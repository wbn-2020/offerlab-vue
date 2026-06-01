import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const detail = readFileSync(new URL('../src/views/QuestionDetailView.vue', import.meta.url), 'utf8')
const search = readFileSync(new URL('../src/views/SearchView.vue', import.meta.url), 'utf8')
const questions = readFileSync(new URL('../src/views/QuestionsView.vue', import.meta.url), 'utf8')

assert.match(detail, /storageOwner\s*=\s*computed/, 'QuestionDetailView must scope note drafts by current user')
assert.match(detail, /question-note-draft:\$\{questionId\.value\}/, 'QuestionDetailView must scope note drafts by question id')
assert.match(detail, /draftScope\s*=\s*computed/, 'QuestionDetailView must track draft load scope')
assert.match(detail, /syncNoteEditor/, 'QuestionDetailView must reset note editor when detail changes')
assert.doesNotMatch(detail, /isSavingNote\.value\s*\|\|\s*isNoteDirty\.value\)\s*return/, 'QuestionDetailView must not keep dirty notes when navigating to a different question')
assert.match(detail, /v-else-if="isError"/, 'QuestionDetailView must distinguish load errors from not-found empty state')
assert.match(detail, /detail\.value\?\.question \?\? null/, 'QuestionDetailView must treat missing question detail as a non-crashing empty state')
assert.match(detail, /!detail \|\| !question/, 'QuestionDetailView template must render empty state when the adapted question is missing')
assert.match(detail, /if \(!detail\.value \|\| !question\.value/, 'QuestionDetailView note actions must guard against missing adapted question data')
assert.match(detail, /当前题库还没有同步到详情页/, 'QuestionDetailView empty state must explain backend/detail sync gaps')

assert.match(search, /let searchRequestId\s*=\s*0/, 'SearchView must track latest search request')
assert.match(search, /const requestId\s*=\s*\+\+searchRequestId/, 'SearchView must stamp each search request')
assert.match(search, /requestId !== searchRequestId/, 'SearchView must ignore stale search responses')
assert.doesNotMatch(search, /if\s*\(isLoading\.value\s*\|\|/, 'SearchView must allow a new non-append search to supersede an old one')
assert.match(search, /storageKey\(key\)/, 'SearchView must scope saved and recent searches by current user')
assert.match(search, /watch\(storageOwner,[\s\S]*loadSearchSnapshots\(\)/, 'SearchView must reload saved and recent searches when the logged-in user changes')
assert.match(detail, /mistakeReason:\s*mistakeReason\.value/, 'QuestionDetailView must send an explicit blank mistake reason when clearing it')

assert.match(questions, /const listError\s*=\s*ref\(''\)/, 'QuestionsView must keep an explicit list error state')
assert.match(questions, /const loadMoreError\s*=\s*ref\(''\)/, 'QuestionsView must keep append-load errors separate from first-page errors')
assert.match(questions, /v-else-if="listError"/, 'QuestionsView must render API errors separately from empty results')
assert.match(questions, /getErrorMessage\(error,\s*'题库暂时无法加载，请稍后重试。'\)/, 'QuestionsView must use normalized API error messages')
assert.match(questions, /@click="fetchQuestions\(false\)"/, 'QuestionsView error state must provide retry')
assert.match(questions, /const fetchQuestions\s*=\s*async\s*\(append = false,\s*targetPage = page\.value\)/, 'QuestionsView fetch must accept an explicit target page')
assert.match(questions, /page:\s*targetPage/, 'QuestionsView must request the intended page instead of relying on pre-mutated state')
assert.match(questions, /page\.value\s*=\s*targetPage/, 'QuestionsView must only commit current page after a successful response')
assert.match(questions, /const nextPage\s*=\s*page\.value \+ 1[\s\S]*fetchQuestions\(true,\s*nextPage\)/, 'QuestionsView load more must request the next page without committing it first')
assert.doesNotMatch(questions, /page\.value\s*\+=\s*1/, 'QuestionsView load more must not skip pages after append failures')

console.log('question quality fixes guard passed')
