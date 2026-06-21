import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import assert from 'node:assert/strict'

const source = fs.readFileSync(new URL('../src/composables/useDebounce.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
})

let watchedCallback
let unmountCallback
let timeoutHandler
const clearedTimers = []

const sandbox = {
  exports: {},
  require: (name) => {
    if (name === 'vue') {
      return {
        ref: (value) => ({ value }),
        watch: (_getter, callback) => {
          watchedCallback = callback
        },
        onUnmounted: (callback) => {
          unmountCallback = callback
        },
      }
    }
    throw new Error(`Unexpected require: ${name}`)
  },
  setTimeout: (handler) => {
    timeoutHandler = handler
    return 42
  },
  clearTimeout: (timer) => {
    clearedTimers.push(timer)
    if (timer === 42) timeoutHandler = undefined
  },
}

vm.runInNewContext(compiled.outputText, sandbox)

const { useDebounce } = sandbox.exports
const debounced = useDebounce('initial', 200)

watchedCallback('next')
assert.equal(typeof timeoutHandler, 'function', 'debounce should schedule a timer when the value changes')
assert.equal(typeof unmountCallback, 'function', 'debounce must register an unmount cleanup callback')

unmountCallback()
assert.deepEqual(clearedTimers, [42], 'unmount cleanup must clear the pending debounce timer')

if (timeoutHandler) timeoutHandler()
assert.equal(debounced.value, 'initial', 'cleared debounce timer must not update state after unmount')

console.log('debounce cleanup tests passed')
