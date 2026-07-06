import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

const editor = read('../src/views/EditorView.vue')
const postDetail = read('../src/views/PostDetailView.vue')
const commentTree = read('../src/components/post/CommentTree.vue')
const search = read('../src/views/SearchView.vue')
const explore = read('../src/views/ExploreView.vue')
const adminGovernance = read('../src/views/AdminGovernanceView.vue')
const contentAssist = read('../src/api/contentAssist.ts')
const packageJson = read('../package.json')

const scriptRegion = (source, marker, length = 3200) => {
  const start = source.indexOf(marker)
  assert.notEqual(start, -1, `marker not found: ${marker}`)
  return source.slice(start, Math.min(source.length, start + length))
}

const editorQuestionTemplate = scriptRegion(editor, 'QUESTION: {', 900)
assert.match(editorQuestionTemplate, /问题是什么/, 'QUESTION template must ask for the actual question')
assert.match(editorQuestionTemplate, /背景和限制/, 'QUESTION template must ask for background and constraints')
assert.match(editorQuestionTemplate, /已经尝试/, 'QUESTION template must ask what has already been tried')
assert.match(editorQuestionTemplate, /想获得什么帮助/, 'QUESTION template must ask what help is expected')
assert.match(editorQuestionTemplate, /相关频道或标签线索/, 'QUESTION template must connect to channels, tags, or topics')
assert.doesNotMatch(editorQuestionTemplate, /期望结果|题库|备考|模拟面试|私人学习计划/, 'QUESTION template must not look like quiz prep or private training')

const editorQuality = scriptRegion(editor, 'const questionQualityChecks', 1800)
assert.match(editorQuality, /question-background/, 'QUESTION quality checks must include background guidance')
assert.match(editorQuality, /question-tried/, 'QUESTION quality checks must include tried-method guidance')
assert.match(editorQuality, /question-help/, 'QUESTION quality checks must include help-needed guidance')
assert.match(editorQuality, /required:\s*false/g, 'QUESTION quality checks must be non-blocking guidance')
assert.match(editor, /tagInputPlaceholder/, 'QUESTION publishing must adapt tag placeholder guidance')

assert.match(contentAssist, /isQuestionRequest/, 'content assist must branch for QUESTION posts')
assert.match(contentAssist, /背景、已经尝试过什么、卡点和想获得的帮助/, 'QUESTION assist summary must guide community help context')
assert.match(contentAssist, /求助|决策咨询|经验请教|避坑求助/, 'QUESTION tag suggestions must include general community help labels')
assert.doesNotMatch(scriptRegion(contentAssist, 'const questionTagSuggestionsOf', 1600), /面试题|刷题|模拟面试|私人训练/, 'QUESTION assist suggestions must not default to training language')

assert.match(postDetail, /POST_TYPE/, 'post detail must import POST_TYPE for QUESTION detection')
assert.match(postDetail, /isQuestionPost/, 'post detail must detect QUESTION posts')
assert.match(postDetail, /discussionSectionTitle/, 'post detail must use a question-aware discussion title')
assert.match(postDetail, /写下你的建议、经验或可尝试的方案/, 'QUESTION detail composer must invite advice and experience')
assert.match(postDetail, /相关问题求助|相似讨论/, 'QUESTION detail must expose related community discussion language')
assert.doesNotMatch(postDetail, /最佳回答|已采纳|邀请回答|回答排序/, 'stage 3 must not add full answer-model UI')

assert.match(commentTree, /emptyText/, 'comment tree must allow question-specific empty state copy')
assert.match(commentTree, /replyPlaceholder/, 'comment tree must allow question-specific reply placeholder copy')
assert.match(commentTree, /replySubmitLabel/, 'comment tree must allow question-specific reply submit copy')
assert.match(postDetail, /还没有建议，来分享一个可尝试的思路吧/, 'question comment empty state must invite first advice')
assert.doesNotMatch(commentTree, /最佳回答|采纳回答/, 'comment tree must remain lightweight comments/replies')

assert.doesNotMatch(search, /<RouterLink[^>]+path:\s*'\/questions'[\s\S]{0,180}>问答讨论<\/RouterLink>/, 'community Q&A entry must not route to /questions')
assert.match(search, /社区问题求助/, 'search must expose community QUESTION entry language')
assert.match(search, /communityQuestionQuery/, 'search must route community question entry through QUESTION post search')
assert.match(search, /type:\s*String\(POST_TYPE\.QUESTION\)/, 'search community question entry must filter postType QUESTION')
assert.match(search, /mode:\s*'posts'/, 'search community question entry must force post mode even from topics or tags search')

assert.match(explore, /社区问答讨论/, 'explore must expose a community question discussion entry')
assert.match(explore, /type:\s*String\(POST_TYPE\.QUESTION\)/, 'explore question entry must route through QUESTION post search')
assert.doesNotMatch(explore, /社区问答讨论[\s\S]{0,600}\/questions/, 'explore community question entry must not route to /questions')

assert.match(adminGovernance, /结构化知识卡审核/, 'governance copy must distinguish structured knowledge-card review')
assert.match(adminGovernance, /待审知识卡/, 'governance queue must not label structured cards as community questions')
assert.match(adminGovernance, /进入知识卡审核/, 'governance action must point to knowledge-card review wording')
assert.doesNotMatch(adminGovernance, /待审题目|进入题目审核|待题目审核/, 'governance queue must not expose quiz-question wording')

assert.match(packageJson, /"test:community-question-discussion"/, 'package scripts must expose stage 3 question discussion guard')
assert.match(packageJson, /npm run test:community-question-discussion/, 'test:guards must include stage 3 question discussion guard')

console.log('community question discussion guard passed')
