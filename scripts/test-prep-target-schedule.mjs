import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const apiSource = readFileSync(new URL('../src/api/question.ts', import.meta.url), 'utf8')
const viewSource = readFileSync(new URL('../src/views/MePrepView.vue', import.meta.url), 'utf8')

assert.match(apiSource, /interviewDate\?:\s*string/, 'PrepTarget must expose interviewDate')
assert.match(apiSource, /priority\?:.*string/, 'PrepTarget must expose priority')
assert.match(apiSource, /note\?:\s*string/, 'PrepTarget must expose note')
assert.match(apiSource, /interviewDate:\s*raw\?\.interviewDate \|\| undefined/, 'PrepTarget adapter must map interviewDate')
assert.match(apiSource, /priority:\s*raw\?\.priority \|\| undefined/, 'PrepTarget adapter must map priority')
assert.match(apiSource, /note:\s*raw\?\.note \|\| undefined/, 'PrepTarget adapter must map note')
assert.match(apiSource, /addPrepTarget: async \(data: \{ targetType: string; targetValue: string; interviewDate\?: string; priority\?: string; note\?: string \}\)/, 'addPrepTarget must send schedule metadata')

assert.match(viewSource, /targetForm = reactive\(\{ targetType: 'company', targetValue: '', interviewDate: '', priority: 'medium', note: '' \}\)/, 'MePrep target form must carry date priority and note')
assert.match(viewSource, /type="date"/, 'MePrep target form must render an interview date input')
assert.match(viewSource, /临近面试/, 'MePrep target form must expose urgent priority')
assert.match(viewSource, /maxlength="300"/, 'MePrep target note input must be length-limited')
assert.match(viewSource, /targetScheduleText\(target\)/, 'MePrep target chips must show schedule text')
assert.match(viewSource, /targetPriorityText\(target\.priority\)/, 'MePrep target chips must show priority text')
assert.match(viewSource, /targetScheduleText\(summary\.target\)/, 'MePrep target summaries must show schedule text')
assert.match(viewSource, /还有 \$\{diffDays\} 天/, 'MePrep must show days until interview')
assert.match(viewSource, /今天面试/, 'MePrep must highlight same-day interviews')
assert.match(viewSource, /已过 \$\{Math\.abs\(diffDays\)\} 天/, 'MePrep must show overdue interview dates')

console.log('prep target schedule guard passed')
