import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const api = await readFile(new URL('../src/api/interaction.ts', import.meta.url), 'utf8')
const profile = await readFile(new URL('../src/views/MeProfileView.vue', import.meta.url), 'utf8')
const controller = await readFile(new URL('../../offerlab-java/community-domain-interaction/src/main/java/com/offerlab/community/interaction/controller/InteractionController.java', import.meta.url), 'utf8')
const service = await readFile(new URL('../../offerlab-java/community-domain-interaction/src/main/java/com/offerlab/community/interaction/application/InteractionFacadeImpl.java', import.meta.url), 'utf8')

assert.match(api, /reorderFavoriteFolders/, 'interaction API must expose atomic favorite folder reordering')
assert.match(api, /favorite-folders\/reorder/, 'atomic reorder must use one batch endpoint')
assert.match(profile, /reorderFavoriteFolders\(folders\.map\(folder => folder\.id\)\)/, 'profile must submit the complete order once')
assert.doesNotMatch(profile, /Promise\.all\(folders\.map[\s\S]*?sortFavoriteFolder/, 'profile must not partially commit independent sort requests')
assert.match(controller, /favorite-folders\/reorder/, 'backend must expose the atomic reorder endpoint')
assert.match(service, /@Transactional[\s\S]*?reorderFavoriteFolders/, 'backend reorder must be transactional')
assert.match(service, /请提交全部可排序收藏夹的完整顺序/, 'backend must reject stale or partial order submissions')

console.log('favorite folder atomic reorder guard passed')
