import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const has = (source, needle, message) => assert.ok(source.includes(needle), message)

const adapters = read('../src/api/adapters.ts')
const packageJson = read('../package.json')

has(adapters, "content.action === 'topic_post_published'", 'notification adapter must detect topic post notifications')
has(adapters, "'关注专题有新内容'", 'topic notifications must have a clear heading')
has(adapters, 'content.topicName', 'topic notifications must mention the followed topic')
has(adapters, 'content.postTitle', 'topic notifications must mention the new post title')
has(adapters, "type === 'system' && content.action === 'topic_post_published'", 'system topic notifications must route through post target handling')
has(adapters, '`/post/${adaptId(postId)}`', 'topic notifications must fall back to the post detail route')
has(packageJson, '"test:topic-notifications"', 'package scripts must expose the topic notification guard')
has(packageJson, 'npm run test:topic-notifications', 'test:guards must include the topic notification guard')

console.log('topic notification frontend guards passed')
