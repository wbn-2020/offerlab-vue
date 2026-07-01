import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

const topicDetail = read('../src/views/TopicDetailView.vue')
const tagDetail = read('../src/views/TagDetailView.vue')
const explore = read('../src/views/ExploreView.vue')
const editor = read('../src/views/EditorView.vue')
const search = read('../src/views/SearchView.vue')
const adminGovernance = read('../src/views/AdminGovernanceView.vue')
const domains = read('../src/utils/domains.ts')
const router = read('../src/router/index.ts')
const packageJson = read('../package.json')

const firstRegion = (source, marker, closeMarker = '</section>') => {
  const start = source.indexOf(marker)
  assert.notEqual(start, -1, `marker not found: ${marker}`)
  const end = source.indexOf(closeMarker, start)
  assert.notEqual(end, -1, `section end not found after: ${marker}`)
  return source.slice(start, end)
}

const scriptRegion = (source, marker, length = 2600) => {
  const start = source.indexOf(marker)
  assert.notEqual(start, -1, `script marker not found: ${marker}`)
  return source.slice(start, Math.min(source.length, start + length))
}

const mojibakeMarkers = /�|Ã|Â|鏃|涓|绉|鎶| 技术栈锛|\?{3,}/

for (const [name, source] of [
  ['topic detail', topicDetail],
  ['tag detail', tagDetail],
  ['explore', explore],
  ['editor', editor],
  ['search', search],
  ['admin governance', adminGovernance],
  ['domains', domains],
]) {
  assert.doesNotMatch(source, mojibakeMarkers, `${name} must not contain user-visible mojibake markers`)
}

const topicHeader = firstRegion(topicDetail, '<section class="topic-header"')
const topicEmpty = firstRegion(topicDetail, '<div v-else class="empty-panel">', '</div>')
const topicTypeMap = scriptRegion(topicDetail, 'const topicTypeText')
assert.match(topicHeader, /社区话题/, 'topic detail header must use community topic language')
assert.match(topicHeader, /精选话题/, 'topic detail featured badge must use topic language')
assert.match(topicDetail, /关注话题/, 'topic follow action must use topic language')
assert.match(topicDetail, /话题内容/, 'topic content section must use topic language')
assert.doesNotMatch(topicHeader, /技术栈、业务场景|社区专题|精选专题|关注专题/, 'topic header must not foreground old technical topic positioning')
assert.doesNotMatch(topicEmpty, /发布相关技术经验|后台为专题绑定/, 'topic empty state must not push technical-only publishing')
assert.doesNotMatch(topicTypeMap, /return '技术栈'/, 'legacy tech_stack topic type must be remapped for general community display')
assert.match(topicEmpty, /去发现内容[\s\S]*搜索相似内容[\s\S]*发布内容/, 'topic empty state must link to discover, search, and publish')

const tagHeader = firstRegion(tagDetail, '<section class="tag-header"')
const tagFilter = firstRegion(tagDetail, '<section class="filter-panel"')
const tagEmpty = firstRegion(tagDetail, '<div v-else class="empty-panel">', '</div>')
assert.match(tagHeader, /标签索引 \/ 综合内容/, 'tag detail header must use general tag index language')
assert.match(tagHeader, /经验分享、问题求助、攻略清单、资源推荐、复盘记录和观点讨论/, 'tag detail description must cover general content types')
assert.match(tagFilter, /内容筛选/, 'tag detail filter section must not be called topic filtering')
assert.doesNotMatch(tagHeader, /专题 \/ 技术栈|技术文章/, 'tag detail must not look like a technical tag page')
assert.match(tagEmpty, /发现内容[\s\S]*搜索相关标签[\s\S]*发布内容/, 'tag empty state must link to discover, search, and publish')

const exploreChannelSection = firstRegion(explore, '<h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">频道广场</h2>', '</article>')
assert.match(explore, /route\.query\.channel/, 'explore must support channel query state')
assert.match(explore, /COMMUNITY_CHANNELS/, 'explore channel plaza must reuse community channels config')
assert.match(explore, /query:\s*\{\s*channel:\s*channel\.key\s*\}/, 'channel cards must route to /explore?channel=key')
assert.match(explore, /activeChannelPostTypeSet/, 'explore must support channels that aggregate multiple post types')
assert.match(explore, /visibleLatestPosts/, 'explore latest list must apply active channel post-type filtering')
assert.match(explore, /loadChannelLatestPosts/, 'explore must isolate latest-post loading for channel aggregation')
assert.match(explore, /Promise\.allSettled\(activeChannelPostTypes\.value\.map/, 'multi-type channels must fetch each post type instead of sampling one mixed page')
assert.match(exploreChannelSection, /代表话题|推荐标签|进入频道聚合|当前频道/, 'channel section must expose scoped topics or tags')
assert.doesNotMatch(exploreChannelSection, /\/channels\/|\/channel\//, 'phase 2 must not default to a new standalone channel page')

assert.match(domains, /topics:\s*\[/, 'community channels must include topic seeds')
assert.match(domains, /ALL_COMMUNITY_CHANNELS/, 'domain utils must expose unified community channel lookup')
assert.match(domains, /投资理财内容仅供经验交流，不构成投资建议/, 'secondary investment channel must keep risk notice')

assert.match(search, /postApi\.listTopics\(\{ limit: 30 \}\)/, 'search topics mode must reuse existing topic API')
assert.match(search, /postApi\.getTags\(\)/, 'search tags mode must reuse existing tag API')
assert.match(search, /shouldAutoRunSearch/, 'search must centralize auto-run conditions for direct links')
assert.match(search, /searchMode\.value === 'topics' \|\| searchMode\.value === 'tags'/, 'search direct links must auto-load topics and tags modes without a keyword')
assert.match(search, /if \(!shouldAutoRunSearch\.value\) return/, 'debounced search must also refresh empty topics and tags modes')
assert.match(search, /热门频道[\s\S]*热门话题[\s\S]*热门标签/, 'search empty state must recommend channels, topics, and tags')
assert.match(search, /path: '\/explore'[\s\S]*channel: channel\.key/, 'search channel recommendations must route through explore channel state')

assert.match(editor, /标签用于搜索和标签页聚合，话题会写入扩展字段/, 'editor quality checks must explain tags and topicNames linkage')
assert.match(editor, /setTimeout\(\(\) => \{[\s\S]*loadStageThreeAssist\(false\)/, 'editor channel/content changes must debounce-refresh assist suggestions')
assert.match(editor, /stageThreeAssistRequestId/, 'editor assist requests must use a request id to ignore stale responses')
assert.match(editor, /if \(requestId !== stageThreeAssistRequestId\) return/, 'editor assist must not let stale responses overwrite newer suggestions')
assert.match(editor, /开启后会在标题、正文、标签或频道变化时自动刷新建议/, 'editor assist copy must disclose automatic suggestion refresh')
assert.doesNotMatch(editor, /不会自动请求内容辅助|点击“刷新建议”后才会触发|不会自动触发建议请求/, 'editor assist copy must not promise manual-only suggestions when debounce auto-refresh is enabled')

const adminTopicForm = firstRegion(adminGovernance, '<form class="space-y-3" @submit.prevent="saveTopic">', '</form>')
const adminTagForm = firstRegion(adminGovernance, '<form class="space-y-3" @submit.prevent="saveTag">', '</form>')
const adminDefaults = scriptRegion(adminGovernance, 'const topicForm = reactive', 1200)
const adminDemo = scriptRegion(adminGovernance, 'const fillDemoTopicTemplate', 900)
const adminTypeText = scriptRegion(adminGovernance, 'const topicTypeText', 700)
assert.doesNotMatch(adminTopicForm, /Spring Boot 实战|Java,Spring Boot,Redis/, 'admin topic form placeholders must not default to backend technology examples')
assert.doesNotMatch(adminTagForm, />技术栈<\/option>|>公司<\/option>|>岗位<\/option>/, 'admin tag form labels must use general content categories')
assert.doesNotMatch(adminDefaults, /topicType:\s*'tech_stack'|tagType:\s*1/, 'admin create defaults must not start from tech-only categories')
assert.doesNotMatch(adminDemo, /Kafka|Redis|Java/, 'admin demo topic template must not be a backend technology-only template')
assert.match(adminDemo, /城市租房避坑清单|AI 工具实测|读书清单|转行经验|资源合集/, 'admin demo topic template must use a general community example')
assert.match(adminTypeText, /tech_stack:\s*'知识技能'/, 'admin legacy tech_stack display must be remapped to general wording')
assert.match(adminTypeText, /case 1: return '主题\/技能'/, 'admin legacy tag type display must be remapped to general wording')

assert.match(router, /path:\s*'\/topics\/:slug'[\s\S]*title:\s*'话题详情'/, 'topic detail route title must use topic language')
assert.match(router, /path:\s*'\/tag\/:slug'[\s\S]*title:\s*'标签详情'/, 'tag detail legacy route must remain reachable')
assert.match(packageJson, /"test:community-organization"/, 'package scripts must expose community organization guard')
assert.match(packageJson, /npm run test:community-organization/, 'test:guards must include community organization guard')

console.log('community organization guard passed')
