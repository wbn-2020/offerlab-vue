import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const postApi = readFileSync(new URL('../src/api/post.ts', import.meta.url), 'utf8')
const opsView = readFileSync(new URL('../src/views/OpsView.vue', import.meta.url), 'utf8')
const packageJson = readFileSync(new URL('../package.json', import.meta.url), 'utf8')

assert.match(postApi, /export interface PostKnowledgeReviewReq\b/, 'post API must type knowledge review request')
assert.match(postApi, /summary\?: string/, 'knowledge review request must include summary')
assert.match(postApi, /faqJson\?: string/, 'knowledge review request must include FAQ JSON')
assert.match(postApi, /knowledgeCardJson\?: string/, 'knowledge review request must include knowledge-card JSON')
assert.match(postApi, /techStacks\?: string\[\]/, 'knowledge review request must include tech stacks')
assert.match(postApi, /suggestedTags\?: string\[\]/, 'knowledge review request must include suggested tags')
assert.match(postApi, /reviewKnowledge/, 'post API must expose reviewKnowledge')
assert.match(postApi, /\/api\/v1\/posts\/admin\/knowledge\/\$\{postId\}\/review/, 'post API must call knowledge review endpoint')

assert.match(opsView, /知识沉淀回写/, 'Ops AI task detail must render knowledge review section')
assert.match(opsView, /knowledgeReviewForm/, 'OpsView must keep a knowledge review form')
assert.match(opsView, /hydrateKnowledgeReviewForm/, 'OpsView must hydrate review form from AI detail')
assert.match(opsView, /submitKnowledgeReview/, 'OpsView must submit knowledge review')
assert.match(opsView, /requireRiskConfirm/, 'knowledge review submit must require risk confirmation')
assert.match(opsView, /postApi\.reviewKnowledge/, 'OpsView must call post API reviewKnowledge')
assert.match(opsView, /parseCsvList/, 'OpsView must normalize comma-separated tech stacks and tags')

assert.match(packageJson, /"test:ai-knowledge-review"/, 'package scripts must expose the AI knowledge review guard')
assert.match(packageJson, /npm run test:ai-knowledge-review/, 'test:guards must include the AI knowledge review guard')

console.log('AI knowledge review frontend guard passed')
