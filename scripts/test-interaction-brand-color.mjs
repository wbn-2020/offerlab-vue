import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

/**
 * 互动品牌色守卫：
 * 点赞/评论点赞的激活态与悬停态必须使用品牌森绿（primary），
 * 禁止玫红（rose/#f43f5e 等）回归——玫红仅保留给删除/错误/风险等语义场景。
 * 背景：2026-09-09 第三轮测评发现取消点赞后按钮因 hover 态与激活态同色
 * （均为玫红）导致状态不可区分，且玫红游离于品牌色系之外。
 */

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

const interactionBar = read('../src/components/post/InteractionBar.vue')
const postCard = read('../src/components/post/PostCard.vue')
const commentTree = read('../src/components/post/CommentTree.vue')
const postDetail = read('../src/views/PostDetailView.vue')

const ROSE_PATTERN = /rose|#f43f5e|#e11d48/i

/** 提取以 aria-label 含「点赞」的 <button> 区块 */
function likeButtonBlocks(source) {
  const blocks = []
  const re = /<button[\s\S]*?<\/button>/g
  let match
  while ((match = re.exec(source)) !== null) {
    if (match[0].includes('点赞')) blocks.push(match[0])
  }
  return blocks
}

// 1. 帖子点赞按钮（详情页互动栏 + 信息流卡片）：不得含玫红，激活态必须为 primary
for (const [name, source] of [['InteractionBar.vue', interactionBar], ['PostCard.vue', postCard]]) {
  const blocks = likeButtonBlocks(source)
  assert.ok(blocks.length >= 1, `${name} must contain a like button`)
  for (const block of blocks) {
    assert.doesNotMatch(block, ROSE_PATTERN, `${name} like button must not use rose color`)
    assert.match(block, /text-primary-600/, `${name} like button must use brand primary color`)
  }
}

// 2. 评论点赞按钮：同样要求
{
  const blocks = likeButtonBlocks(commentTree)
  assert.ok(blocks.length >= 2, 'CommentTree.vue must contain comment like buttons')
  for (const block of blocks) {
    assert.doesNotMatch(block, ROSE_PATTERN, 'CommentTree.vue comment like button must not use rose color')
    assert.match(block, /text-primary-600/, 'CommentTree.vue comment like button must use brand primary color')
  }
  // 删除按钮保留玫红语义色（危险操作），该守卫不强制收敛
  assert.match(commentTree, /删除[\s\S]{0,400}?hover:text-rose-600|hover:text-rose-600[\s\S]{0,400}?删除/, 'delete button keeps rose as danger semantic color')
}

// 3. 移动端吸底互动栏：is-liked 必须使用品牌色变量，禁止硬编码玫红
{
  const likedRule = postDetail.match(/\.post-mobile-action\.is-liked\s*\{[^}]*\}/)
  assert.ok(likedRule, 'mobile action bar must declare .is-liked rule')
  assert.doesNotMatch(likedRule[0], /#f43f5e|rose/i, 'mobile action bar is-liked must not use hardcoded rose')
  assert.match(likedRule[0], /--primary-600/, 'mobile action bar is-liked must use brand primary token')
}

console.log('interaction-brand-color guard: PASS')
