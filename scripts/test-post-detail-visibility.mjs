import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const view = readFileSync(new URL('../src/views/PostDetailView.vue', import.meta.url), 'utf8')

assert.match(view, /error:\s*postError/, 'PostDetailView must keep post load errors')
assert.match(view, /retry:\s*false/, 'PostDetailView must not retry 403 or 404 detail responses into a long loading state')
assert.match(view, /const postUnavailableTitle = computed\(\(\) => postErrorCode\.value === 10403 \|\| postErrorCode\.value === 403/, 'PostDetailView must derive a forbidden vs unavailable title')
assert.match(view, /const postUnavailableDescription = computed\(\(\) => postErrorCode\.value === 10403 \|\| postErrorCode\.value === 403/, 'PostDetailView must derive a forbidden vs unavailable description')
assert.match(view, /commentsErrorMessage = ref\(''\)/, 'PostDetailView must keep a comment load error state')
assert.match(view, /v-else-if="commentsErrorMessage"/, 'PostDetailView must render comment errors instead of an empty tree')
assert.match(view, /commentsErrorMessage\.value = errorCodeOf\(error\) === 10403 \|\| errorCodeOf\(error\) === 403/, 'PostDetailView must show a clear forbidden comment message')
assert.match(view, /comments\.value = \[\]/, 'PostDetailView must clear comments when reset loading fails')
assert.match(view, /hasMoreComments\.value = false/, 'PostDetailView must stop pagination after comment visibility failures')
assert.match(view, /import\s+\{\s*applyPageSeo,\s*summarizeSeoText\s*\}\s+from\s+'@\/utils\/seo'/, 'PostDetailView must import Stage 1 SEO helpers')
assert.match(view, /const showStageTwoDetailPanels = false/, 'PostDetailView must keep later-phase detail panels disabled in Stage 1')
assert.match(view, /showStageTwoDetailPanels && \(knowledgeSummary \|\| knowledgeTags\.length \|\| knowledgeFaqs\.length \|\| knowledgeCardItems\.length\)/, 'PostDetailView must gate the knowledge panel behind the Stage 1 switch')
assert.match(view, /v-if="showStageTwoDetailPanels" class="ai-knowledge-assistant/, 'PostDetailView must gate the AI knowledge assistant behind the Stage 1 switch')
assert.match(view, /v-if="showStageTwoDetailPanels" class="interview-material-panel/, 'PostDetailView must gate the interview material panel behind the Stage 1 switch')
assert.match(view, /v-if="showStageTwoDetailPanels" class="knowledge-path-panel/, 'PostDetailView must gate the knowledge path panel behind the Stage 1 switch')
assert.match(view, /PostQuestionBlock v-if="showStageTwoDetailPanels"/, 'PostDetailView must gate the question block behind the Stage 1 switch')

assert.match(view, /watch\(\[post,\s*postErrorCode,\s*postId\],/, 'PostDetailView must watch detail state changes to refresh SEO')
assert.match(view, /applyPageSeo\(\{/, 'PostDetailView must apply page SEO on detail state changes')
assert.match(view, /canonical:\s*`\/post\/\$\{postId\.value\}`/, 'PostDetailView must publish a canonical path for public detail pages')
assert.match(view, /summarizeSeoText\(/, 'PostDetailView must summarize detail text for Stage 1 SEO descriptions')

console.log('post detail visibility guard passed')
