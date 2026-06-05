import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const prep = readFileSync(new URL('../src/views/MePrepView.vue', import.meta.url), 'utf8')
const detail = readFileSync(new URL('../src/views/QuestionDetailView.vue', import.meta.url), 'utf8')
const mockView = readFileSync(new URL('../src/views/MockInterviewView.vue', import.meta.url), 'utf8')
const workspace = readFileSync(new URL('../src/components/mock-interview/MockInterviewWorkspace.vue', import.meta.url), 'utf8')

assert.match(prep, /\/mock-interview\?focusTag=/, 'prep desk weak focus tags must deep-link to focused mock interview')
assert.match(prep, /markReviewTask/, 'prep desk must let users complete or keep review tasks')
assert.match(prep, /`\/questions\/\$\{question\.id\}`/, 'prep desk answer cards must return to question detail')

assert.match(detail, /const primaryFocusTag\s*=\s*computed/, 'question detail must derive a focused mock-interview tag')
assert.match(detail, /const mockInterviewLink\s*=\s*computed/, 'question detail must build a mock interview deep link')
assert.match(detail, /path:\s*'\/mock-interview'/, 'question detail deep link must target mock interview')
assert.match(detail, /company:\s*question\.value\?\.company/, 'question detail mock link must preserve company context')
assert.match(detail, /position:\s*question\.value\?\.position/, 'question detail mock link must preserve position context')
assert.match(detail, /focusTag:\s*primaryFocusTag\.value/, 'question detail mock link must preserve tag context')
assert.match(detail, /questionCount:\s*5/, 'question detail mock link must set a small focused question count')
assert.match(detail, /加入模拟面试/, 'question detail must expose the mock interview CTA')
assert.match(detail, /const prepReturnLink\s*=\s*computed/, 'question detail must build a prep desk return link')
assert.match(detail, /回准备台/, 'question detail must expose prep desk return CTA')

assert.match(mockView, /syncStartFormFromRoute/, 'mock interview must hydrate the start form from route query')
assert.match(mockView, /route\.query\.company/, 'mock interview must read company query')
assert.match(mockView, /route\.query\.position/, 'mock interview must read position query')
assert.match(mockView, /route\.query\.focusTag/, 'mock interview must read focusTag query')
assert.match(mockView, /route\.query\.questionCount/, 'mock interview must read questionCount query')
assert.match(mockView, /Math\.max\(3,\s*Math\.min\(10,\s*Math\.round\(count\)\)\)/, 'mock interview must clamp deep-linked question count')
assert.match(mockView, /saveMockAnswersAsAnswerCards/, 'mock interview must save completed answers as answer cards')
assert.match(mockView, /markWeakQuestionsForReview/, 'mock interview must mark weak questions for review')
assert.match(mockView, /questionApi\.updateProgress\(id, 'review'\)/, 'weak mock answers must flow back into review queue')

assert.match(workspace, /session\.status === 'completed' && answerCardCount > 0/, 'workspace must expose answer-card save after completion')
assert.match(workspace, /session\.status === 'completed'/, 'workspace must render completion-only next actions')
assert.match(workspace, /learning-loop-box/, 'workspace must have a dedicated learning loop next-action block')
assert.match(workspace, /to="\/me\/prep"/, 'completed mock interview must link back to prep desk')
assert.match(workspace, /\/questions\?progressStatus=review&sort=latest/, 'completed mock interview must link to review question queue')
assert.match(workspace, /const nextMockInterviewLink\s*=\s*computed/, 'workspace must build a next focused mock interview link')
assert.match(workspace, /focusTag:\s*props\.session\?\.focusTag/, 'next focused mock interview must preserve focusTag')
assert.match(workspace, /继续专项练习/, 'workspace must expose a next focused practice CTA')

console.log('prep learning loop guard passed')
