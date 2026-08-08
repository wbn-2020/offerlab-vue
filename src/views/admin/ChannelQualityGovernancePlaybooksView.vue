<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getErrorMessage } from '@/api/client'
import { channelQualityGovernancePlaybooksApi, type GovernancePlaybook, type PlaybookVersion } from '@/api/channelQualityGovernancePlaybooks'

const playbooks = ref<GovernancePlaybook[]>([])
const error = ref('')
const loading = ref(false)
const saving = ref(false)
const selectedId = ref('')
const reason = ref('')
const code = ref('')
const title = ref('')
const description = ref('')

const selected = computed(() => playbooks.value.find((item) => item.id === selectedId.value) ?? null)
const selectedVersion = computed<PlaybookVersion | null>(() => selected.value?.versions[0] ?? null)
const canCreate = computed(() => selected.value?.canCreateVersion === true)
const newIdempotencyKey = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`

const content = () => ({
  contentSchemaVersion: 'V44_PLAYBOOK_CONTENT_V1',
  title: title.value.trim(),
  description: description.value.trim(),
  scope: {
    domains: [], triggerTypes: [], riskCodes: [], rootCauseCategories: [], outcomeTypes: [],
    contentRecoveryStates: [], learningCategories: [], recurrenceRelationTypes: [], requiredFacts: [],
  },
  suggestedActions: [{
    actionKey: 'review-governance-evidence', actionType: 'REVIEW_EVIDENCE', title: 'Review governance evidence',
    instruction: 'Manually review the current V41 governance evidence before proceeding.',
    executionModeHint: 'MANUAL_ONLY', order: 10,
  }],
  requiredChecks: [],
  closeConditions: [{
    conditionKey: 'required-checks-terminal', conditionType: 'ALL_REQUIRED_CHECKS_TERMINAL',
    severity: 'BLOCKING', parameters: {}, order: 10,
  }],
  references: [],
})

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const result = await channelQualityGovernancePlaybooksApi.list()
    playbooks.value = result.data ?? []
    if (!selectedId.value && playbooks.value[0]) selectedId.value = playbooks.value[0].id
  } catch (cause) {
    error.value = getErrorMessage(cause, 'Unable to load governance playbooks')
  } finally {
    loading.value = false
  }
}

const create = async () => {
  if (!code.value.trim() || !title.value.trim() || !description.value.trim() || reason.value.trim().length < 2) return
  saving.value = true
  error.value = ''
  try {
    const result = await channelQualityGovernancePlaybooksApi.create({
      playbookCode: code.value.trim(), content: content(), reason: reason.value.trim(), idempotencyKey: newIdempotencyKey(),
    })
    selectedId.value = result.data?.id ?? ''
    code.value = ''
    title.value = ''
    description.value = ''
    await load()
  } catch (cause) {
    error.value = getErrorMessage(cause, 'Unable to create playbook')
  } finally {
    saving.value = false
  }
}

const publish = async () => {
  if (!selected.value || !selectedVersion.value || !selected.value.canPublish || reason.value.trim().length < 2) return
  saving.value = true
  error.value = ''
  try {
    await channelQualityGovernancePlaybooksApi.publish(selectedVersion.value.id, {
      expectedPlaybookVersion: selected.value.playbookVersion,
      expectedContentHash: selectedVersion.value.contentHash,
      reason: reason.value.trim(), idempotencyKey: newIdempotencyKey(),
    })
    await load()
  } catch (cause) {
    error.value = getErrorMessage(cause, 'Unable to publish playbook version')
  } finally {
    saving.value = false
  }
}

const retire = async () => {
  if (!selected.value || !selectedVersion.value || !selected.value.canRetire || reason.value.trim().length < 2) return
  saving.value = true
  error.value = ''
  try {
    await channelQualityGovernancePlaybooksApi.retire(selectedVersion.value.id, {
      expectedPlaybookVersion: selected.value.playbookVersion,
      expectedContentHash: selectedVersion.value.contentHash,
      reason: reason.value.trim(), idempotencyKey: newIdempotencyKey(),
    })
    await load()
  } catch (cause) {
    error.value = getErrorMessage(cause, 'Unable to retire playbook version')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <main class="playbook-page">
    <header class="page-heading">
      <div>
        <p class="eyebrow">Channel Quality</p>
        <h1>Governance Playbooks</h1>
      </div>
      <button class="icon-button" type="button" aria-label="Refresh playbooks" :disabled="loading || saving" @click="load">Refresh</button>
    </header>

    <p v-if="error" class="error-message">{{ error }}</p>

    <section class="workspace" aria-label="Governance playbook workspace">
      <aside class="playbook-list">
        <button
          v-for="playbook in playbooks"
          :key="playbook.id"
          type="button"
          class="playbook-row"
          :class="{ active: playbook.id === selectedId }"
          @click="selectedId = playbook.id"
        >
          <strong>{{ playbook.playbookCode }}</strong>
          <span>{{ playbook.versions[0]?.status ?? 'UNAVAILABLE' }} · v{{ playbook.versions[0]?.versionNo ?? '-' }}</span>
        </button>
        <p v-if="!loading && playbooks.length === 0" class="muted">No readable playbooks.</p>
      </aside>

      <section class="detail-panel">
        <template v-if="selected">
          <div class="detail-heading">
            <div>
              <p class="eyebrow">{{ selected.playbookCode }}</p>
              <h2>{{ selectedVersion?.contentSummary ?? 'Unavailable version' }}</h2>
            </div>
            <span class="status" :data-status="selectedVersion?.status">{{ selectedVersion?.status }}</span>
          </div>
          <dl v-if="selectedVersion" class="metadata">
            <div><dt>Version</dt><dd>{{ selectedVersion.versionNo }}</dd></div>
            <div><dt>Content hash</dt><dd class="hash">{{ selectedVersion.contentHash }}</dd></div>
          </dl>
          <p class="readonly-note">Published and retired content is immutable. New wording is created as a new draft version.</p>
          <div class="command-row">
            <button type="button" :disabled="saving || !selected.canPublish || selectedVersion?.status !== 'DRAFT' || reason.trim().length < 2" @click="publish">Publish</button>
            <button type="button" class="secondary" :disabled="saving || !selected.canRetire || !['DRAFT', 'PUBLISHED'].includes(selectedVersion?.status ?? '') || reason.trim().length < 2" @click="retire">Retire</button>
          </div>
        </template>
        <p v-else class="muted">Choose a playbook to inspect its immutable version history.</p>
      </section>
    </section>

    <section class="create-band" aria-label="Create playbook">
      <div>
        <p class="eyebrow">New Draft</p>
        <h2>Create a versioned playbook</h2>
      </div>
      <div class="form-grid">
        <label>Code<input v-model="code" maxlength="80" autocomplete="off"></label>
        <label>Title<input v-model="title" maxlength="100" autocomplete="off"></label>
        <label class="wide">Description<textarea v-model="description" maxlength="1000" rows="3" /></label>
        <label class="wide">Reason<input v-model="reason" maxlength="500" autocomplete="off"></label>
      </div>
      <button type="button" :disabled="saving || !code.trim() || !title.trim() || !description.trim() || reason.trim().length < 2" @click="create">Create Draft</button>
      <p v-if="selected && !canCreate" class="muted">The server did not grant draft creation capability.</p>
    </section>
  </main>
</template>

<style scoped>
.playbook-page { max-width: 1180px; margin: 0 auto; padding: 28px 20px 56px; color: var(--text-primary, #17221e); }
.page-heading, .detail-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.page-heading h1 { margin: 3px 0 0; font-size: 28px; line-height: 1.15; }
.eyebrow { margin: 0; color: #527361; font-size: 12px; font-weight: 700; letter-spacing: 0; text-transform: uppercase; }
.workspace { display: grid; grid-template-columns: minmax(210px, 0.35fr) minmax(0, 1fr); min-height: 330px; border: 1px solid #c9d4ce; margin-top: 22px; background: #fff; }
.playbook-list { border-right: 1px solid #c9d4ce; padding: 8px; }
.playbook-row { width: 100%; display: grid; gap: 5px; text-align: left; border: 0; border-left: 3px solid transparent; padding: 12px; background: transparent; color: inherit; cursor: pointer; }
.playbook-row:hover, .playbook-row.active { background: #eaf3ed; border-left-color: #217a4c; }
.playbook-row span, .muted, .readonly-note { color: #5c6b63; font-size: 13px; }
.detail-panel { padding: 24px; }
.detail-panel h2, .create-band h2 { margin: 4px 0 0; font-size: 18px; line-height: 1.35; }
.metadata { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 24px 0; }
.metadata div { border-top: 1px solid #d9e2dc; padding-top: 8px; }
.metadata dt { color: #607067; font-size: 12px; }
.metadata dd { margin: 3px 0 0; font-size: 14px; overflow-wrap: anywhere; }
.hash { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 12px !important; }
.status { border: 1px solid #99b3a3; padding: 4px 8px; font-size: 12px; font-weight: 700; }
.status[data-status='PUBLISHED'] { color: #17653e; border-color: #17653e; }
.status[data-status='RETIRED'] { color: #675b5b; border-color: #aa9999; }
.command-row { display: flex; gap: 8px; margin-top: 24px; }
button { border: 1px solid #1d5e3e; border-radius: 4px; background: #1d5e3e; color: #fff; padding: 8px 12px; font: inherit; cursor: pointer; }
button.secondary, .icon-button { background: #fff; color: #1d5e3e; }
button:disabled { opacity: .48; cursor: not-allowed; }
.create-band { margin-top: 28px; border-top: 3px solid #244e3c; padding-top: 18px; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 18px 0; }
label { display: grid; gap: 6px; color: #3f5047; font-size: 13px; font-weight: 700; }
input, textarea { width: 100%; box-sizing: border-box; border: 1px solid #aebdb4; border-radius: 3px; padding: 8px; color: inherit; font: inherit; font-weight: 400; background: #fff; }
.wide { grid-column: 1 / -1; }
.error-message { margin: 16px 0 0; border-left: 3px solid #a42f2f; padding: 8px 10px; color: #802525; background: #fff5f4; }
@media (max-width: 720px) { .workspace { grid-template-columns: 1fr; } .playbook-list { border-right: 0; border-bottom: 1px solid #c9d4ce; } .metadata, .form-grid { grid-template-columns: 1fr; } }
</style>
