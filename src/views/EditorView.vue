<template>
  <div class="app-shell editor-page">
    <AppHeader />
    <!-- 编辑工具条 -->
    <div class="editor-toolbar-shell bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <div class="community-page editor-toolbar-inner flex items-center justify-between">
        <div class="editor-toolbar-title flex items-center gap-4">
          <button
            @click="goBack"
            class="editor-back-button p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            ← 返回
          </button>
          <h1 class="editor-heading text-xl font-bold text-slate-900 dark:text-slate-100">
            {{ isEditing ? '编辑内容' : '发布内容' }}
          </h1>
        </div>
        <div class="editor-toolbar-actions flex flex-wrap items-center justify-end gap-3">
          <select
            v-if="!isEditing && serverDrafts.length"
            v-model="selectedDraftId"
            @change="loadSelectedDraft"
            class="draft-select"
            aria-label="服务端草稿"
          >
            <option value="">服务端草稿</option>
            <option v-for="draft in serverDrafts" :key="draft.id" :value="String(draft.id)">{{ draftTitle(draft) }}</option>
          </select>
          <button
            @click="saveDraft"
            :disabled="isSavingDraft || isLoadingPost"
            class="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
          >
            {{ isSavingDraft ? '保存中...' : '保存草稿' }}
          </button>
          <div class="publish-action-group">
            <button
              @click="publishPost"
              :disabled="isPublishDisabled"
              :title="publishDisabledReason || undefined"
              :aria-describedby="publishDisabledReason ? 'publish-disabled-reason' : undefined"
              class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {{ isPublishing ? (isEditing ? '保存中...' : '发布中...') : (isEditing ? '保存修改' : '发布') }}
            </button>
            <div
              v-if="publishDisabledReason && !isPublishing"
              id="publish-disabled-reason"
              :class="['publish-hint', { 'publish-hint--neutral': isInitialComposeState }]"
              role="status"
              aria-live="polite"
            >
              <template v-if="publishIssues.length > 1">
                <span class="publish-hint__lead">请先修正以下问题：</span>
                <ul class="publish-issue-list">
                  <li
                    v-for="issue in publishIssues"
                    :key="issue.field"
                    class="publish-issue-list__item"
                  >
                    <span class="publish-issue-list__field">{{ issue.label }}</span>
                    <span>{{ issue.message }}</span>
                  </li>
                </ul>
              </template>
              <template v-else>{{ publishDisabledReason }}</template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 主体内容 -->
    <main v-if="isForbiddenEdit" class="community-page flex min-h-[calc(100vh-160px)] items-center py-10">
      <section class="w-full surface-card rounded-xl border-amber-200 p-8 text-center shadow-sm dark:border-amber-900/60">
        <p class="text-sm font-semibold text-amber-600 dark:text-amber-400">无法编辑该帖子</p>
        <h2 class="mt-3 text-2xl font-bold text-slate-950 dark:text-slate-50">只能编辑本人发布的内容</h2>
        <p class="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          当前账号不是这篇帖子的作者。你可以返回来源页面继续浏览，或回到个人主页管理自己的草稿和发布内容。
        </p>
        <div class="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" class="forbidden-secondary-action" @click="goBack">返回来源页</button>
          <RouterLink to="/me" class="forbidden-primary-action">我的主页</RouterLink>
          <RouterLink to="/" class="forbidden-secondary-action">回到首页</RouterLink>
        </div>
      </section>
    </main>

    <main v-else class="community-page editor-main-shell">
      <section v-if="pendingLocalDraft" class="local-draft-recovery" aria-labelledby="local-draft-recovery-title">
        <div>
          <p>发现浏览器本地草稿</p>
          <h2 id="local-draft-recovery-title">是否恢复上次未完成的内容？</h2>
          <span>这份草稿仅保存在当前浏览器，最近保存于 {{ pendingLocalDraftSavedAt }}，尚未写入编辑器。</span>
        </div>
        <div class="local-draft-recovery-actions">
          <button type="button" class="local-draft-recovery-primary" @click="restorePendingLocalDraft">恢复草稿</button>
          <button type="button" class="local-draft-recovery-secondary" @click="discardPendingLocalDraft">放弃草稿</button>
        </div>
      </section>

      <div v-else class="editor-workspace">
        <div class="editor-compose-layout">
          <section class="editor-compose-main">
        <!-- 标题输入 -->
        <div class="flex flex-col gap-2">
          <input
            :value="form.title"
            type="text"
            :maxlength="EDITOR_LIMITS.titleMax"
            :placeholder="activePostType.placeholder"
            data-field="title"
            :aria-invalid="Boolean(fieldErrors.title)"
            :aria-describedby="fieldErrors.title ? 'editor-title-error' : undefined"
            @input="handleTitleInput"
            @paste="handleTitlePaste"
            @compositionstart="handleTitleCompositionStart"
            @compositionend="handleTitleCompositionEnd"
            class="editor-title-input text-3xl font-bold px-4 py-3 border-0 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none"
          />
          <p v-if="fieldErrors.title" id="editor-title-error" class="field-error px-4">{{ fieldErrors.title }}</p>
          <div class="text-sm text-slate-500 dark:text-slate-400 px-4">
            {{ form.title.length }} / {{ EDITOR_LIMITS.titleMax }} 字符
          </div>
        </div>

        <!-- 内容类型 Tab -->
        <div class="content-type-tabs flex min-w-0 max-w-full gap-2 overflow-x-auto border-b border-slate-200 px-4 dark:border-slate-800">
          <button
            v-for="type in postTypes"
            :key="type.value"
            @click="form.postType = type.value"
            :disabled="isEditing"
            :class="[
              'content-type-tab shrink-0 whitespace-nowrap px-4 py-3 font-medium text-sm transition-colors border-b-2',
              form.postType === type.value
                ? 'text-primary-600 border-primary-600'
                : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            ]"
          >
            {{ type.label }}
          </button>
        </div>

        <section v-if="hasEditorAssistContext" class="editor-assist-context mx-4">
          <div>
            <p>{{ editorAssistContextSource || '编辑器上下文' }}</p>
            <strong>{{ editorAssistContextTitle }}</strong>
            <span>{{ editorAssistContextCopy }}</span>
            <small v-if="editorAssistContextResult.degraded">部分辅助信息暂不可用，你仍可继续手动编辑。</small>
          </div>
          <RouterLink v-if="editorAssistReturnHref" :to="editorAssistReturnHref">返回来源</RouterLink>
        </section>

        <section v-if="hasEditorSearchGapContext" class="editor-assist-context mx-4">
          <div>
            <p>{{ editorSearchGapContextTitle }}</p>
            <strong>{{ editorSearchGapKeyword }}</strong>
            <span>{{ editorSearchGapContextCopy }}</span>
            <small>仅作为辅助上下文，正文与发布仍需手动确认，也不承诺收录、精选、曝光、收益或排名。</small>
          </div>
          <RouterLink v-if="editorSearchGapReturnHref" :to="editorSearchGapReturnHref">返回来源</RouterLink>
        </section>

        <section v-if="isEditing" class="public-update-editor mx-4" aria-labelledby="public-update-editor-title">
          <div class="public-update-editor-head">
            <div>
              <p>公开更新记录</p>
              <strong id="public-update-editor-title">说明这次修改解决了什么</strong>
              <span>摘要会随新版本公开展示；不会公开旧正文、私密建议或审核信息。</span>
            </div>
            <RouterLink v-if="editorAssistReturnHref" :to="editorAssistReturnHref">返回内容详情</RouterLink>
          </div>
          <div v-if="respondedSuggestionIds.length" class="public-update-source">
            本次编辑关联 {{ respondedSuggestionIds.length }} 条读者建议。保存成功后，这些建议才会标记为已合并。
          </div>
          <div class="public-update-fields">
            <label>
              <span>公开更新摘要</span>
              <textarea
                v-model="publicUpdateSummary"
                data-field="publicUpdateSummary"
                rows="3"
                maxlength="240"
                placeholder="例如：补充适用条件并更新失效链接"
              />
              <small>{{ publicUpdateSummary.length }} / 240</small>
            </label>
            <label>
              <span>影响范围</span>
              <select v-model="updateImpactScope">
                <option value="CONTENT">正文说明</option>
                <option value="CONCLUSION">结论或建议</option>
                <option value="CONDITIONS">适用条件</option>
                <option value="SOURCES">来源或链接</option>
                <option value="FULL_CONTENT">整体更新</option>
              </select>
              <small>不填写摘要时，本次编辑仍会保留私有版本历史，但不会生成公开更新记录。</small>
            </label>
          </div>
          <p v-if="publicUpdateError" class="field-error">{{ publicUpdateError }}</p>
        </section>

        <section class="template-helper mx-4">
          <div>
            <p>公共内容模板</p>
            <strong>{{ activeTemplate.title }}</strong>
            <span>{{ activeTemplate.description }}</span>
            <small>{{ activeTemplateBoundary }}</small>
            <div class="template-chip-row">
              <button
                v-for="tag in activeTemplate.recommendedTags"
                :key="`tag-${tag}`"
                type="button"
                class="template-chip"
                @click="applyTemplateTag(tag)"
              >
                # {{ tag }}
              </button>
              <button
                v-for="topic in activeTemplate.recommendedTopics"
                :key="`topic-${topic}`"
                type="button"
                class="template-chip template-chip-topic"
                @click="applyTemplateTopic(topic)"
              >
                {{ topic }}
              </button>
            </div>
          </div>
          <div class="template-control-group">
            <select v-model="selectedAssistTemplateCode" class="template-select" aria-label="公共内容模板">
              <option value="">按上下文推荐</option>
              <option v-for="template in assistTemplateOptions" :key="template.code" :value="template.code">
                {{ template.title }}
              </option>
            </select>
            <button type="button" :disabled="Boolean(form.content.trim())" @click="applyActiveTemplate">
              {{ form.content.trim() ? '正文已有内容' : '套用模板' }}
            </button>
            <button type="button" @click="replaceWithActiveTemplate">
              {{ form.content.trim() ? '切换模板' : '写入模板' }}
            </button>
            <button type="button" :disabled="!form.content.trim()" @click="clearTemplateDraft">清空正文</button>
            <button type="button" @click="cancelSelectedTemplate">取消选择</button>
          </div>
        </section>

        <section class="editor-writing-body" data-field="content">
          <MarkdownEditor v-model="form.content" :max-length="CONTENT_MAX_LENGTH" />
          <p v-if="fieldErrors.content" class="field-error mt-2">{{ fieldErrors.content }}</p>
        </section>
          </section>

          <aside class="editor-compose-rail">
        <!-- 领域选择 -->
        <section class="editor-rail-section editor-domain-field flex flex-col gap-2">
          <label class="text-sm font-medium text-slate-700 dark:text-slate-300">频道</label>
          <select
            v-model="selectedDomain"
            data-field="domain"
            class="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option :value="undefined">请选择频道</option>
            <option v-for="d in editorDomainOptions" :key="d.domain" :value="d.domain">
              {{ d.icon }} {{ d.domainName }} — {{ d.description }}
            </option>
          </select>
          <p class="domain-source-note">
            <span v-if="selectedDomainMeta?.postingNotice">{{ selectedDomainMeta.postingNotice }}</span>
            <span v-else>选择最贴近内容主题的频道，方便其他人发现和参与讨论。</span>
          </p>
          <p v-if="fieldErrors.domain" class="field-error">{{ fieldErrors.domain }}</p>
        </section>

        <section v-if="selectedDomain === DOMAIN.CAREER" class="editor-rail-section anonymous-career-toggle">
          <div>
            <p>匿名发布</p>
            <span>适合不便公开身份的职场内容，作者信息由服务端按权限处理。</span>
          </div>
          <label class="anonymous-career-switch">
            <input v-model="anonymousCareerPost" type="checkbox" aria-label="匿名发布职场内容" />
            <span></span>
          </label>
        </section>

        <section class="editor-rail-section editor-tag-section">
          <label class="editor-rail-label">标签</label>
          <div class="tag-entry-row flex gap-2">
            <input
              v-model="tagInput"
              type="text"
              :placeholder="tagInputPlaceholder"
              @keydown.enter="addTag"
              class="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              data-field="tags"
            />
            <button
              type="button"
              class="editor-tag-add"
              @click="addTag"
            >
              添加
            </button>
          </div>
          <div v-if="selectedTags.length" class="editor-selected-tags">
            <span v-for="(tag, idx) in selectedTags" :key="idx">
              {{ tag }}
              <button type="button" :aria-label="`移除标签 ${tag}`" @click="removeTag(idx)">×</button>
            </span>
          </div>
          <p v-else class="editor-rail-note">最多添加 5 个与正文直接相关的标签。</p>
          <p v-if="fieldErrors.tags" class="field-error">{{ fieldErrors.tags }}</p>
        </section>

        <section class="editor-rail-section editor-cover-section">
          <label class="editor-rail-label">封面图 <span>可选</span></label>
          <input
            v-model="form.coverUrl"
            type="url"
            placeholder="输入图片 URL"
            data-field="coverUrl"
            :aria-invalid="Boolean(fieldErrors.coverUrl)"
            class="editor-cover-input"
          />
          <p v-if="fieldErrors.coverUrl" class="field-error">{{ fieldErrors.coverUrl }}</p>
          <div v-if="form.coverUrl && !formCoverHasFailed" class="editor-cover-preview">
            <img :src="form.coverUrl" :alt="form.title" @error="handleFormCoverError" />
          </div>
          <p v-else-if="form.coverUrl" class="editor-cover-fallback" role="status">
            {{ formCoverFallbackText }}
          </p>
        </section>

        <section class="editor-rail-section editor-rail-checklist">
          <div class="editor-rail-checklist__head">
            <div>
              <p>发布前检查</p>
              <strong>{{ passedQualityCount }}/{{ qualityChecks.length }} 已通过</strong>
            </div>
            <span :class="blockingQualityIssues.length ? 'is-warning' : 'is-ready'">
              {{ blockingQualityIssues.length ? `${blockingQualityIssues.length} 项待处理` : '可以发布' }}
            </span>
          </div>
          <div class="editor-rail-checklist__items">
            <div
              v-for="item in railQualityChecks"
              :key="`rail-${item.key}`"
              :class="{ 'is-passed': item.passed }"
            >
              <span>{{ item.passed ? '✓' : '·' }}</span>
              <p>{{ item.title }}</p>
              <button
                v-if="!item.passed"
                type="button"
                :aria-label="`定位到${item.title}`"
                @click="focusQualityCheck(item.key)"
              >
                定位
              </button>
            </div>
          </div>
        </section>
          </aside>
        </div>

        <details class="editor-advanced-disclosure">
          <summary class="editor-advanced-summary">
            <div>
              <strong>高级选项</strong>
              <span>需要时再补充内容结构、来源、公开预览、写作建议与合集归属；不影响先完成标题、正文和频道。</span>
            </div>
            <span class="editor-advanced-summary__action">展开</span>
          </summary>
          <div class="editor-advanced-stack">
        <!-- 内容元数据 -->
        <div class="px-4">
          <PostMeta
            v-model="form.extension"
            :type="form.postType"
            :errors="{ summary: fieldErrors.summary }"
            @field-change="handleMetaFieldChange"
          />
          <div v-if="metaErrorMessages.length" data-field="company" class="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
            <p v-for="message in metaErrorMessages" :key="message">{{ message }}</p>
          </div>
        </div>

        <section class="mx-4 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/70 dark:bg-emerald-950/20">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p class="text-xs font-extrabold text-emerald-700 dark:text-emerald-300">可信经验护照</p>
              <h2 class="mt-1 text-sm font-extrabold text-slate-900 dark:text-slate-100">说明这份经验来自哪里、适用于谁</h2>
              <p class="mt-1 max-w-3xl text-xs leading-5 text-slate-600 dark:text-slate-300">
                这是经验背景和边界说明，不是认证、资质或平台背书。不填写不会阻断发布。
              </p>
            </div>
            <label class="inline-flex min-h-10 shrink-0 items-center gap-2 text-sm font-bold text-emerald-800 dark:text-emerald-200">
              <input v-model="trustProfileEnabled" type="checkbox" />
              {{ trustProfileEnabled ? '已加入护照' : '为内容补充护照' }}
            </label>
          </div>

          <div v-if="trustProfileEnabled" class="mt-4 grid gap-4 md:grid-cols-2">
            <label class="grid gap-1 text-sm font-bold text-slate-700 dark:text-slate-200">
              你与这段经验的关系
              <select v-model="trustProfileDraft.authorRole" class="field-input">
                <option value="PARTICIPANT">亲历参与者</option>
                <option value="PRACTITIONER">持续实践者</option>
                <option value="OBSERVER">观察记录者</option>
                <option value="CURATOR">资料整理者</option>
              </select>
            </label>
            <div class="grid grid-cols-2 gap-3">
              <label class="grid gap-1 text-sm font-bold text-slate-700 dark:text-slate-200">
                经历开始
                <input v-model="trustProfileDraft.experienceStartAt" type="datetime-local" :max="trustProfileMaxDateTime" class="field-input" />
              </label>
              <label class="grid gap-1 text-sm font-bold text-slate-700 dark:text-slate-200">
                经历结束
                <input v-model="trustProfileDraft.experienceEndAt" type="datetime-local" :max="trustProfileMaxDateTime" class="field-input" />
              </label>
            </div>
            <label class="grid gap-1 text-sm font-bold text-slate-700 dark:text-slate-200">
              适用人群
              <input v-model.trim="trustProfileDraft.applicableAudience" maxlength="500" class="field-input" placeholder="例如：第一次独立租房、准备转行、长期远程办公的人" />
            </label>
            <label class="grid gap-1 text-sm font-bold text-slate-700 dark:text-slate-200">
              适用情境
              <input v-model.trim="trustProfileDraft.applicableContext" maxlength="1000" class="field-input" placeholder="说明地区、时间、预算、工具或其他前提" />
            </label>
            <label class="grid gap-1 text-sm font-bold text-slate-700 dark:text-slate-200">
              过程概述
              <textarea v-model.trim="trustProfileDraft.processSummary" rows="3" maxlength="2000" class="field-input" placeholder="你实际做了什么，经历了哪些步骤" />
            </label>
            <label class="grid gap-1 text-sm font-bold text-slate-700 dark:text-slate-200">
              结果概述
              <textarea v-model.trim="trustProfileDraft.outcomeSummary" rows="3" maxlength="2000" class="field-input" placeholder="结果如何，哪些变化可以观察或复核" />
            </label>
            <label class="grid gap-1 text-sm font-bold text-slate-700 dark:text-slate-200">
              已知限制
              <textarea v-model.trim="trustProfileDraft.knownLimitations" rows="3" maxlength="2000" class="field-input" placeholder="哪些条件变化后可能不再适用" />
            </label>
            <label class="grid gap-1 text-sm font-bold text-slate-700 dark:text-slate-200">
              来源说明
              <textarea v-model.trim="trustProfileDraft.sourceSummary" rows="3" maxlength="1000" class="field-input" placeholder="可核对的公开来源、记录方式或资料范围" />
            </label>
            <label class="grid gap-1 text-sm font-bold text-slate-700 dark:text-slate-200 md:col-span-2">
              利益关系披露
              <textarea v-model.trim="trustProfileDraft.interestDisclosure" rows="2" maxlength="1000" class="field-input" placeholder="是否收到样品、赞助、雇佣关系或存在其他可能影响判断的关系" />
            </label>
          </div>
        </section>

        <section id="references" class="post-reference-editor mx-4" aria-labelledby="post-reference-editor-title">
          <div class="post-reference-editor-head">
            <div>
              <p class="post-reference-kicker">来源维护</p>
              <h2 id="post-reference-editor-title">来源与证据清单</h2>
              <span v-if="isEditing">可在这里新增、编辑或删除这篇帖子的公开来源；来源不会改变正文发布流程。</span>
              <span v-else>新建帖子尚未生成 postId，来源暂不可维护。请先发布内容，再回到编辑页补充来源。</span>
            </div>
            <button
              v-if="isEditing"
              type="button"
              class="post-reference-icon-button"
              title="刷新来源清单"
              aria-label="刷新来源清单"
              :disabled="postReferencesLoading || postReferenceSaving"
              @click="loadPostReferences()"
            >
              <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': postReferencesLoading }" />
            </button>
          </div>

          <template v-if="isEditing">
            <p v-if="postReferenceError" class="post-reference-error" role="alert">{{ postReferenceError }}</p>

            <form v-if="postReferenceEditing" class="post-reference-form" @submit.prevent="savePostReference">
              <div class="post-reference-form-grid">
                <label>
                  <span>来源标题</span>
                  <input
                    v-model.trim="postReferenceDraft.title"
                    type="text"
                    maxlength="255"
                    placeholder="例如：官方文档或公开报告"
                    required
                  >
                </label>
                <label>
                  <span>来源类型</span>
                  <select v-model="postReferenceDraft.referenceType">
                    <option v-for="item in postReferenceTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
                  </select>
                </label>
                <label class="post-reference-form-wide">
                  <span>公开链接</span>
                  <input
                    v-model.trim="postReferenceDraft.url"
                    type="url"
                    maxlength="2048"
                    placeholder="https://..."
                    required
                  >
                </label>
                <label>
                  <span>状态</span>
                  <select v-model="postReferenceDraft.referenceStatus">
                    <option value="ACTIVE">可访问</option>
                    <option value="BROKEN">需要核查</option>
                  </select>
                </label>
                <label class="post-reference-form-wide">
                  <span>备注 <small>可选</small></span>
                  <textarea v-model.trim="postReferenceDraft.note" rows="2" maxlength="1000" placeholder="说明这条来源支持了正文中的哪一部分" />
                </label>
                <label v-if="postReferenceDraft.referenceStatus === 'BROKEN'" class="post-reference-form-wide">
                  <span>失效原因 <small>可选</small></span>
                  <input v-model.trim="postReferenceDraft.brokenReason" maxlength="500" placeholder="例如：链接需要登录或页面已移除">
                </label>
              </div>
              <div class="post-reference-form-actions">
                <button type="button" class="post-reference-secondary-button" :disabled="postReferenceSaving" @click="cancelPostReferenceEdit">
                  <X class="h-4 w-4" />
                  取消
                </button>
                <button type="submit" class="post-reference-primary-button" :disabled="postReferenceSaving">
                  <Loader2 v-if="postReferenceSaving" class="h-4 w-4 animate-spin" />
                  <Save v-else class="h-4 w-4" />
                  {{ postReferenceSaving ? '保存中...' : postReferenceEditingId ? '保存修改' : '添加来源' }}
                </button>
              </div>
            </form>

            <div v-else class="post-reference-toolbar">
              <p v-if="postReferencesLoading" role="status">正在读取来源清单...</p>
              <p v-else-if="!postReferences.length">还没有来源。补充可核对的公开链接，有助于读者理解内容依据。</p>
              <p v-else>共 {{ postReferences.length }} 条来源，按服务端保存顺序展示。</p>
              <button type="button" class="post-reference-primary-button" :disabled="postReferenceSaving" @click="startNewPostReference">
                <Plus class="h-4 w-4" />
                添加来源
              </button>
            </div>

            <ul v-if="!postReferencesLoading && postReferences.length" class="post-reference-list">
              <li v-for="item in sortedPostReferences" :key="item.id" class="post-reference-item">
                <div class="post-reference-item-main">
                  <div class="post-reference-item-title-row">
                    <a :href="item.url" target="_blank" rel="noopener noreferrer">{{ item.title }}</a>
                    <ExternalLink class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  </div>
                  <p class="post-reference-meta">
                    <span>{{ postReferenceTypeLabel(item.referenceType) }}</span>
                    <span>{{ item.sourceDomain || '来源域名待识别' }}</span>
                    <span :class="item.referenceStatus === 'BROKEN' ? 'post-reference-status-broken' : 'post-reference-status-active'">
                      {{ postReferenceStatusLabel(item.referenceStatus) }}
                    </span>
                  </p>
                  <p v-if="item.note" class="post-reference-note">{{ item.note }}</p>
                  <p v-if="item.brokenReason" class="post-reference-broken-reason">{{ item.brokenReason }}</p>
                </div>
                <div class="post-reference-item-actions">
                  <button
                    type="button"
                    class="post-reference-icon-button"
                    title="上移来源"
                    :aria-label="`上移来源：${item.title}`"
                    :disabled="postReferenceSaving || sortedPostReferences[0]?.id === item.id"
                    @click="movePostReference(item.id, -1)"
                  >
                    <ArrowUp class="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    class="post-reference-icon-button"
                    title="下移来源"
                    :aria-label="`下移来源：${item.title}`"
                    :disabled="postReferenceSaving || sortedPostReferences[sortedPostReferences.length - 1]?.id === item.id"
                    @click="movePostReference(item.id, 1)"
                  >
                    <ArrowDown class="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    class="post-reference-icon-button"
                    title="编辑来源"
                    :aria-label="`编辑来源：${item.title}`"
                    :disabled="postReferenceSaving || postReferenceDeletingId === item.id"
                    @click="startEditPostReference(item)"
                  >
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    class="post-reference-icon-button post-reference-delete-button"
                    title="删除来源"
                    :aria-label="`删除来源：${item.title}`"
                    :disabled="postReferenceSaving || postReferenceDeletingId === item.id"
                    @click="deletePostReference(item)"
                  >
                    <Loader2 v-if="postReferenceDeletingId === item.id" class="h-4 w-4 animate-spin" />
                    <Trash2 v-else class="h-4 w-4" />
                  </button>
                </div>
              </li>
            </ul>
          </template>
        </section>

        <section class="mx-4 grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:items-start">
          <div class="space-y-4">
            <EditorQualityChecklist
              :result="qualityChecklistResult"
              title="创作质量检查清单 Lite"
              eyebrow="发布前检查"
              tone="soft"
            />

            <section class="surface-card rounded-lg p-4">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h2 class="text-sm font-extrabold text-slate-900 dark:text-slate-100">当前发布门禁</h2>
                  <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Lite 清单只做提示；发布按钮继续沿用当前基础校验与结构化要求，不额外新增服务端依赖。</p>
                </div>
                <span :class="['quality-score', blockingQualityIssues.length ? 'quality-score-warn' : 'quality-score-ok']">
                  {{ passedQualityCount }}/{{ qualityChecks.length }}
                </span>
              </div>
              <p class="mt-3 text-sm text-slate-600 dark:text-slate-300">
                {{ publishDisabledReason || '当前基础门禁已满足，可继续优化摘要、标签、匿名提示和合集归属。' }}
              </p>
              <div class="mt-3 grid gap-2">
                <div
                  v-for="item in publishGateItems"
                  :key="item.key"
                  class="quality-row"
                  :class="item.passed ? 'quality-row-ok' : item.required ? 'quality-row-blocking' : ''"
                >
                  <span>{{ item.passed ? '✓' : item.required ? '!' : '·' }}</span>
                  <div>
                    <strong>{{ item.title }}</strong>
                    <p>{{ item.description }}</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <EditorPreviewPanel
            :preview="editorPreviewModel"
            eyebrow="公开卡片预览"
            title="发布前预览与公开卡片预览"
            description="基于当前标题、正文、频道、标签、匿名状态和合集归属做前端实时映射；开启后会在标题、正文、标签或频道变化时自动刷新建议。"
          />
        </section>

        <section class="stage3-assist-panel mx-4">
          <div class="stage3-assist-head">
            <div>
              <p class="stage3-assist-kicker">发布体验助手</p>
              <h2>写作助手</h2>
              <p>{{ stageThreeAssistHeadline }}</p>
            </div>
            <div class="stage3-assist-head-actions">
              <span :class="['assist-status-pill', `assist-status-${stageThreeAssistStatus}`]">
                {{ stageThreeAssistStatusLabel }}
              </span>
              <span v-if="stageThreeAssist?.sourceLabel" class="assist-status-pill">
                {{ stageThreeAssist.sourceLabel }}
              </span>
              <button type="button" class="assist-head-button" @click="toggleAssistPanelEnabled">
                {{ assistPanelEnabled ? '关闭建议' : '开启建议' }}
              </button>
              <button
                type="button"
                class="assist-head-button"
                :disabled="!authStore.isLoggedIn || !assistPanelEnabled || isStageThreeAssistLoading"
                @click="loadStageThreeAssist(true)"
              >
                {{ isStageThreeAssistLoading ? '加载中...' : '刷新建议' }}
              </button>
              <button
                type="button"
                class="assist-head-button assist-head-button-primary"
                :disabled="!canRunExplicitAiEnhancement"
                :title="explicitAiUnavailableReason"
                @click="runExplicitAiEnhancement"
              >
                {{ explicitAiActionLabel }}
              </button>
            </div>
          </div>
          <p class="stage3-quota-copy" aria-live="polite">{{ explicitAiHint }}</p>
          <p class="stage3-quota-copy">
            点击“AI 增强建议”会将当前标题、正文、标签和创作上下文发送至已配置的 AI 服务处理；请勿填写个人简历、职位 JD 或其他私人材料。
          </p>
          <p v-if="isExplicitAiResultStale" class="stage3-quota-copy stage3-quota-copy-warning">
            当前内容已更新，AI 增强结果基于之前的草稿版本，请人工判断后再采纳。
          </p>
          <div v-if="enhancedAssistRecovery" class="stage3-assist-state stage3-assist-recovery">
            <strong>{{ enhancedAssistRecoveryTitle }}</strong>
            <p>{{ enhancedAssistRecoveryDetail }}</p>
            <div
              v-if="enhancedAssistRecovery.matchesCurrentDraft && (enhancedAssistRecovery.requestStatus === 'RUNNING' || enhancedAssistRecovery.usageStatus === 'RESERVED')"
              class="stage3-actions"
            >
              <button
                type="button"
                :disabled="isEnhancedAssistRecoveryLoading"
                @click="refreshRecoveredEnhancedAssist"
              >
                {{ isEnhancedAssistRecoveryLoading ? '查询中...' : '刷新履约状态' }}
              </button>
            </div>
            <p v-if="enhancedAssistRecoveryError" class="stage3-quota-copy stage3-quota-copy-warning">
              {{ enhancedAssistRecoveryError }}
            </p>
          </div>

          <div v-if="!authStore.isLoggedIn" class="stage3-assist-state">
            <strong>未登录</strong>
            <p>登录后可获得写作助手、质量评分、标签/话题建议和合集归属建议。</p>
          </div>
          <div v-else-if="!assistPanelEnabled && !stageThreeAssist" class="stage3-assist-state">
            <strong>建议已关闭</strong>
            <p>发布建议默认关闭。当前仅保留发布检查、草稿保护和手动填写流程；显式开启后，如后端未配置建议服务将自动回退到规则建议。</p>
          </div>
          <div v-else-if="isStageThreeAssistLoading" class="stage3-assist-state">
            <strong>加载中...</strong>
            <p>正在生成写作助手、质量评分和合集归属建议。</p>
          </div>
          <div v-else-if="stageThreeAssistStatus === 'failed'" class="stage3-assist-state stage3-assist-state-error">
            <strong>建议暂时不可用</strong>
            <p>{{ stageThreeAssistError || '当前建议加载失败，你仍然可以继续编辑并依赖现有发布检查。' }}</p>
          </div>
          <div v-else class="stage3-assist-grid">
            <article class="stage3-card">
              <div class="stage3-card-head">
                <strong>写作助手</strong>
                <span v-if="stageThreeAssistStatus === 'degraded'">规则降级</span>
              </div>
              <p class="stage3-card-copy">{{ assistSummaryText }}</p>
              <div class="stage3-actions">
                <button type="button" :disabled="!assistSummaryText" @click="applyAssistSummary">
                  {{ assistSummaryAdopted ? '已采纳摘要建议' : '采纳摘要建议' }}
                </button>
                <button type="button" @click="copyKnowledgeAssist">复制辅助草稿</button>
              </div>
            </article>

            <article class="stage3-card">
              <div class="stage3-card-head">
                <strong>质量评分</strong>
                <span class="stage3-quality-badge">{{ qualityScoreValue }}</span>
              </div>
              <p class="stage3-card-copy">{{ qualityScoreLabel }} · {{ qualityScoreReason }}</p>
              <div class="stage3-metric-list">
                <div v-for="metric in assistQualityMetrics" :key="metric.label" class="stage3-metric-row">
                  <div>
                    <strong>{{ metric.label }}</strong>
                    <p>{{ metric.detail }}</p>
                  </div>
                  <span>{{ metric.score }}</span>
                </div>
              </div>
            </article>

            <article class="stage3-card">
              <div class="stage3-card-head">
                <strong>标签建议</strong>
                <span>{{ displayTagSuggestions.length }} 条</span>
              </div>
              <div v-if="displayTagSuggestions.length" class="stage3-chip-list">
                <button
                  v-for="item in displayTagSuggestions"
                  :key="item.id"
                  type="button"
                  :class="['stage3-chip', item.adopted ? 'stage3-chip-adopted' : '']"
                  @click="applyTagSuggestion(item)"
                >
                  <span>{{ item.label }}</span>
                  <small>{{ item.adopted ? '已采纳' : '采纳' }}</small>
                </button>
              </div>
              <p v-else class="stage3-empty-copy">继续补充正文后，这里会出现更贴合内容的标签建议。</p>
            </article>

            <article class="stage3-card">
              <div class="stage3-card-head">
                <strong>话题建议</strong>
                <span>{{ displayTopicSuggestions.length }} 条</span>
              </div>
              <div v-if="displayTopicSuggestions.length" class="stage3-chip-list">
                <button
                  v-for="item in displayTopicSuggestions"
                  :key="item.id"
                  type="button"
                  :class="['stage3-chip', item.adopted ? 'stage3-chip-adopted' : '']"
                  @click="applyTopicSuggestion(item)"
                >
                  <span>{{ item.label }}</span>
                  <small>{{ item.adopted ? '已采纳' : '采纳' }}</small>
                </button>
              </div>
              <div v-if="selectedTopicNames.length" class="stage3-selected-list">
                <span v-for="topic in selectedTopicNames" :key="topic" class="stage3-selected-pill">
                  {{ topic }}
                  <button type="button" @click="removeTopicSuggestion(topic)">×</button>
                </span>
              </div>
              <div v-if="assistTopicCandidateHints.length" class="stage3-hint-list">
                <span v-for="item in assistTopicCandidateHints" :key="`${item.topicId || item.title}`">
                  {{ item.title }}<small>{{ item.reasonText }}</small>
                </span>
              </div>
              <p v-if="!selectedTopicNames.length && !assistTopicCandidateHints.length" class="stage3-empty-copy">话题建议只作为候选参考，会写入扩展字段，供后续组织同主题内容时人工判断。</p>
            </article>

            <article class="stage3-card stage3-card-series">
              <div class="stage3-card-head">
                <strong>合集归属</strong>
                <RouterLink to="/series/workbench">合集工作台</RouterLink>
              </div>
              <select
                v-model="selectedSeriesId"
                class="stage3-series-select"
                :disabled="isSeriesLoading"
              >
                <option value="">暂不归入合集</option>
                <option v-for="item in seriesRecords" :key="item.id" :value="item.id">
                  {{ item.title }} · {{ item.progress.label }}
                </option>
              </select>
              <p class="stage3-card-copy">
                {{ selectedSeriesRecord ? selectedSeriesRecord.progress.label : '未归档到合集，适合单篇独立发布。' }}
              </p>
              <div v-if="assistSeriesHints.length" class="stage3-hint-list">
                <span v-for="item in assistSeriesHints" :key="`${item.id || 'new'}-${item.title}`">
                  {{ item.title }}<small>{{ item.progressText }}</small>
                </span>
              </div>
              <p v-if="seriesSource === 'fallback'" class="stage3-empty-copy">合集暂未完成同步，本次编辑内容仍会保留。</p>
            </article>
          </div>
        </section>

        <section v-if="showStageTwoPublishingAssist" class="knowledge-assist mx-4">
          <div class="knowledge-assist-head">
            <div>
              <h2>内容整理辅助</h2>
              <p>发布前先把内容整理成社区可搜索、可讨论、可复用的知识资产。</p>
            </div>
            <span>{{ knowledgeAssistReadiness }}</span>
          </div>
          <div class="knowledge-assist-grid">
            <article>
              <strong>摘要建议</strong>
              <p>{{ knowledgeSummary }}</p>
            </article>
            <article>
              <strong>FAQ 候选</strong>
              <p>{{ knowledgeFaqHint }}</p>
            </article>
            <article>
              <strong>知识卡候选</strong>
              <p>{{ knowledgeCardHint }}</p>
            </article>
          </div>
          <div class="knowledge-assist-actions">
            <button type="button" @click="copyKnowledgeAssist">复制沉淀草稿</button>
            <button type="button" @click="fillSummaryFromAssist">写入摘要字段</button>
          </div>
        </section>

        <section v-if="publishFailure" class="publish-diagnostic mx-4" role="alert">
          <div>
            <p class="publish-diagnostic-kicker">发布未完成，草稿已保护</p>
            <h2>{{ publishFailure.title }}</h2>
            <p>{{ publishFailure.message }}</p>
            <span v-if="publishFailure.traceId">Trace: {{ publishFailure.traceId }}</span>
          </div>
          <ul>
            <li v-for="item in publishFailure.actions" :key="item">{{ item }}</li>
          </ul>
          <div class="publish-diagnostic-actions">
            <button type="button" @click="saveDraft">再保存一次草稿</button>
            <button v-if="canRetryWithTextTagsOnly" type="button" @click="retryWithTextTagsOnly">保留文本标签重试</button>
            <RouterLink to="/me">查看我的草稿</RouterLink>
          </div>
        </section>
          </div>
        </details>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onBeforeUnmount, onMounted, watch } from 'vue'
import { onBeforeRouteLeave, useRouter, useRoute } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import { EditorPreviewPanel } from '@/components/editor-preview'
import { EditorQualityChecklist } from '@/components/editor-quality'
import MarkdownEditor from '@/components/post/MarkdownEditor.vue'
import PostMeta from '@/components/post/PostMeta.vue'
import { BizException, getErrorMessage, getResultMessage } from '@/api/client'
import {
  contentAssistEnhancedFingerprintSource,
  contentAssistApi,
  type ContentAssistCapability,
  type ContentAssistEnhancedOutcome,
  type ContentAssistEnhancedRequestSummary,
  type ContentAssistRequest,
} from '@/api/contentAssist'
import { contentSeriesApi, type ContentSeriesRecord } from '@/api/contentSeries'
import { postApi, type PostDraft } from '@/api/post'
import {
  postReferenceApi,
  type PostReference,
  type PostReferenceStatus,
  type PostReferenceType,
  type PostReferenceWrite,
} from '@/api/postReferences'
import {
  trustedContentApi,
  type TrustProfile,
  type TrustProfileUpdateReq,
} from '@/api/trustedContent'
import type { ContentAssistQualityMetric, ContentAssistResult, ContentAssistSuggestion } from '@/api/types'
import {
  EDITOR_ASSIST_TEMPLATE_BOUNDARY,
  EDITOR_ASSIST_TEMPLATES,
  buildEditorAssistTemplateMarkdown,
  getEditorAssistTemplate,
  recommendEditorAssistTemplate,
  type EditorAssistTemplate,
  type EditorAssistTemplateCode,
} from '@/data/editorAssistTemplates'
import { ArrowDown, ArrowUp, ExternalLink, Loader2, Pencil, Plus, RefreshCw, Save, Trash2, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import {
  describeEditorAssistContext,
  editorAssistContextDetail,
  editorAssistSourceLabel,
  parseEditorAssistContext,
  parseEditorSearchGapContext,
} from '@/utils/editorAssistContext'
import { mapEditorDraftToPreview } from '@/utils/editorPreview'
import { buildEditorQualityChecklist } from '@/utils/editorQualityChecklist'
import {
  EDITOR_LIMITS,
  applyEditorTextLimit,
  clampEditorText,
  editorDisabledReason,
  editorIssueList,
  isValidPublicHttpUrl,
  normalizeEditorTags,
  validateEditorPublish,
} from '@/utils/editorValidation'
import { safeStorage } from '@/utils/safeStorage'
import { hasLowQualityVisibleText, isSyntheticVisibleText, sanitizePublicVisibleText, sanitizeVisibleText } from '@/utils/textQuality'
import { useAuthStore } from '@/stores/auth'
import { useDomainCatalog } from '@/composables/useDomainCatalog'
import {
  ALL_CONTENT_TYPES,
  COMMUNITY_CONTENT_TYPES,
  DEFAULT_POST_TYPE,
  LEGACY_CONTENT_TYPES,
  contentTypeCodeOf,
  getContentTypeOption,
  isLegacyInterviewType,
} from '@/utils/contentTypes'
import type { PostTypeValue } from '@/utils/contentTypes'
import { DOMAIN, DOMAIN_OPTIONS, isKnownDomain, normalizeDomain } from '@/utils/domains'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const LOCAL_DRAFT_TTL = 7 * 24 * 60 * 60 * 1000
const LOCAL_DRAFT_NAMESPACE = 'post-draft'
const CONTENT_MAX_LENGTH = EDITOR_LIMITS.contentMax
const AUTO_SAVE_DEBOUNCE_MS = 1500

const postTypes = computed(() => {
  const active = Number(form.value.postType)
  const legacyActive = LEGACY_CONTENT_TYPES.some((item) => item.value === active)
  return legacyActive ? ALL_CONTENT_TYPES : COMMUNITY_CONTENT_TYPES
})

type EditorForm = {
  postType: PostTypeValue
  title: string
  content: string
  tags: number[]
  extension: Record<string, any>
  coverUrl: string
}

type PublishFailure = {
  title: string
  message: string
  traceId: string
  actions: string[]
}

type PendingLocalDraft = {
  data: Record<string, any>
  savedAt: number
}

const form = ref<EditorForm>({
  postType: DEFAULT_POST_TYPE,
  title: '',
  content: '',
  tags: [],
  extension: {},
  coverUrl: ''
})
const publicUpdateSummary = ref('')
const updateImpactScope = ref('CONTENT')
const respondedSuggestionIds = ref<string[]>([])
const publicUpdateError = ref('')
const emptyTrustProfileDraft = (): TrustProfileUpdateReq => ({
  authorRole: 'PARTICIPANT',
  experienceStartAt: undefined,
  experienceEndAt: undefined,
  applicableAudience: '',
  applicableContext: '',
  processSummary: '',
  outcomeSummary: '',
  knownLimitations: '',
  sourceSummary: '',
  interestDisclosure: '',
})
const trustProfileEnabled = ref(false)
const trustProfileDraft = ref<TrustProfileUpdateReq>(emptyTrustProfileDraft())
const trustProfileMaxDateTime = computed(() => {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
})
type PostReferenceDraft = {
  referenceType: PostReferenceType
  title: string
  url: string
  note: string
  referenceStatus: PostReferenceStatus
  brokenReason: string
}
const postReferenceTypeOptions: Array<{ value: PostReferenceType; label: string }> = [
  { value: 'SOURCE', label: '资料来源' },
  { value: 'EXAMPLE', label: '案例示例' },
  { value: 'DATA', label: '数据依据' },
  { value: 'FOLLOW_UP', label: '后续阅读' },
]
const emptyPostReferenceDraft = (): PostReferenceDraft => ({
  referenceType: 'SOURCE',
  title: '',
  url: '',
  note: '',
  referenceStatus: 'ACTIVE',
  brokenReason: '',
})
const postReferences = ref<PostReference[]>([])
const postReferencesLoading = ref(false)
const postReferenceError = ref('')
const postReferenceEditing = ref(false)
const postReferenceEditingId = ref('')
const postReferenceSaving = ref(false)
const postReferenceDeletingId = ref('')
const postReferenceDraft = ref<PostReferenceDraft>(emptyPostReferenceDraft())
const sortedPostReferences = computed(() => [...postReferences.value].sort((a, b) => (
  Number(a.sortOrder) - Number(b.sortOrder)
)))

const formCoverFailedUrl = ref('')
const formCoverHasFailed = computed(() => Boolean(form.value.coverUrl) && formCoverFailedUrl.value === form.value.coverUrl)
const formCoverFallbackText = computed(() => (
  formCoverHasFailed.value ? '\u56fe\u7247\u52a0\u8f7d\u5931\u8d25\uff0c\u5df2\u6539\u7528\u6587\u5b57\u9884\u89c8\u3002' : ''
))
const handleFormCoverError = () => {
  formCoverFailedUrl.value = form.value.coverUrl
}
watch(() => form.value.coverUrl, () => {
  formCoverFailedUrl.value = ''
})

const tagInput = ref('')
const selectedTags = ref<string[]>([])
const selectedDomain = ref<number | undefined>()
const { domains: editorDomainOptions, loadDomains: loadEditorDomains } = useDomainCatalog()
const resolveOptionalDomain = (value: unknown, anonymous = false): number | undefined => {
  if (anonymous) return DOMAIN.CAREER
  const candidate = typeof value === 'string' || typeof value === 'number' ? value : undefined
  const domain = isKnownDomain(candidate) ? normalizeDomain(candidate) : undefined
  return domain && editorDomainOptions.value.some((item) => Number(item.domain) === Number(domain))
    ? domain
    : undefined
}
const anonymousCareerPost = ref(false)
const isPublishing = ref(false)
const isTitleComposing = ref(false)
const titleCompositionStartValue = ref('')
const isEditing = ref(false)
const isLoadingPost = ref(false)
const isForbiddenEdit = ref(false)
const fieldErrors = ref<Record<string, string>>({})
const publishFailure = ref<PublishFailure | null>(null)
const isSavingDraft = ref(false)
const serverDraftId = ref('')
const selectedDraftId = ref('')
const serverDrafts = ref<PostDraft[]>([])
const lastDraftSignature = ref('')
const pendingLocalDraft = ref<PendingLocalDraft | null>(null)
const isEditorInitializing = ref(true)
const showStageTwoPublishingAssist = false
const seriesRecords = ref<ContentSeriesRecord[]>([])
const seriesSource = ref<'remote' | 'fallback'>('fallback')
const isSeriesLoading = ref(false)
const selectedSeriesId = ref('')
const selectedAssistTemplateCode = ref<EditorAssistTemplateCode | ''>('')
const assistPanelEnabled = ref(false)
const stageThreeAssist = ref<ContentAssistResult | null>(null)
const isStageThreeAssistLoading = ref(false)
const stageThreeAssistError = ref('')
const explicitAiCapability = ref<ContentAssistCapability | null>(null)
const explicitAiState = ref<'idle' | 'submitting' | 'reconciling' | 'confirmed' | 'released' | 'rejected' | 'stale'>('idle')
const explicitAiError = ref('')
const explicitAiRequest = ref<{
  ownerUid: string
  idempotencyKey?: string
  requestId?: string | number
  request: ContentAssistRequest
  contentRevision: number
} | null>(null)
type EnhancedAssistRecovery = ContentAssistEnhancedRequestSummary & {
  ownerUid: string
  matchesCurrentDraft: boolean
}
const enhancedAssistRecovery = ref<EnhancedAssistRecovery | null>(null)
const isEnhancedAssistRecoveryLoading = ref(false)
const enhancedAssistRecoveryError = ref('')
const editorContentRevision = ref(0)
const draftOwner = computed(() => String(authStore.user?.uid ?? 'guest'))
const fallbackReturnPath = computed(() => authStore.isLoggedIn ? '/me' : '/')
const stageThreeAssistPreferenceKey = computed(() => `editor_stage3_assist:${draftOwner.value}`)
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
let stageThreeAssistTimer: ReturnType<typeof setTimeout> | null = null
let stageThreeAssistRequestId = 0
let explicitAiRequestId = 0
let enhancedAssistRecoveryRequestId = 0
let seriesRequestId = 0
const isExplicitAiReconciliationLoading = ref(false)

type QualityCheck = {
  key: string
  title: string
  description: string
  passed: boolean
  required: boolean
}

type PublishTemplate = {
  title: string
  description: string
  content: string
}

const COMMUNITY_PUBLISH_TEMPLATES: Record<string, PublishTemplate> = {
  TECH_ARTICLE: {
    title: '攻略清单模板',
    description: '适合整理步骤、方法、避坑清单和可照着执行的经验。',
    content: `## 背景

## 核心问题

## 方法步骤

## 清单与提醒

## 适合人群
`,
  },
  PROJECT_REVIEW: {
    title: '复盘记录模板',
    description: '复盘一次项目、活动、经历或决策，记录过程、结果和下一步。',
    content: `## 背景

## 目标

## 过程

## 难点与取舍

## 指标与结果

## 下一步
`,
  },
  SYSTEM_DESIGN: {
    title: '观点讨论模板',
    description: '适合表达观察、判断和取舍，并邀请大家讨论。',
    content: `## 观点

## 背景

## 我的理由

## 可能的反例

## 想听听大家怎么看
`,
  },
  PITFALL: {
    title: '图文笔记模板',
    description: '适合轻量记录灵感、日常观察、实用片段和图文式分享。',
    content: `## 这条笔记想分享什么

## 关键细节

## 图片或素材说明

## 可以怎么用
`,
  },
  QUESTION: {
    title: '问题求助模板',
    description: '把问题、背景限制、已尝试方法和希望大家怎么帮说清楚。',
    content: `## 问题是什么

## 背景和限制

## 我已经尝试过什么

## 想获得什么帮助

## 相关频道或标签线索
`,
  },
  RESOURCE: {
    title: '资源推荐模板',
    description: '说明资源适用人群、使用方式、优缺点和推荐理由。',
    content: `## 资源简介

## 适用场景

## 使用方式

## 优点与限制

## 推荐实践
`,
  },
  NOTE: {
    title: '经验分享模板',
    description: '快速记录亲身经历、做法、结果和可复用的提醒。',
    content: `## 经历背景

## 我怎么做

## 结果

## 给后来者的提醒
`,
  },
}

const LEGACY_PUBLISH_TEMPLATES: Record<string, PublishTemplate> = {
  INTERVIEW_RECAP: {
    title: '面试复盘模板',
    description: '仅用于历史面试复盘内容的兼容编辑，不作为默认发布入口。',
    content: `## 面试背景

## 被问到的问题

## 追问路径

## 回答卡点

## 可复用素材

## 后续补充
`,
  },
}

const PUBLISH_TEMPLATES: Record<string, PublishTemplate> = {
  ...COMMUNITY_PUBLISH_TEMPLATES,
  ...LEGACY_PUBLISH_TEMPLATES,
}

const extensionValue = computed<Record<string, any>>(() => form.value.extension && typeof form.value.extension === 'object'
  ? form.value.extension as Record<string, any>
  : {})
const normalizedTitle = computed(() => form.value.title.trim())
const normalizedContent = computed(() => form.value.content.trim())
const normalizedTags = computed(() => selectedTags.value.map((tag) => tag.trim()).filter(Boolean))
const isHttpUrl = (value: string) => isValidPublicHttpUrl(value)
const contentLength = computed(() => form.value.content.length)
const isContentOverLimit = computed(() => contentLength.value > CONTENT_MAX_LENGTH)
const activePostType = computed(() => getContentTypeOption(form.value.postType))
const activeTypeCode = computed(() => contentTypeCodeOf(form.value.postType))
const editorAssistContextResult = computed(() => parseEditorAssistContext(route.query as Record<string, unknown>))
const editorAssistContext = computed(() => editorAssistContextResult.value.context)
const hasEditorAssistContext = computed(() => editorAssistContextResult.value.canShowSourceHint)
const editorAssistContextTitle = computed(() => describeEditorAssistContext(editorAssistContext.value))
const editorAssistContextCopy = computed(() => editorAssistContextDetail(editorAssistContext.value))
const editorAssistContextSource = computed(() => editorAssistSourceLabel(editorAssistContext.value))
const editorAssistReturnHref = computed(() => editorAssistContext.value?.returnHref || '')
const editorSearchGapContextResult = computed(() => parseEditorSearchGapContext(route.query as Record<string, unknown>))
const editorSearchGapContext = computed(() => editorSearchGapContextResult.value.context)
const hasEditorSearchGapContext = computed(() => editorSearchGapContextResult.value.canShowSourceHint)
const editorSearchGapContextTitle = computed(() => editorSearchGapContextResult.value.sourceHint?.title || '搜索缺口')
const editorSearchGapContextCopy = computed(() => editorSearchGapContextResult.value.sourceHint?.detail || '')
const editorSearchGapKeyword = computed(() => editorSearchGapContext.value?.keyword || '')
const editorSearchGapReturnHref = computed(() => editorSearchGapContext.value?.returnHref || '')
const assistTemplateOptions = EDITOR_ASSIST_TEMPLATES
const recommendedAssistTemplate = computed(() => recommendEditorAssistTemplate(editorAssistContext.value, activeTypeCode.value))
const activeTemplate = computed<EditorAssistTemplate>(() => (
  getEditorAssistTemplate(selectedAssistTemplateCode.value) || recommendedAssistTemplate.value
))
const activeTemplateMarkdown = computed(() => buildEditorAssistTemplateMarkdown(activeTemplate.value, editorAssistContext.value))
const activeTemplateBoundary = EDITOR_ASSIST_TEMPLATE_BOUNDARY
const isQuestionPost = computed(() => activeTypeCode.value === 'QUESTION')
const isInterviewPost = computed(() => isLegacyInterviewType(form.value.postType))
const hasCompany = computed(() => Boolean(String(extensionValue.value.company || '').trim()))
const hasPosition = computed(() => Boolean(String(extensionValue.value.position || '').trim()))
const hasInterviewRound = computed(() => Number(extensionValue.value.interviewRounds || 0) > 0)
const hasInterviewResult = computed(() => Number(extensionValue.value.interviewResult || 0) > 0)
const hasContentAny = (keywords: string[]) => keywords.some((keyword) => normalizedContent.value.includes(keyword))
const requiresStructuredExperience = computed(() => ['PROJECT_REVIEW', 'PITFALL'].includes(activeTypeCode.value))
const hasBackgroundSection = computed(() => hasContentAny(['背景', '现象', '上下文']))
const hasProblemSection = computed(() => hasContentAny(['难点', '根因', '问题', '挑战', '瓶颈']))
const hasSolutionSection = computed(() => hasContentAny(['方案', '修复', '实现', '设计', '落地']))
const hasResultSection = computed(() => hasContentAny(['结果', '指标', '效果', '收获', '提升', '降低', '复盘']))
const hasQuestionBackground = computed(() => hasContentAny(['背景', '限制', '上下文', '场景', '情况']))
const hasQuestionTried = computed(() => hasContentAny(['尝试', '试过', '已尝试', '已经试', '做过', '查过']))
const hasQuestionHelp = computed(() => hasContentAny(['想获得', '希望', '请教', '建议', '推荐', '怎么看', '怎么选']))
const hasQuestionTopicClue = computed(() => normalizedTags.value.length > 0 || selectedTopicNames.value.length > 0 || hasContentAny(['标签', '话题', '频道']))
const structuredQualityChecks = computed<QualityCheck[]>(() => {
  if (!requiresStructuredExperience.value) return []
  return [
    {
      key: 'structured-background',
      title: '背景或现象',
      description: '项目复盘/故障记录需要交代背景、现象或上下文。',
      passed: hasBackgroundSection.value,
      required: true,
    },
    {
      key: 'structured-problem',
      title: '难点或根因',
      description: '需要说明关键难点、根因、瓶颈或主要挑战。',
      passed: hasProblemSection.value,
      required: true,
    },
    {
      key: 'structured-solution',
      title: '方案与落地',
      description: '需要写清方案、修复、实现或落地过程。',
      passed: hasSolutionSection.value,
      required: true,
    },
    {
      key: 'structured-result',
      title: '结果或指标',
      description: '需要补充结果、指标、效果、收获或复盘结论。',
      passed: hasResultSection.value,
      required: true,
    },
  ]
})
const questionQualityChecks = computed<QualityCheck[]>(() => {
  if (!isQuestionPost.value) return []
  return [
    {
      key: 'question-background',
      title: '问题背景',
      description: '补充背景、限制或具体场景，别人更容易判断该怎么帮。',
      passed: hasQuestionBackground.value,
      required: false,
    },
    {
      key: 'question-tried',
      title: '已尝试方法',
      description: '写出已经试过什么、哪里卡住，避免大家重复给出无效建议。',
      passed: hasQuestionTried.value,
      required: false,
    },
    {
      key: 'question-help',
      title: '想获得的帮助',
      description: '说明你想要建议、推荐、经验征集、选择讨论还是问题排查。',
      passed: hasQuestionHelp.value,
      required: false,
    },
    {
      key: 'question-topic-clue',
      title: '标签或话题线索',
      description: '补一个场景、人群或问题类型标签，也可以采纳相关话题建议。',
      passed: hasQuestionTopicClue.value,
      required: false,
    },
  ]
})

const qualityChecks = computed<QualityCheck[]>(() => [
  {
    key: 'domain',
    title: '选择频道',
    description: '选择最贴近内容主题的频道，方便内容被准确发现。',
    passed: selectedDomain.value != null,
    required: true,
  },
  {
    key: 'title',
    title: '标题清晰',
    description: '至少 8 个字符，方便搜索和列表快速判断主题。',
    passed: normalizedTitle.value.length >= 8 && normalizedTitle.value.length <= 200,
    required: true,
  },
  {
    key: 'content',
    title: '正文完整',
    description: `${activePostType.value.label}正文至少 ${activePostType.value.minContentLength} 个字符，且不超过 ${CONTENT_MAX_LENGTH} 字。`,
    passed: normalizedContent.value.length >= activePostType.value.minContentLength && !isContentOverLimit.value,
    required: true,
  },
  {
    key: 'coverUrl',
    title: '封面链接有效',
    description: '封面链接必须是完整的 http 或 https 地址。',
    passed: !form.value.coverUrl.trim() || isHttpUrl(form.value.coverUrl),
    required: Boolean(form.value.coverUrl.trim()),
  },
  {
    key: 'company',
    title: '实体信息',
    description: '旧版经验需要实体字段，便于历史知识库和主题包兼容。',
    passed: !isInterviewPost.value || hasCompany.value,
    required: isInterviewPost.value,
  },
  {
    key: 'position',
    title: '场景信息',
    description: '旧版经验需要场景字段，便于历史知识库按场景筛选。',
    passed: !isInterviewPost.value || hasPosition.value,
    required: isInterviewPost.value,
  },
  {
    key: 'tags',
    title: '内容标签',
    description: '至少 1 个标签；标签用于搜索和标签页聚合，话题会写入扩展字段，用于发现页入口和后续同主题聚合。',
    passed: normalizedTags.value.length >= (isInterviewPost.value ? 2 : 1),
    required: true,
  },
  {
    key: 'round',
    title: '轮次或结果',
    description: '旧版经验补充轮次或结果，可增强历史趋势和知识库可信度。',
    passed: !isInterviewPost.value || hasInterviewRound.value || hasInterviewResult.value,
    required: false,
  },
  ...structuredQualityChecks.value,
  ...questionQualityChecks.value,
])
const blockingQualityIssues = computed(() => qualityChecks.value.filter((item) => item.required && !item.passed))
const railQualityChecks = computed(() => (
  blockingQualityIssues.value.length
    ? blockingQualityIssues.value
    : qualityChecks.value.filter((item) => item.required)
))
const passedQualityCount = computed(() => qualityChecks.value.filter((item) => item.passed).length)
const isInitialComposeState = computed(() => (
  !normalizedTitle.value
  && !normalizedContent.value
  && !selectedDomain.value
  && selectedTags.value.length === 0
  && !form.value.coverUrl.trim()
))
const editorValidation = computed(() => validateEditorPublish({
  domain: selectedDomain.value,
  title: form.value.title,
  content: form.value.content,
  summary: extensionValue.value.summary,
  tags: selectedTags.value,
  coverUrl: form.value.coverUrl,
  minContentLength: activePostType.value.minContentLength,
  minTagCount: isInterviewPost.value ? 2 : 1,
}))
const currentLimitErrors = () => {
  const errors = editorValidation.value.errors
  const result: Record<string, string> = {}
  if (form.value.title.length > EDITOR_LIMITS.titleMax && errors.title) result.title = errors.title
  if (form.value.content.length > EDITOR_LIMITS.contentMax && errors.content) result.content = errors.content
  if (String(extensionValue.value.summary || '').length > EDITOR_LIMITS.summaryMax && errors.summary) {
    result.summary = errors.summary
  }
  if (
    normalizedTags.value.length > EDITOR_LIMITS.tagMax
    || normalizedTags.value.some((tag) => tag.length > EDITOR_LIMITS.tagNameMax)
  ) {
    if (errors.tags) result.tags = errors.tags
  }
  if (form.value.coverUrl.trim() && !isValidPublicHttpUrl(form.value.coverUrl) && errors.coverUrl) {
    result.coverUrl = errors.coverUrl
  }
  return result
}

const exposeLoadedLimitErrors = () => {
  const errors = currentLimitErrors()
  if (Object.keys(errors).length) fieldErrors.value = { ...fieldErrors.value, ...errors }
}

const publishDisabledReason = computed(() => {
  if (isLoadingPost.value) return '帖子内容加载完成后才能发布'
  if (isPublishing.value) return isEditing.value ? '正在保存修改，请勿重复提交' : '正在发布，请勿重复提交'
  if (isInitialComposeState.value) return '先写标题和正文，再选择频道即可发布'
  const validationReason = editorDisabledReason(editorValidation.value.errors)
  if (validationReason) return validationReason
  if (blockingQualityIssues.value.length) {
    return `请先补齐：${blockingQualityIssues.value.map((item) => item.title).join('、')}`
  }
  return ''
})
const isPublishDisabled = computed(() => (
  isPublishing.value
  || isLoadingPost.value
  || Object.keys(editorValidation.value.errors).length > 0
  || blockingQualityIssues.value.length > 0
))
const canRetryWithTextTagsOnly = computed(() => normalizedTags.value.length > 0 && form.value.tags.length > 0)
const publishIssues = computed(() => editorIssueList(editorValidation.value.errors))
const tagInputPlaceholder = computed(() => (
  isQuestionPost.value
    ? '添加场景 / 人群 / 问题类型标签'
    : '输入标签，按 Enter 添加'
))
const metaErrorMessages = computed(() => ['company', 'position', 'interviewRound', 'round', 'yearsOfExp', 'interviewResult', 'interviewRounds', 'extension']
  .map((field) => fieldErrors.value[field])
  .filter(Boolean))
const cleanContentLines = computed(() => normalizedContent.value
  .replace(/```[\s\S]*?```/g, ' ')
  .split(/\r?\n+/)
  .map((line) => line.replace(/[#>*`_\-[\]()]/g, ' ').replace(/\s+/g, ' ').trim())
  .filter((line) => line.length >= 8)
  .slice(0, 8))
const knowledgeSummary = computed(() => {
  const explicitSummary = sanitizeVisibleText(extensionValue.value.summary)
  if (explicitSummary) return explicitSummary
  const source = cleanContentLines.value[0] || normalizedTitle.value
  if (!source) return '正文完善后会自动给出摘要建议。'
  return source.length > 90 ? `${source.slice(0, 90)}...` : source
})
const qualityChecklistResult = computed(() => buildEditorQualityChecklist({
  title: normalizedTitle.value,
  content: normalizedContent.value,
  summary: extensionValue.value.summary,
  domain: selectedDomain.value,
  domainLabel: selectedDomainMeta.value?.domainName,
  tags: selectedTags.value,
  anonymous: anonymousCareerPost.value,
  seriesId: selectedSeriesId.value,
  seriesTitle: selectedSeriesRecord.value?.title,
  riskNotice: extensionValue.value.riskNotice,
  minContentLength: Math.max(80, activePostType.value.minContentLength),
}))
const publishGateItems = computed(() => qualityChecks.value.filter((item) => item.required || !item.passed))
const editorPreviewModel = computed(() => mapEditorDraftToPreview(
  {
    postType: form.value.postType,
    title: form.value.title,
    content: form.value.content,
    coverUrl: form.value.coverUrl,
    domain: selectedDomain.value,
    tags: form.value.tags,
    tagLabels: selectedTags.value,
    anonymousCareerPost: anonymousCareerPost.value,
    selectedSeriesId: selectedSeriesId.value,
    summary: extensionValue.value.summary,
    extension: extensionValue.value,
  },
  {
    domains: editorDomainOptions.value,
    seriesRecords: seriesRecords.value,
    fallbackSummary: knowledgeSummary.value,
  },
))
const knowledgeFaqHint = computed(() => {
  const questionLine = cleanContentLines.value.find((line) => /[？?]|怎么|如何|为什么|排查|解决/.test(line))
  if (questionLine) return questionLine.length > 80 ? `${questionLine.slice(0, 80)}...` : questionLine
  if (normalizedTitle.value) return `可以围绕“${normalizedTitle.value.slice(0, 36)}”补一个问题和结论。`
  return '补充一个真实问题、排查过程和最终结论后，可沉淀为 FAQ。'
})
const knowledgeCardHint = computed(() => {
  const techTags = normalizedTags.value.slice(0, 4).join('、') || '内容标签'
  if (normalizedContent.value.length >= activePostType.value.minContentLength) {
    return `${activePostType.value.label} · ${techTags} · 可沉淀为摘要、FAQ 和相似内容推荐素材。`
  }
  return `继续补充背景、过程、结论和复盘，发布后可形成 ${activePostType.value.label} 知识卡。`
})
const knowledgeAssistReadiness = computed(() => blockingQualityIssues.value.length ? '待补齐' : '可沉淀')
const knowledgeAssistMarkdown = computed(() => [
  `# ${normalizedTitle.value || '待补充标题的内容'}`,
  '',
  `内容类型：${activePostType.value.label}`,
  normalizedTags.value.length ? `内容标签：${normalizedTags.value.join('、')}` : '内容标签：待补充',
  '',
  '## 摘要建议',
  knowledgeSummary.value,
  '',
  '## FAQ 候选',
  knowledgeFaqHint.value,
  '',
  '## 知识卡候选',
  knowledgeCardHint.value,
].join('\n'))

const topicNamesFromExtension = (value: Record<string, any>) => {
  const raw = Array.isArray(value.topicNames)
    ? value.topicNames
    : Array.isArray(value.topics)
      ? value.topics
      : []
  return raw.map((item) => sanitizeVisibleText(item)).filter(Boolean)
}

const selectedDomainMeta = computed(() => (
  editorDomainOptions.value.find((item) => Number(item.domain) === Number(selectedDomain.value))
  ?? null
))
const pendingLocalDraftSavedAt = computed(() => {
  const savedAt = pendingLocalDraft.value?.savedAt
  if (!savedAt) return ''
  const date = new Date(savedAt)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('zh-CN', { hour12: false })
})
const selectedTopicNames = computed(() => topicNamesFromExtension(extensionValue.value))
const selectedSeriesRecord = computed(() => (
  seriesRecords.value.find((item) => String(item.id) === String(selectedSeriesId.value)) || null
))
const assistSummaryText = computed(() => stageThreeAssist.value?.summary || knowledgeSummary.value)
const assistSummaryAdopted = computed(() => {
  const currentSummary = sanitizeVisibleText(extensionValue.value.summary)
  return Boolean(currentSummary && currentSummary === assistSummaryText.value)
})
const fallbackQualityScore = computed(() => {
  const ratio = passedQualityCount.value / Math.max(qualityChecks.value.length, 1)
  const tagBonus = Math.min(12, normalizedTags.value.length * 4)
  const structureBonus = Math.min(10, structuredQualityChecks.value.filter((item) => item.passed).length * 2.5)
  return Math.max(28, Math.min(100, Math.round(ratio * 78 + tagBonus + structureBonus)))
})
const fallbackAssistQualityMetrics = computed<ContentAssistQualityMetric[]>(() => qualityChecks.value.slice(0, 4).map((item) => ({
  label: item.title,
  score: item.passed ? 100 : item.required ? 42 : 66,
  detail: item.description,
})))
const assistQualityMetrics = computed<ContentAssistQualityMetric[]>(() => (
  stageThreeAssist.value?.qualityMetrics?.length
    ? stageThreeAssist.value.qualityMetrics
    : fallbackAssistQualityMetrics.value
))
const qualityScoreValue = computed(() => stageThreeAssist.value?.qualityScore ?? fallbackQualityScore.value)
const qualityScoreLabel = computed(() => {
  if (stageThreeAssist.value?.qualityLabel) return stageThreeAssist.value.qualityLabel
  if (qualityScoreValue.value >= 85) return '可直接发布'
  if (qualityScoreValue.value >= 65) return '再补一轮'
  return '建议补充'
})
const qualityScoreReason = computed(() => (
  stageThreeAssist.value?.qualityReason
  || (qualityScoreValue.value >= 85
    ? '关键信息较完整，发布后也适合纳入合集沉淀。'
    : qualityScoreValue.value >= 65
      ? '结构已成型，补一轮标签或结果会更稳。'
      : '建议先补背景、步骤和结论，再进入发布。')
))
const displayTagSuggestions = computed(() => (stageThreeAssist.value?.tagSuggestions || []).map((item) => ({
  ...item,
  adopted: normalizedTags.value.some((tag) => tag.toLowerCase() === item.label.toLowerCase()),
})))
const displayTopicSuggestions = computed(() => (stageThreeAssist.value?.topicSuggestions || []).map((item) => ({
  ...item,
  adopted: selectedTopicNames.value.some((topic) => topic.toLowerCase() === item.label.toLowerCase()),
})))
const assistSeriesHints = computed(() => stageThreeAssist.value?.seriesHints || [])
const assistTopicCandidateHints = computed(() => stageThreeAssist.value?.topicCandidateHints || [])
const stageThreeAssistStatus = computed(() => {
  if (!authStore.isLoggedIn) return 'unauthenticated'
  if (!assistPanelEnabled.value && !stageThreeAssist.value) return 'disabled'
  if (isStageThreeAssistLoading.value) return 'loading'
  if (stageThreeAssist.value?.status === 'degraded') return 'degraded'
  if (stageThreeAssist.value?.status === 'failed' || stageThreeAssistError.value) return 'failed'
  return 'ready'
})
const stageThreeAssistStatusLabel = computed(() => {
  if (stageThreeAssistStatus.value === 'unauthenticated') return '未登录'
  if (stageThreeAssistStatus.value === 'disabled') return '建议关闭'
  if (stageThreeAssistStatus.value === 'loading') return '加载中'
  if (stageThreeAssistStatus.value === 'degraded') return '规则降级'
  if (stageThreeAssistStatus.value === 'failed') return '加载失败'
  return '建议采纳'
})
const stageThreeAssistHeadline = computed(() => {
  if (stageThreeAssistStatus.value === 'unauthenticated') return '登录后可获得写作建议、标签/话题建议和合集工作台联动。'
  if (stageThreeAssistStatus.value === 'disabled') return '发布建议默认关闭，当前仅保留发布检查、草稿保护和合集选择；显式开启后，如后端未配置建议服务会自动回退到规则建议。'
  if (stageThreeAssistStatus.value === 'loading') return '正在根据标题、正文、标签和领域生成发布建议。'
  if (stageThreeAssistStatus.value === 'degraded') return '部分智能建议暂不可用，当前已保留基础写作检查。'
  if (stageThreeAssistStatus.value === 'failed') return stageThreeAssistError.value || '建议暂时不可用，你仍然可以继续发布。'
  if (!stageThreeAssist.value) return '发布建议已开启，会在标题、正文、标签或频道变化时自动刷新；也可以手动点击“刷新建议”。'
  return '围绕写作助手、质量评分、标签/话题建议和合集归属整理发布前动作。'
})
const canRunExplicitAiEnhancement = computed(() => Boolean(
  authStore.isLoggedIn
  && !isForbiddenEdit.value
  && selectedDomain.value
  && normalizedContent.value
  && explicitAiState.value !== 'submitting'
  && !(explicitAiState.value === 'reconciling' && isExplicitAiReconciliationLoading.value)
  && (explicitAiState.value === 'reconciling'
    ? explicitAiRequest.value
    : explicitAiCapability.value?.available),
))
const explicitAiActionLabel = computed(() => {
  if (explicitAiState.value === 'submitting') return 'AI 增强中...'
  if (explicitAiState.value === 'reconciling') {
    return isExplicitAiReconciliationLoading.value ? '确认使用结果...' : '重新确认使用结果'
  }
  if (explicitAiCapability.value?.available) return `AI 增强建议 · ${explicitAiCapability.value.remainingQuota} 次`
  return 'AI 增强（可选）'
})
const explicitAiUnavailableReason = computed(() => {
  if (!authStore.isLoggedIn) return '登录后可使用 AI 创作增强'
  if (!selectedDomain.value) return '请先选择频道'
  if (!normalizedContent.value) return '请先补充正文'
  if (explicitAiCapability.value?.unavailableReason === 'AI_ASSIST_QUOTA_INSUFFICIENT') return 'AI 增强额度不足'
  return explicitAiCapability.value?.unavailableReason || ''
})
const explicitAiHint = computed(() => {
  if (explicitAiState.value === 'reconciling') {
    return isExplicitAiReconciliationLoading.value
      ? '正在确认本次使用结果，确认期间不会重复提交。'
      : '本次结果暂未确认。再次点击可继续确认，不会创建新的额度请求。'
  }
  if (explicitAiState.value === 'confirmed') return '本次 AI 增强已确认使用 1 次额度，结果仅供人工采纳。'
  if (explicitAiState.value === 'released') return '本次增强已回退到免费规则建议，未扣除额度。'
  if (explicitAiState.value === 'stale') return '当前草稿已变更。上一版增强不会覆盖新内容，可重新发起 AI 增强。'
  if (explicitAiState.value === 'rejected') return explicitAiError.value || '当前无法使用 AI 创作增强，免费规则建议仍可使用。'
  if (explicitAiCapability.value?.available) return `剩余 ${explicitAiCapability.value.remainingQuota} 次。本次使用 1 次，失败或规则降级不扣次数。`
  if (explicitAiCapability.value?.unavailableReason === 'AI_ASSIST_QUOTA_INSUFFICIENT') return '额度不足不影响免费规则建议、草稿保存或发布。'
  return 'AI 创作增强默认关闭，免费规则建议不受影响。'
})
const isExplicitAiResultStale = computed(() => (
  explicitAiState.value === 'stale'
  || (explicitAiState.value === 'confirmed'
    && explicitAiRequest.value?.contentRevision !== editorContentRevision.value)
))
const enhancedAssistRecoveryTitle = computed(() => {
  const recovery = enhancedAssistRecovery.value
  if (!recovery) return ''
  if (!recovery.matchesCurrentDraft) return '检测到其他草稿的 AI 增强记录'
  if (recovery.requestStatus === 'RUNNING' || recovery.usageStatus === 'RESERVED') return '检测到可恢复的 AI 增强请求'
  if (recovery.requestStatus === 'SUCCEEDED' && recovery.usageStatus === 'CONFIRMED') return '已恢复本草稿的 AI 增强结果'
  if (recovery.requestStatus === 'FALLBACK' || recovery.usageStatus === 'RELEASED') return '已恢复本草稿的规则降级结果'
  return '已恢复本草稿的 AI 增强状态'
})
const enhancedAssistRecoveryDetail = computed(() => {
  const recovery = enhancedAssistRecovery.value
  if (!recovery) return ''
  if (!recovery.matchesCurrentDraft) {
    return '该记录与当前表单指纹不一致，系统不会展示、覆盖或自动采纳其中的任何建议。'
  }
  if (recovery.requestStatus === 'RUNNING' || recovery.usageStatus === 'RESERVED') {
    return '该请求仍在履约确认中。可按需刷新状态，系统不会重新提交或重复扣除额度。'
  }
  if (recovery.requestStatus === 'SUCCEEDED' && recovery.usageStatus === 'CONFIRMED') {
    return '恢复结果仅供人工查看和逐项采纳，不会自动修改标题、正文、标签、话题或合集。'
  }
  if (recovery.requestStatus === 'FALLBACK' || recovery.usageStatus === 'RELEASED') {
    return '本次增强已回退到免费规则建议，额度未扣除；建议仍需由你逐项采纳。'
  }
  return recovery.errorCode
    ? `该请求未产生可恢复的建议：${recovery.errorCode}`
    : '该请求未产生可恢复的建议，可继续编辑并按需重新发起增强。'
})

const clearFieldErrors = () => {
  fieldErrors.value = {}
  publishFailure.value = null
}

const applyEditorExtension = (updates: Record<string, unknown>) => {
  const nextExtension: Record<string, unknown> = {
    ...extensionValue.value,
    ...updates,
  }
  Object.keys(nextExtension).forEach((key) => {
    const value = nextExtension[key]
    if (
      value == null
      || value === ''
      || (Array.isArray(value) && value.length === 0)
    ) {
      delete nextExtension[key]
    }
  })
  form.value.extension = nextExtension
}

const handleTitleInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const next = isTitleComposing.value
    ? input.value
    : applyEditorTextLimit(form.value.title, input.value, EDITOR_LIMITS.titleMax)
  if (input.value !== next) input.value = next
  form.value.title = next
}

const handleTitlePaste = (event: ClipboardEvent) => {
  const previous = form.value.title
  const input = event.target as HTMLInputElement | null
  queueMicrotask(() => {
    const next = applyEditorTextLimit(previous, input?.value || form.value.title, EDITOR_LIMITS.titleMax)
    if (input && input.value !== next) input.value = next
    form.value.title = next
  })
}

const handleTitleCompositionStart = () => {
  titleCompositionStartValue.value = form.value.title
  isTitleComposing.value = true
}

const handleTitleCompositionEnd = (event: CompositionEvent) => {
  isTitleComposing.value = false
  const input = event.target as HTMLInputElement
  const next = applyEditorTextLimit(
    titleCompositionStartValue.value,
    input.value,
    EDITOR_LIMITS.titleMax,
  )
  if (input.value !== next) input.value = next
  form.value.title = next
}

const buildStageThreeAssistRequest = (): ContentAssistRequest => ({
  title: normalizedTitle.value,
  content: normalizedContent.value,
  postType: form.value.postType,
  domain: selectedDomain.value ?? undefined,
  tags: normalizedTags.value,
  extension: {
    ...extensionValue.value,
    assistContext: editorAssistContext.value || undefined,
    assistTemplateCode: activeTemplate.value.code,
    topicNames: selectedTopicNames.value,
    seriesId: selectedSeriesId.value || undefined,
    seriesTitle: selectedSeriesRecord.value?.title || undefined,
  },
  seriesId: selectedSeriesId.value || undefined,
  aiEnabled: assistPanelEnabled.value,
})

const sha256Hex = async (source: string) => {
  if (!globalThis.crypto?.subtle) return ''
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(source))
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('')
}

const currentEnhancedAssistFingerprint = async (ownerUid: string, request: ContentAssistRequest) => (
  sha256Hex(contentAssistEnhancedFingerprintSource(ownerUid, request))
)

const updateEnhancedAssistRecovery = (outcome: ContentAssistEnhancedOutcome) => {
  const active = explicitAiRequest.value
  const recovery = enhancedAssistRecovery.value
  if (!active?.requestId || !recovery || String(recovery.requestId) !== String(active.requestId)) return
  enhancedAssistRecovery.value = {
    ...recovery,
    requestStatus: outcome.requestStatus,
    usageStatus: outcome.usageStatus,
    quotaConsumed: outcome.quotaConsumed,
  }
}

const refreshRecoveredEnhancedAssist = async () => {
  const recovery = enhancedAssistRecovery.value
  const active = explicitAiRequest.value
  const ownerUid = String(authStore.user?.uid ?? '')
  if (!recovery?.matchesCurrentDraft || !active?.requestId || active.ownerUid !== ownerUid) return

  const requestId = ++explicitAiRequestId
  explicitAiRequest.value = { ...active }
  isEnhancedAssistRecoveryLoading.value = true
  enhancedAssistRecoveryError.value = ''
  try {
    const response = await contentAssistApi.getEnhancedAssistStatusByRequestId(active.request, active.requestId)
    if (!response.data) throw new Error('AI 增强状态为空')
    await applyExplicitAiOutcome(requestId, ownerUid, response.data)
  } catch (error) {
    if (requestId !== explicitAiRequestId || String(authStore.user?.uid ?? '') !== ownerUid) return
    enhancedAssistRecoveryError.value = getErrorMessage(error, '暂时无法查询该 AI 增强请求的状态。')
  } finally {
    if (requestId === explicitAiRequestId) isEnhancedAssistRecoveryLoading.value = false
  }
}

const loadRecentEnhancedAssistRecovery = async () => {
  const ownerUid = String(authStore.user?.uid ?? '')
  const requestId = ++enhancedAssistRecoveryRequestId
  enhancedAssistRecoveryError.value = ''
  if (!authStore.isLoggedIn || !ownerUid) {
    enhancedAssistRecovery.value = null
    return
  }

  try {
    const response = await contentAssistApi.listRecentEnhancedAssist()
    if (requestId !== enhancedAssistRecoveryRequestId || String(authStore.user?.uid ?? '') !== ownerUid) return
    const request = buildStageThreeAssistRequest()
    const fingerprint = await currentEnhancedAssistFingerprint(ownerUid, request)
    if (requestId !== enhancedAssistRecoveryRequestId || String(authStore.user?.uid ?? '') !== ownerUid) return
    const records = response.data || []
    const matched = fingerprint
      ? records.find((item) => item.requestFingerprint === fingerprint)
      : undefined
    const candidate = matched
      || records.find((item) => item.requestStatus === 'RUNNING' || item.usageStatus === 'RESERVED')
      || records[0]
    if (!candidate) {
      enhancedAssistRecovery.value = null
      return
    }

    enhancedAssistRecovery.value = {
      ...candidate,
      ownerUid,
      matchesCurrentDraft: Boolean(matched && candidate.requestId === matched.requestId),
    }
    if (!matched) return

    explicitAiRequest.value = {
      ownerUid,
      requestId: matched.requestId,
      request,
      contentRevision: editorContentRevision.value,
    }
    explicitAiError.value = ''
    if (matched.requestStatus === 'RUNNING' || matched.usageStatus === 'RESERVED') {
      explicitAiState.value = 'reconciling'
      return
    }
    await refreshRecoveredEnhancedAssist()
  } catch (_error) {
    if (requestId !== enhancedAssistRecoveryRequestId || String(authStore.user?.uid ?? '') !== ownerUid) return
    enhancedAssistRecovery.value = null
  }
}

const loadSeriesWorkbench = async () => {
  const ownerUid = authStore.user?.uid
  const requestId = ++seriesRequestId
  if (!authStore.isLoggedIn || ownerUid == null) {
    seriesRecords.value = []
    seriesSource.value = 'fallback'
    isSeriesLoading.value = false
    return
  }
  isSeriesLoading.value = true
  try {
    const res = await contentSeriesApi.listMine(ownerUid)
    if (requestId !== seriesRequestId || String(authStore.user?.uid ?? '') !== String(ownerUid)) return
    seriesRecords.value = res.data || []
    seriesSource.value = res.status
    if (selectedSeriesId.value && !seriesRecords.value.some((item) => String(item.id) === String(selectedSeriesId.value))) {
      selectedSeriesId.value = ''
    } else if (selectedSeriesId.value) {
      applyEditorExtension({
        seriesId: selectedSeriesId.value,
        seriesTitle: selectedSeriesRecord.value?.title || undefined,
        topicNames: selectedTopicNames.value.length ? selectedTopicNames.value : undefined,
      })
    }
  } finally {
    if (requestId === seriesRequestId) isSeriesLoading.value = false
  }
}

const clearStageThreeAssistTimer = () => {
  if (stageThreeAssistTimer) {
    clearTimeout(stageThreeAssistTimer)
    stageThreeAssistTimer = null
  }
}

const clearStageThreeAssistState = () => {
  clearStageThreeAssistTimer()
  stageThreeAssistRequestId += 1
  explicitAiRequestId += 1
  enhancedAssistRecoveryRequestId += 1
  stageThreeAssist.value = null
  stageThreeAssistError.value = ''
  isStageThreeAssistLoading.value = false
  explicitAiState.value = 'idle'
  explicitAiError.value = ''
  explicitAiRequest.value = null
  isExplicitAiReconciliationLoading.value = false
  enhancedAssistRecovery.value = null
  isEnhancedAssistRecoveryLoading.value = false
  enhancedAssistRecoveryError.value = ''
}

const loadExplicitAiCapability = async () => {
  const ownerUid = String(authStore.user?.uid ?? '')
  if (!authStore.isLoggedIn || !ownerUid) {
    explicitAiCapability.value = null
    return
  }
  try {
    const response = await contentAssistApi.getEnhancedCapability()
    if (String(authStore.user?.uid ?? '') !== ownerUid) return
    explicitAiCapability.value = response.data || null
  } catch (error) {
    if (String(authStore.user?.uid ?? '') !== ownerUid) return
    explicitAiCapability.value = null
    explicitAiError.value = getErrorMessage(error, 'AI 增强能力暂不可用')
  }
}

const applyExplicitAiOutcome = async (
  requestId: number,
  ownerUid: string,
  outcome: ContentAssistEnhancedOutcome,
) => {
  if (requestId !== explicitAiRequestId || String(authStore.user?.uid ?? '') !== ownerUid) return
  const currentRequest = explicitAiRequest.value
  const appliesToCurrentDraft = currentRequest?.contentRevision === editorContentRevision.value
  if (outcome.assist && appliesToCurrentDraft) stageThreeAssist.value = outcome.assist
  updateEnhancedAssistRecovery(outcome)
  if (outcome.requestStatus === 'SUCCEEDED' && outcome.usageStatus === 'CONFIRMED') {
    explicitAiState.value = appliesToCurrentDraft ? 'confirmed' : 'stale'
    toast.success(appliesToCurrentDraft
      ? (outcome.replayed ? '已回放此前的 AI 增强结果' : 'AI 增强已完成，已使用 1 次额度')
      : 'AI 增强已完成，但当前草稿已更新，结果不会覆盖新内容')
  } else if (outcome.requestStatus === 'FALLBACK' || outcome.usageStatus === 'RELEASED') {
    explicitAiState.value = appliesToCurrentDraft ? 'released' : 'stale'
    toast.warning(appliesToCurrentDraft
      ? '已回退到免费规则建议，本次未扣额度'
      : '上一版草稿已回退到免费规则建议，当前草稿可继续编辑')
  } else if (outcome.requestStatus === 'FAILED') {
    explicitAiState.value = 'rejected'
    explicitAiError.value = '本次增强未完成，请修改内容后使用新的请求重试。'
  } else {
    explicitAiState.value = 'reconciling'
    return
  }
  await loadExplicitAiCapability()
}

const outcomeMayBeUnknown = (error: unknown) => {
  if (error instanceof BizException) return false
  const status = (error as { response?: { status?: number } })?.response?.status
  return status == null || status >= 500
}

const reconcileExplicitAiEnhancement = async (requestId: number, ownerUid: string) => {
  const active = explicitAiRequest.value
  if (!active || active.ownerUid !== ownerUid || isExplicitAiReconciliationLoading.value) return
  isExplicitAiReconciliationLoading.value = true
  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (requestId !== explicitAiRequestId || String(authStore.user?.uid ?? '') !== ownerUid) return
      try {
        const response = active.requestId != null
          ? await contentAssistApi.getEnhancedAssistStatusByRequestId(active.request, active.requestId)
          : await contentAssistApi.getEnhancedAssistStatus(active.request, active.idempotencyKey || '')
        if (!response.data) throw new Error('AI 增强状态为空')
        await applyExplicitAiOutcome(requestId, ownerUid, response.data)
        if (explicitAiState.value !== 'reconciling') return
      } catch (error) {
        if (requestId !== explicitAiRequestId) return
        if (!outcomeMayBeUnknown(error)) {
          explicitAiState.value = 'rejected'
          explicitAiError.value = getErrorMessage(error, '本次 AI 增强未创建，可重新发起。')
          return
        }
        explicitAiError.value = getErrorMessage(error, '正在确认使用结果')
      }
      await new Promise((resolve) => window.setTimeout(resolve, 600))
    }
  } finally {
    isExplicitAiReconciliationLoading.value = false
  }
}

const clientRequestToken = () => {
  const cryptoApi = globalThis.crypto
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID()
  if (typeof cryptoApi?.getRandomValues === 'function') {
    const values = new Uint32Array(4)
    cryptoApi.getRandomValues(values)
    return [...values].map((value) => value.toString(16).padStart(8, '0')).join('')
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

const runExplicitAiEnhancement = async () => {
  if (explicitAiState.value === 'reconciling') {
    const active = explicitAiRequest.value
    if (active) await reconcileExplicitAiEnhancement(explicitAiRequestId, active.ownerUid)
    return
  }
  if (!canRunExplicitAiEnhancement.value) {
    if (explicitAiUnavailableReason.value) toast.info(explicitAiUnavailableReason.value)
    return
  }
  clearStageThreeAssistTimer()
  stageThreeAssistRequestId += 1
  const ownerUid = String(authStore.user?.uid ?? '')
  const requestId = ++explicitAiRequestId
  const request = buildStageThreeAssistRequest()
  const idempotencyKey = `content-assist:${clientRequestToken()}`
  explicitAiRequest.value = {
    ownerUid,
    idempotencyKey,
    request,
    contentRevision: editorContentRevision.value,
  }
  explicitAiState.value = 'submitting'
  explicitAiError.value = ''
  try {
    const response = await contentAssistApi.enhanceEditorAssist(request, idempotencyKey)
    if (!response.data) throw new Error('AI 增强结果为空')
    await applyExplicitAiOutcome(requestId, ownerUid, response.data)
    await loadRecentEnhancedAssistRecovery()
    if ((explicitAiState.value as string) === 'reconciling') {
      await reconcileExplicitAiEnhancement(explicitAiRequestId, ownerUid)
    }
  } catch (error) {
    if (requestId !== explicitAiRequestId || String(authStore.user?.uid ?? '') !== ownerUid) return
    if (outcomeMayBeUnknown(error)) {
      explicitAiState.value = 'reconciling'
      explicitAiError.value = getErrorMessage(error, '正在确认使用结果')
      await reconcileExplicitAiEnhancement(requestId, ownerUid)
      return
    }
    explicitAiState.value = 'rejected'
    explicitAiError.value = getErrorMessage(error, 'AI 增强暂不可用')
    toast.error(explicitAiError.value)
  }
}

const loadStageThreeAssist = async (manual = false) => {
  if (!authStore.isLoggedIn) {
    clearStageThreeAssistState()
    return
  }
  if (!assistPanelEnabled.value) {
    clearStageThreeAssistState()
    return
  }
  if (isForbiddenEdit.value) {
    clearStageThreeAssistState()
    return
  }
  if (!selectedDomain.value) {
    clearStageThreeAssistState()
    if (manual) toast.info('请先选择频道，再生成写作建议')
    return
  }

  const requestId = ++stageThreeAssistRequestId
  isStageThreeAssistLoading.value = true
  stageThreeAssistError.value = ''
  try {
    const res = await contentAssistApi.getEditorAssist(buildStageThreeAssistRequest())
    if (requestId !== stageThreeAssistRequestId) return
    if (!assistPanelEnabled.value || isForbiddenEdit.value) return
    if (explicitAiState.value === 'confirmed'
      && explicitAiRequest.value?.contentRevision === editorContentRevision.value) return
    stageThreeAssist.value = res.data
    if (res.data?.status === 'failed') {
      stageThreeAssistError.value = res.data.fallbackReason || '建议暂时不可用'
    }
    if (manual && res.data?.status === 'degraded') {
      toast.warning('已切换到规则降级建议')
    }
  } catch (error) {
    if (requestId !== stageThreeAssistRequestId) return
    stageThreeAssist.value = null
    stageThreeAssistError.value = getErrorMessage(error, '建议暂时不可用')
  } finally {
    if (requestId === stageThreeAssistRequestId) {
      isStageThreeAssistLoading.value = false
    }
  }
}

const scheduleStageThreeAssist = () => {
  clearStageThreeAssistTimer()
  if (!authStore.isLoggedIn || !assistPanelEnabled.value || isForbiddenEdit.value || !selectedDomain.value) return
  stageThreeAssistTimer = setTimeout(() => {
    stageThreeAssistTimer = null
    void loadStageThreeAssist(false)
  }, 650)
}

const toggleAssistPanelEnabled = async () => {
  assistPanelEnabled.value = !assistPanelEnabled.value
  safeStorage.set(stageThreeAssistPreferenceKey.value, assistPanelEnabled.value ? '1' : '0')
  if (!assistPanelEnabled.value) {
    clearStageThreeAssistState()
    toast.success('已关闭发布建议，不再自动请求内容辅助')
    return
  }
  toast.success('已开启发布建议，如未配置建议服务将自动回退到规则建议')
  await loadStageThreeAssist(true)
}

const applyAssistSummary = () => {
  if (!assistSummaryText.value) return
  applyEditorExtension({
    summary: clampEditorText(assistSummaryText.value, EDITOR_LIMITS.summaryMax),
    topicNames: selectedTopicNames.value.length ? selectedTopicNames.value : undefined,
    seriesId: selectedSeriesId.value || undefined,
    seriesTitle: selectedSeriesRecord.value?.title || undefined,
  })
  scheduleAutoSave()
  toast.success('已采纳写作助手摘要')
}

const applyTagSuggestion = (item: ContentAssistSuggestion) => {
  if (!addEditorTags([item.label])) return
  scheduleAutoSave()
  scheduleStageThreeAssist()
  toast.success(item.adopted ? '标签已在当前内容中' : '已采纳标签建议')
}

const applyTopicSuggestion = (item: ContentAssistSuggestion) => {
  const nextTopics = new Set(selectedTopicNames.value)
  nextTopics.add(item.label)
  applyEditorExtension({
    topicNames: [...nextTopics],
    seriesId: selectedSeriesId.value || undefined,
    seriesTitle: selectedSeriesRecord.value?.title || undefined,
  })
  scheduleAutoSave()
  scheduleStageThreeAssist()
  toast.success(item.adopted ? '话题已采纳' : '已采纳话题建议')
}

const removeTopicSuggestion = (topic: string) => {
  const nextTopics = selectedTopicNames.value.filter((item) => item !== topic)
  applyEditorExtension({
    topicNames: nextTopics.length ? nextTopics : undefined,
    seriesId: selectedSeriesId.value || undefined,
    seriesTitle: selectedSeriesRecord.value?.title || undefined,
  })
  scheduleAutoSave()
  scheduleStageThreeAssist()
}

const syncSeriesAssignment = async (status: 'draft' | 'published', postId?: string) => {
  const ownerUid = authStore.user?.uid
  if (!authStore.isLoggedIn || ownerUid == null) return
  if (!selectedDomain.value) return
  const previousSeriesId = sanitizeVisibleText(extensionValue.value.seriesId)
  if (!selectedSeriesId.value && !previousSeriesId) return
  const res = await contentSeriesApi.syncAssignment({
    seriesId: selectedSeriesId.value || undefined,
    previousSeriesId: previousSeriesId || undefined,
    draftId: serverDraftId.value || localDraftKey(),
    postId,
    title: normalizedTitle.value || form.value.title || '待完善标题的内容',
    summary: sanitizeVisibleText(extensionValue.value.summary) || assistSummaryText.value || knowledgeSummary.value,
    domain: selectedDomain.value,
    status,
  }, ownerUid)
  if (String(authStore.user?.uid ?? '') !== String(ownerUid)) return
  seriesSource.value = res.status
  if (res.status === 'fallback') {
    toast.warning('合集归属暂时仅保存在本地，尚未完成远端同步。')
  }
  await loadSeriesWorkbench()
  if (seriesSource.value === 'fallback') {
    toast.warning('合集暂未完成同步，本次编辑内容仍会保留。')
  }
}

const syncPublishedSeriesAssignment = async (postId?: string) => {
  try {
    await syncSeriesAssignment('published', postId)
    return true
  } catch {
    return false
  }
}

const addTemplateTags = (tags: string[]) => addEditorTags(tags)

const addTemplateTopics = (topics: string[]) => {
  const nextTopics = new Set(selectedTopicNames.value)
  topics.map((topic) => sanitizeVisibleText(topic)).filter(Boolean).forEach((topic) => nextTopics.add(topic))
  if (nextTopics.size) {
    applyEditorExtension({
      topicNames: [...nextTopics],
      seriesId: selectedSeriesId.value || undefined,
      seriesTitle: selectedSeriesRecord.value?.title || undefined,
    })
  }
}

const applyTemplateTag = (tag: string) => {
  if (!addTemplateTags([tag])) return
  scheduleAutoSave()
  scheduleStageThreeAssist()
  toast.success('已采纳模板标签')
}

const applyTemplateTopic = (topic: string) => {
  addTemplateTopics([topic])
  scheduleAutoSave()
  scheduleStageThreeAssist()
  toast.success('已采纳模板话题')
}

const writeActiveTemplateToDraft = () => {
  form.value.content = activeTemplateMarkdown.value
  addTemplateTags(activeTemplate.value.recommendedTags)
  addTemplateTopics([
    ...activeTemplate.value.recommendedTopics,
    editorAssistContext.value?.topic || '',
  ])
  applyEditorExtension({
    contentType: activeTypeCode.value,
    templateCode: activeTypeCode.value,
    assistTemplateCode: activeTemplate.value.code,
    assistContext: editorAssistContext.value || undefined,
    seriesId: selectedSeriesId.value || undefined,
    seriesTitle: selectedSeriesRecord.value?.title || undefined,
  })
  scheduleAutoSave()
  scheduleStageThreeAssist()
}

const applyActiveTemplate = () => {
  if (form.value.content.trim()) return
  writeActiveTemplateToDraft()
  if (!extensionValue.value.contentType) {
    form.value.extension = {
      ...extensionValue.value,
      contentType: activeTypeCode.value,
      templateCode: activeTypeCode.value,
    }
  } else if (!extensionValue.value.templateCode) {
    form.value.extension = {
      ...extensionValue.value,
      templateCode: activeTypeCode.value,
    }
  }
  scheduleAutoSave()
  toast.success('已套用发布模板')
}

const replaceWithActiveTemplate = () => {
  if (form.value.content.trim() && !window.confirm('当前正文已有内容，确认用所选公共模板替换正文？')) return
  writeActiveTemplateToDraft()
  toast.success('已写入公共内容模板')
}

const clearTemplateDraft = () => {
  if (!form.value.content.trim()) return
  if (!window.confirm('确认清空当前正文？标题、标签和话题会保留。')) return
  form.value.content = ''
  scheduleAutoSave()
  scheduleStageThreeAssist()
  toast.success('已清空正文')
}

const cancelSelectedTemplate = () => {
  selectedAssistTemplateCode.value = ''
  toast.success('已恢复按上下文推荐模板')
}

const copyKnowledgeAssist = async () => {
  try {
    await navigator.clipboard.writeText(knowledgeAssistMarkdown.value)
    toast.success('已复制内容整理草稿')
  } catch {
    toast.error('复制失败，请手动选择内容')
  }
}

const fillSummaryFromAssist = () => {
  form.value.extension = {
    ...extensionValue.value,
    summary: knowledgeSummary.value,
  }
  scheduleAutoSave()
  toast.success('已写入摘要字段')
}

const extractFieldErrors = (error: unknown): Record<string, string> => {
  if (!(error instanceof BizException) || !error.data || typeof error.data !== 'object') return {}
  const fieldErrorsData = (error.data as any).fieldErrors
  if (!fieldErrorsData || typeof fieldErrorsData !== 'object') return {}
  return Object.entries(fieldErrorsData).reduce<Record<string, string>>((acc, [field, message]) => {
    if (typeof message === 'string' && message.trim()) acc[field] = message
    return acc
  }, {})
}

const focusFirstFieldError = () => {
  const firstField = Object.keys(fieldErrors.value)[0]
  if (!firstField) return
  const selector = `[data-field="${firstField}"]`
  const el = document.querySelector<HTMLElement>(selector)
    || (['company', 'position', 'interviewRound', 'round', 'yearsOfExp', 'interviewResult', 'interviewRounds', 'extension'].includes(firstField)
      ? document.querySelector<HTMLElement>('[data-field="company"]')
      : null)
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) el.focus()
}

const focusQualityCheck = (key: string) => {
  const field = ['structured-background', 'structured-problem', 'structured-solution', 'structured-result']
    .includes(key)
    ? 'content'
    : key
  const el = document.querySelector<HTMLElement>(`[data-field="${field}"]`)
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) el.focus()
}

const currentPostId = () => {
  const raw = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id
  const value = String(raw ?? '').trim()
  return /^[1-9]\d*$/.test(value) ? value : undefined
}

const localDraftKey = (owner = draftOwner.value) => {
  const postId = currentPostId()
  return postId ? `post_draft:${owner}:edit:${postId}` : `post_draft:${owner}:new`
}

const localDraftStorageOptions = (owner = draftOwner.value) => ({
  owner,
  namespace: LOCAL_DRAFT_NAMESPACE,
  ttlMs: LOCAL_DRAFT_TTL,
  maxEntryBytes: 1_000_000,
})
let draftStorageWarningShown = false

const currentDraftSignature = computed(() => JSON.stringify({
  postType: form.value.postType,
  title: form.value.title,
  content: form.value.content,
  coverUrl: form.value.coverUrl,
  extension: form.value.extension,
  selectedTags: selectedTags.value,
  selectedDomain: selectedDomain.value,
  anonymousCareerPost: anonymousCareerPost.value,
  serverDraftId: serverDraftId.value,
  publicUpdateSummary: publicUpdateSummary.value,
  updateImpactScope: updateImpactScope.value,
  respondedSuggestionIds: respondedSuggestionIds.value,
}))

const hasMeaningfulDraft = computed(() => Boolean(
  form.value.title.trim()
  || form.value.content.trim()
  || form.value.coverUrl.trim()
  || selectedTags.value.length
  || Object.keys(extensionValue.value).length,
))

const hasUnsavedDraft = computed(() => hasMeaningfulDraft.value && currentDraftSignature.value !== lastDraftSignature.value)

const markDraftClean = () => {
  lastDraftSignature.value = currentDraftSignature.value
}

const persistLocalDraft = () => {
  if (draftOwner.value === 'guest') return false
  const result = safeStorage.setDraft(localDraftKey(), JSON.stringify({
    savedAt: Date.now(),
    owner: draftOwner.value,
    ...form.value,
    selectedTags: selectedTags.value,
    selectedDomain: selectedDomain.value,
    anonymousCareerPost: anonymousCareerPost.value,
    serverDraftId: serverDraftId.value,
    publicUpdateSummary: publicUpdateSummary.value,
    updateImpactScope: updateImpactScope.value,
    respondedSuggestionIds: respondedSuggestionIds.value,
  }), localDraftStorageOptions())
  if (!result.ok) {
    if (!draftStorageWarningShown) {
      draftStorageWarningShown = true
      toast.warning('本地草稿空间不足或不可用，当前内容尚未完成本地保护。')
    }
    return false
  }
  draftStorageWarningShown = false
  markDraftClean()
  return true
}

const clearAutoSaveTimer = () => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
    autoSaveTimer = null
  }
}

const scheduleAutoSave = () => {
  clearAutoSaveTimer()
  if (isEditorInitializing.value || isLoadingPost.value || isForbiddenEdit.value || isPublishing.value || !hasMeaningfulDraft.value) return
  autoSaveTimer = setTimeout(() => {
    if (!isEditorInitializing.value && !isLoadingPost.value && !isForbiddenEdit.value && !isPublishing.value && hasMeaningfulDraft.value) {
      persistLocalDraft()
    }
  }, AUTO_SAVE_DEBOUNCE_MS)
}

const currentDraftReq = () => ({
  id: serverDraftId.value || undefined,
  sourcePostId: isEditing.value ? currentPostId() : undefined,
  postType: form.value.postType,
  domain: selectedDomain.value,
  anonymous: selectedDomain.value === DOMAIN.CAREER ? anonymousCareerPost.value : false,
  title: form.value.title,
  content: form.value.content,
  coverUrl: form.value.coverUrl,
  visibility: 1,
  tagIds: form.value.tags,
  tagNames: normalizedTags.value,
  extJson: JSON.stringify({
    ...form.value.extension,
    summary: extensionValue.value.summary || undefined,
    domain: selectedDomain.value,
    anonymous: selectedDomain.value === DOMAIN.CAREER ? anonymousCareerPost.value : false,
    contentType: contentTypeCodeOf(form.value.postType),
    templateCode: contentTypeCodeOf(form.value.postType),
    tags: normalizedTags.value,
    topicNames: selectedTopicNames.value,
    seriesId: selectedSeriesId.value || undefined,
    seriesTitle: selectedSeriesRecord.value?.title || undefined,
  }),
})

const applyDraft = (draft: PostDraft, sourceLabel = '草稿') => {
  if (hasUnsafeDraftPayload(draft)) {
    toast.warning(`${sourceLabel}疑似包含乱码或测试数据，已跳过恢复`)
    return false
  }
  serverDraftId.value = String(draft.id)
  selectedDraftId.value = String(draft.id)
  let extension: Record<string, any> = {}
  try {
    extension = draft.extJson ? JSON.parse(draft.extJson) : {}
  } catch {
    extension = {}
  }
  selectedDomain.value = resolveOptionalDomain(draft.domain ?? extension.domain, Boolean(draft.anonymous ?? extension.anonymous))
  form.value = {
    postType: getContentTypeOption(draft.postType || DEFAULT_POST_TYPE).value,
    title: draft.title || '',
    content: draft.content || '',
    tags: draft.tagIds.map((id) => Number(id)).filter((id) => !Number.isNaN(id)),
    extension: {
      ...extension,
      summary: extension.summary || undefined,
    },
    coverUrl: draft.coverUrl || '',
  }
  anonymousCareerPost.value = selectedDomain.value === DOMAIN.CAREER ? Boolean(draft.anonymous ?? extension.anonymous) : false
  selectedTags.value = normalizeEditorTags(draft.tagNames)
  selectedSeriesId.value = sanitizeVisibleText(extension.seriesId)
  exposeLoadedLimitErrors()
  markDraftClean()
  return true
}

const draftTitle = (draft: PostDraft) => {
  const title = visibleDraftText(draft.title, 32)
    || visibleDraftText(draft.content, 18)
    || '待补充标题的草稿'
  const time = draft.updateTime ? new Date(draft.updateTime).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''
  return time ? `${title} · ${time}` : title
}

const visibleDraftText = (value?: string | null, maxLength = 32) => {
  const normalized = sanitizePublicVisibleText(value)
  if (!normalized) return ''
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized
}

const hasLowQualityDraftPayload = (draft: { title?: unknown; content?: unknown }) => {
  return hasLowQualityVisibleText([draft.title, draft.content])
}

const hasUnsafeDraftPayload = (draft: { title?: unknown; content?: unknown }) => {
  return hasLowQualityDraftPayload(draft) || [draft.title, draft.content].some(isSyntheticVisibleText)
}

const loadServerDrafts = async () => {
  if (isEditing.value) return
  try {
    const res = await postApi.listDrafts(10)
    serverDrafts.value = res.data || []
  } catch {
    serverDrafts.value = []
  }
}

const loadSelectedDraft = async () => {
  if (!selectedDraftId.value) return
  try {
    const localDraft = serverDrafts.value.find((draft) => String(draft.id) === selectedDraftId.value)
    const draft = localDraft || (await postApi.getDraft(selectedDraftId.value)).data
    if (!draft) return
    if (!applyDraft(draft, '服务端草稿')) return
    persistLocalDraft()
    toast.success('已恢复服务端草稿')
  } catch (error) {
    toast.error(getErrorMessage(error, '恢复草稿失败'))
  }
}

const loadLatestSourceDraft = async (postId: string) => {
  try {
    const res = await postApi.getLatestDraftBySourcePost(postId)
    if (res.data) {
      if (!applyDraft(res.data, '未发布编辑草稿')) return false
      toast.success('已恢复未发布编辑草稿')
      return true
    }
  } catch {
    // No source draft; keep current post content.
  }
  return false
}

const readLocalDraft = (onlyWhenNotEditing = false): PendingLocalDraft | null => {
  const draft = safeStorage.getDraft(localDraftKey(), localDraftStorageOptions())
  if (!draft || (onlyWhenNotEditing && isEditing.value)) return null
  try {
    const draftData = JSON.parse(draft)
    if (!draftData?.savedAt || Date.now() - Number(draftData.savedAt) > LOCAL_DRAFT_TTL || draftData.owner !== draftOwner.value) {
      safeStorage.remove(localDraftKey())
      return null
    }
    const draftForm = { ...draftData }
    if (hasUnsafeDraftPayload(draftForm)) {
      safeStorage.remove(localDraftKey())
      toast.warning('本地草稿疑似包含乱码或测试数据，已跳过恢复')
      return null
    }
    return {
      data: draftForm,
      savedAt: Number(draftForm.savedAt),
    }
  } catch {
    safeStorage.remove(localDraftKey())
    toast.warning('本地草稿已损坏，已忽略')
    return null
  }
}

const applyLocalDraft = (storedDraft: Record<string, any>) => {
  const draftForm = { ...storedDraft }
  const draftTags = draftForm.selectedTags
  const savedSelectedDomain = draftForm.selectedDomain ?? draftForm.extension?.domain
  const savedAnonymousCareerPost = Boolean(draftForm.anonymousCareerPost ?? draftForm.extension?.anonymous)
  const savedServerDraftId = draftForm.serverDraftId
  const savedPublicUpdateSummary = draftForm.publicUpdateSummary
  const savedUpdateImpactScope = draftForm.updateImpactScope
  const savedRespondedSuggestionIds = draftForm.respondedSuggestionIds
  delete draftForm.selectedTags
  delete draftForm.selectedDomain
  delete draftForm.anonymousCareerPost
  delete draftForm.serverDraftId
  delete draftForm.publicUpdateSummary
  delete draftForm.updateImpactScope
  delete draftForm.respondedSuggestionIds
  delete draftForm.savedAt
  delete draftForm.owner
  form.value = {
    ...form.value,
    ...draftForm,
    title: String(draftForm.title || ''),
    content: String(draftForm.content || ''),
    extension: {
      ...(draftForm.extension || {}),
      summary: draftForm.extension?.summary || undefined,
    },
    coverUrl: String(draftForm.coverUrl || ''),
  }
  selectedDomain.value = resolveOptionalDomain(savedSelectedDomain, savedAnonymousCareerPost)
  anonymousCareerPost.value = selectedDomain.value === DOMAIN.CAREER ? savedAnonymousCareerPost : false
  selectedTags.value = normalizeEditorTags(draftTags)
  selectedSeriesId.value = sanitizeVisibleText((draftForm.extension || {}).seriesId)
  serverDraftId.value = savedServerDraftId || ''
  selectedDraftId.value = savedServerDraftId || ''
  publicUpdateSummary.value = sanitizeVisibleText(savedPublicUpdateSummary).slice(0, EDITOR_LIMITS.summaryMax)
  updateImpactScope.value = sanitizeVisibleText(savedUpdateImpactScope) || 'CONTENT'
  respondedSuggestionIds.value = Array.isArray(savedRespondedSuggestionIds)
    ? [...new Set(savedRespondedSuggestionIds
      .map(String)
      .filter((id: string) => /^[1-9]\d*$/.test(id)))].slice(0, 20)
    : []
  exposeLoadedLimitErrors()
  markDraftClean()
  return true
}

const queueLocalDraftRestore = (onlyWhenNotEditing = false) => {
  const candidate = readLocalDraft(onlyWhenNotEditing)
  if (!candidate) return false
  pendingLocalDraft.value = candidate
  return true
}

const restorePendingLocalDraft = () => {
  const candidate = pendingLocalDraft.value
  if (!candidate) return
  if (!applyLocalDraft(candidate.data)) return
  pendingLocalDraft.value = null
  toast.success('已恢复本地草稿')
}

const discardPendingLocalDraft = () => {
  if (!pendingLocalDraft.value) return
  safeStorage.remove(localDraftKey())
  pendingLocalDraft.value = null
  if (!isEditing.value) applyTopicIdeaQuery()
  toast.success('已放弃本地草稿')
}

const topicIdeaQueryText = (value: unknown, maxLength = 80) => {
  const raw = Array.isArray(value) ? value[0] : value
  const text = sanitizeVisibleText(typeof raw === 'string' ? raw : '')
  return text.length > maxLength ? text.slice(0, maxLength) : text
}

const topicIdeaEditorQuery = () => {
  const raw = Array.isArray(route.query.editorQuery) ? route.query.editorQuery[0] : route.query.editorQuery
  if (typeof raw !== 'string' || !raw.trim()) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {}
  } catch {
    const params = new URLSearchParams(raw)
    return Object.fromEntries(params.entries())
  }
}

const topicIdeaQueryValue = (key: 'source' | 'title' | 'topic' | 'seriesId' | 'postType' | 'domain' | 'postId' | 'ideaId' | 'action' | 'contextSource') => {
  const editorQuery = topicIdeaEditorQuery()
  return editorQuery[key] ?? route.query[key]
}

const applyTrustedUpdateContext = () => {
  if (!isEditing.value) return
  const rawIds = [
    ...(Array.isArray(route.query.suggestionId) ? route.query.suggestionId : [route.query.suggestionId]),
    ...(Array.isArray(route.query.suggestionIds) ? route.query.suggestionIds : [route.query.suggestionIds]),
  ]
    .flatMap((value) => String(value || '').split(','))
    .map((value) => value.trim())
    .filter((value) => /^[1-9]\d*$/.test(value))
  respondedSuggestionIds.value = [...new Set([...respondedSuggestionIds.value, ...rawIds])].slice(0, 20)
  if (!publicUpdateSummary.value) {
    publicUpdateSummary.value = topicIdeaQueryText(route.query.updateSummary ?? route.query.reasonText, 240)
  }
}

const normalizeTopicIdeaPostType = (value: unknown): PostTypeValue | undefined => {
  const raw = topicIdeaQueryText(value, 32)
  if (!raw) return undefined
  const upperCode = raw.toUpperCase()
  const numericValue = Number(raw)
  const option = COMMUNITY_CONTENT_TYPES.find((item) => (
    item.code === upperCode
    || item.value === numericValue
  ))
  return option?.value
}

const applyTopicIdeaQuery = () => {
  if (isEditing.value || hasMeaningfulDraft.value) return false
  const context = editorAssistContext.value
  const searchGapContext = editorSearchGapContext.value
  if (!context && !searchGapContext) return false
  if (!context && searchGapContext) {
    const template = getEditorAssistTemplate(searchGapContext.templateCode)
    const nextTopics = new Set(selectedTopicNames.value)
    if (searchGapContext.keyword) nextTopics.add(searchGapContext.keyword)
    if (searchGapContext.topicSlug) nextTopics.add(searchGapContext.topicSlug)
    if (searchGapContext.keyword && !form.value.title.trim()) form.value.title = searchGapContext.keyword
    if (template) selectedAssistTemplateCode.value = template.code
    applyEditorExtension({
      topicIdeaSource: searchGapContext.source,
      topicIdeaAction: 'topic',
      topicIdeaContextSource: 'search_gap',
      topicIdeaContextType: 'topic',
      topicNames: [...nextTopics],
      contextTopicId: searchGapContext.topicId,
      assistContext: searchGapContext,
      assistTemplateCode: template?.code || activeTemplate.value.code,
      returnHref: searchGapContext.returnHref || undefined,
    })
    persistLocalDraft()
    toast.success('已带入聚合搜索缺口上下文，可继续手动编辑标题、话题和正文')
    return true
  }
  if (!context) return false

  const creatorWorkbenchSource = 'creator_workbench'
  const legacyTitle = topicIdeaQueryText(topicIdeaQueryValue('title'), 96)
  const legacyTopic = topicIdeaQueryText(topicIdeaQueryValue('topic'), 32)
  const legacyPostId = topicIdeaQueryText(topicIdeaQueryValue('postId'), 32)
  const legacyIdeaId = topicIdeaQueryText(topicIdeaQueryValue('ideaId'), 64)
  const title = context.title || legacyTitle
  const topic = context.topic || legacyTopic
  const seriesId = context.seriesId || ''
  const postType = normalizeTopicIdeaPostType(context.postType)
  const domain = resolveOptionalDomain(topicIdeaQueryValue('domain'))
  const contextPostId = context.postId || legacyPostId
  const ideaId = context.ideaId || legacyIdeaId
  const action = context.action || ''
  const contextSource = context.contextSource || context.legacySource || ''
  const template = getEditorAssistTemplate(context.templateCode)
  const nextTopics = new Set(selectedTopicNames.value)
  if (topic) nextTopics.add(topic)

  if (title && !form.value.title.trim()) form.value.title = title
  if (postType) form.value.postType = postType
  if (domain) selectedDomain.value = domain
  if (template) selectedAssistTemplateCode.value = template.code
  if (seriesId && seriesRecords.value.some((item) => String(item.id) === String(seriesId))) {
    selectedSeriesId.value = seriesId
  }
  applyEditorExtension({
    topicIdeaSource: context.source || creatorWorkbenchSource,
    topicIdeaAction: action || undefined,
    topicIdeaContextSource: contextSource || undefined,
    topicIdeaContextType: context.contextType || undefined,
    topicNames: [...nextTopics],
    seriesId: selectedSeriesId.value || undefined,
    seriesTitle: selectedSeriesRecord.value?.title || undefined,
    contextPostId,
    contextCommentId: context.commentId,
    contextTopicId: context.topicId,
    ideaId,
    assistContext: context,
    assistTemplateCode: template?.code || activeTemplate.value.code,
    returnHref: context.returnHref || undefined,
  })
  persistLocalDraft()
  toast.success('已带入公开创作上下文，可继续编辑标题和话题')
  return true
}

watch(draftOwner, async (nextOwner, prevOwner) => {
  seriesRequestId += 1
  pendingLocalDraft.value = null
  if (prevOwner && prevOwner !== 'guest' && prevOwner !== nextOwner) {
    safeStorage.clearSensitive(prevOwner)
    clearStageThreeAssistState()
  }
  if (nextOwner === 'guest') {
    seriesRecords.value = []
    seriesSource.value = 'fallback'
    isSeriesLoading.value = false
  } else if (prevOwner && prevOwner !== 'guest' && prevOwner !== nextOwner) {
    await Promise.all([loadSeriesWorkbench(), loadExplicitAiCapability()])
    await loadRecentEnhancedAssistRecovery()
  }
  if (nextOwner !== 'guest') {
    draftStorageWarningShown = false
  }
})

const toDateTimeInputValue = (value?: string) => value ? value.slice(0, 16) : undefined

const applyTrustProfileDraft = (profile: TrustProfile | null) => {
  if (!profile?.profileAvailable) {
    trustProfileEnabled.value = false
    trustProfileDraft.value = emptyTrustProfileDraft()
    return
  }
  trustProfileEnabled.value = true
  trustProfileDraft.value = {
    authorRole: profile.authorRole || 'PARTICIPANT',
    experienceStartAt: toDateTimeInputValue(profile.experienceStartAt),
    experienceEndAt: toDateTimeInputValue(profile.experienceEndAt),
    applicableAudience: profile.applicableAudience || '',
    applicableContext: profile.applicableContext || '',
    processSummary: profile.processSummary || '',
    outcomeSummary: profile.outcomeSummary || '',
    knownLimitations: profile.knownLimitations || '',
    sourceSummary: profile.sourceSummary || '',
    interestDisclosure: profile.interestDisclosure || '',
  }
}

const loadTrustProfileForEditor = async (postId: string) => {
  try {
    const res = await trustedContentApi.loadTrustProfile(postId)
    applyTrustProfileDraft(res.data)
  } catch {
    trustProfileEnabled.value = false
    trustProfileDraft.value = emptyTrustProfileDraft()
    toast.warning('经验护照暂时无法读取，仍可继续编辑正文。')
  }
}

const postReferenceTypeLabel = (type: PostReferenceType) => (
  postReferenceTypeOptions.find((item) => item.value === type)?.label || '资料来源'
)

const postReferenceStatusLabel = (status: PostReferenceStatus) => (
  status === 'BROKEN' ? '需要核查' : '可访问'
)

const cancelPostReferenceEdit = () => {
  postReferenceEditing.value = false
  postReferenceEditingId.value = ''
  postReferenceDraft.value = emptyPostReferenceDraft()
}

const startNewPostReference = () => {
  postReferenceError.value = ''
  postReferenceEditingId.value = ''
  postReferenceDraft.value = emptyPostReferenceDraft()
  postReferenceEditing.value = true
}

const startEditPostReference = (item: PostReference) => {
  postReferenceError.value = ''
  postReferenceEditingId.value = item.id
  postReferenceDraft.value = {
    referenceType: item.referenceType,
    title: item.title,
    url: item.url,
    note: item.note || '',
    referenceStatus: item.referenceStatus,
    brokenReason: item.brokenReason || '',
  }
  postReferenceEditing.value = true
}

const loadPostReferences = async (postId = currentPostId()) => {
  if (!postId) {
    postReferences.value = []
    postReferenceError.value = ''
    return
  }
  postReferencesLoading.value = true
  postReferenceError.value = ''
  try {
    const res = await postReferenceApi.list(postId)
    postReferences.value = res.data || []
  } catch (error) {
    postReferenceError.value = getErrorMessage(error, '来源清单暂时无法读取，仍可继续编辑正文。')
  } finally {
    postReferencesLoading.value = false
  }
}

const validPostReferenceUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const savePostReference = async () => {
  const postId = currentPostId()
  if (!postId) {
    postReferenceError.value = '帖子尚未生成 postId，请先发布内容后再维护来源。'
    return
  }
  const draft = postReferenceDraft.value
  const title = draft.title.trim()
  const url = draft.url.trim()
  if (!title) {
    postReferenceError.value = '请填写来源标题。'
    return
  }
  if (!validPostReferenceUrl(url)) {
    postReferenceError.value = '请输入以 http:// 或 https:// 开头的公开链接。'
    return
  }

  const editingItem = postReferenceEditingId.value
    ? postReferences.value.find((item) => item.id === postReferenceEditingId.value)
    : undefined
  if (postReferenceEditingId.value && !editingItem) {
    postReferenceError.value = '这条来源已发生变化，请刷新清单后重试。'
    return
  }

  const body: PostReferenceWrite = {
    referenceType: draft.referenceType,
    title,
    url,
    note: draft.note.trim() || undefined,
    referenceStatus: draft.referenceStatus,
    brokenReason: draft.referenceStatus === 'BROKEN' ? draft.brokenReason.trim() || undefined : undefined,
    expectedRevision: editingItem?.revision,
  }
  postReferenceSaving.value = true
  postReferenceError.value = ''
  try {
    const res = editingItem
      ? await postReferenceApi.update(postId, editingItem.id, body)
      : await postReferenceApi.create(postId, body)
    if (res.data) {
      postReferences.value = editingItem
        ? postReferences.value.map((item) => item.id === res.data?.id ? res.data : item)
        : [...postReferences.value, res.data]
    } else {
      await loadPostReferences(postId)
    }
    cancelPostReferenceEdit()
    toast.success(editingItem ? '来源已更新' : '来源已添加')
  } catch (error) {
    postReferenceError.value = getErrorMessage(error, editingItem ? '来源更新失败，请重试。' : '来源添加失败，请重试。')
  } finally {
    postReferenceSaving.value = false
  }
}

const deletePostReference = async (item: PostReference) => {
  const postId = currentPostId()
  if (!postId || postReferenceDeletingId.value) return
  if (!window.confirm(`确认删除来源“${item.title}”？此操作不会删除帖子正文。`)) return
  postReferenceDeletingId.value = item.id
  postReferenceError.value = ''
  try {
    await postReferenceApi.remove(postId, item.id, item.revision)
    postReferences.value = postReferences.value.filter((reference) => reference.id !== item.id)
    if (postReferenceEditingId.value === item.id) cancelPostReferenceEdit()
    toast.success('来源已删除')
  } catch (error) {
    postReferenceError.value = getErrorMessage(error, '来源删除失败，请刷新后重试。')
  } finally {
    postReferenceDeletingId.value = ''
  }
}

const movePostReference = async (referenceId: string, direction: -1 | 1) => {
  const postId = currentPostId()
  if (!postId || postReferenceSaving.value) return
  const ordered = [...sortedPostReferences.value]
  const index = ordered.findIndex((item) => item.id === referenceId)
  const targetIndex = index + direction
  if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return
  const [moved] = ordered.splice(index, 1)
  if (!moved) return
  ordered.splice(targetIndex, 0, moved)
  postReferenceSaving.value = true
  postReferenceError.value = ''
  try {
    const res = await postReferenceApi.reorder(postId, ordered.map((item) => ({
      referenceId: item.id,
      expectedRevision: item.revision,
    })))
    postReferences.value = res.data || []
  } catch (error) {
    postReferenceError.value = getErrorMessage(error, '来源排序失败，请刷新后重试。')
    await loadPostReferences(postId)
  } finally {
    postReferenceSaving.value = false
  }
}

const saveTrustProfileAfterPost = async (postId: string) => {
  if (!trustProfileEnabled.value) return
  const draft = trustProfileDraft.value
  if (
    draft.experienceStartAt
    && draft.experienceEndAt
    && draft.experienceEndAt < draft.experienceStartAt
  ) {
    toast.warning('经验结束时间不能早于开始时间，帖子已保存但护照未更新。')
    return
  }
  try {
    await trustedContentApi.saveTrustProfile(postId, {
      ...draft,
      experienceStartAt: draft.experienceStartAt || undefined,
      experienceEndAt: draft.experienceEndAt || undefined,
      applicableAudience: draft.applicableAudience?.trim() || undefined,
      applicableContext: draft.applicableContext?.trim() || undefined,
      processSummary: draft.processSummary?.trim() || undefined,
      outcomeSummary: draft.outcomeSummary?.trim() || undefined,
      knownLimitations: draft.knownLimitations?.trim() || undefined,
      sourceSummary: draft.sourceSummary?.trim() || undefined,
      interestDisclosure: draft.interestDisclosure?.trim() || undefined,
    })
  } catch (error) {
    toast.warning(getErrorMessage(error, '帖子已保存，但经验护照暂未同步。'))
  }
}

const loadPostForEdit = async (postId: string) => {
  isLoadingPost.value = true
  try {
    const res = await postApi.getDetail(postId)
    if (res.code !== 0 || !res.data) {
      toast.error(getResultMessage(res, '帖子不存在或已被删除'))
      router.replace('/')
      return false
    }

    const post = res.data
    if (String(post.author?.uid ?? '') !== String(authStore.user?.uid ?? '')) {
      redirectForbiddenEdit()
      return false
    }
    form.value = {
      postType: getContentTypeOption(post.postType || DEFAULT_POST_TYPE).value,
      title: post.title || '',
      content: post.content || '',
      tags: post.tags?.map(tag => Number(tag.id)).filter(tagId => !Number.isNaN(tagId)) || [],
      extension: {
        ...(post.extension || {}),
        summary: post.extension?.summary || undefined,
      },
      coverUrl: post.coverUrl || '',
    }
    selectedDomain.value = resolveOptionalDomain(post.domain, Boolean(post.anonymous))
    anonymousCareerPost.value = selectedDomain.value === DOMAIN.CAREER ? Boolean(post.anonymous) : false
    selectedTags.value = normalizeEditorTags(post.tags?.map(tag => tag.name).filter(Boolean))
    selectedSeriesId.value = sanitizeVisibleText((post.extension || {}).seriesId)
    exposeLoadedLimitErrors()
    await Promise.all([
      loadTrustProfileForEditor(postId),
      loadPostReferences(postId),
    ])
    markDraftClean()
    return true
  } catch (error) {
    if (isForbiddenError(error)) {
      redirectForbiddenEdit()
    } else {
      toast.error(getErrorMessage(error, '加载帖子失败，请重试'))
      router.replace('/')
    }
    return false
  } finally {
    isLoadingPost.value = false
  }
}

onMounted(async () => {
  isEditorInitializing.value = true
  try {
    assistPanelEnabled.value = safeStorage.get(stageThreeAssistPreferenceKey.value) === '1'
    await Promise.all([loadEditorDomains(), loadSeriesWorkbench(), loadExplicitAiCapability()])
    const postId = currentPostId()
    if (postId) {
      isEditing.value = true
      const loaded = await loadPostForEdit(postId)
      if (!loaded) return
      const restoredServerDraft = await loadLatestSourceDraft(postId)
      if (!restoredServerDraft) queueLocalDraftRestore()
      applyTrustedUpdateContext()
      clearStageThreeAssistState()
      await loadRecentEnhancedAssistRecovery()
      return
    }

    if (route.params.id) {
      toast.error('帖子 ID 格式不正确')
      router.replace('/')
      return
    }

    await loadServerDrafts()
    const hasPendingLocalDraft = queueLocalDraftRestore(true)
    if (!hasPendingLocalDraft) applyTopicIdeaQuery()
    clearStageThreeAssistState()
    await loadRecentEnhancedAssistRecovery()
  } finally {
    isEditorInitializing.value = false
  }
})

const addEditorTags = (values: unknown[]) => {
  const candidates = normalizeEditorTags(values)
  const overlong = candidates.find((tag) => tag.length > EDITOR_LIMITS.tagNameMax)
  if (overlong) {
    fieldErrors.value = { ...fieldErrors.value, tags: `单个标签最多 ${EDITOR_LIMITS.tagNameMax} 个字符` }
    toast.warning(fieldErrors.value.tags)
    return false
  }
  const next = normalizeEditorTags([...selectedTags.value, ...candidates])
  if (next.length > EDITOR_LIMITS.tagMax) {
    fieldErrors.value = { ...fieldErrors.value, tags: `最多添加 ${EDITOR_LIMITS.tagMax} 个标签` }
    toast.warning(fieldErrors.value.tags)
    return false
  }
  const changed = next.length !== selectedTags.value.length
    || next.some((tag, index) => tag !== selectedTags.value[index])
  selectedTags.value = next
  if (changed) form.value.tags = []
  if (fieldErrors.value.tags) {
    const { tags: _tags, ...rest } = fieldErrors.value
    fieldErrors.value = rest
  }
  return true
}

const addTag = () => {
  if (addEditorTags([tagInput.value])) tagInput.value = ''
}

const removeTag = (idx: number) => {
  selectedTags.value.splice(idx, 1)
  form.value.tags = []
}

const saveDraft = async () => {
  persistLocalDraft()
  const limitErrors = currentLimitErrors()
  if (Object.keys(limitErrors).length) {
    fieldErrors.value = { ...fieldErrors.value, ...limitErrors }
    toast.warning('草稿超出字段限制，已完整保存在本地；请修正标红字段后再同步到服务端')
    return
  }
  isSavingDraft.value = true
  try {
    const res = await postApi.saveDraft(currentDraftReq())
    if (res.data) {
      serverDraftId.value = String(res.data.id)
      selectedDraftId.value = String(res.data.id)
      await syncSeriesAssignment('draft')
      persistLocalDraft()
      if (!isEditing.value) await loadServerDrafts()
    }
    toast.success('草稿已同步到服务端')
  } catch (error) {
    await syncSeriesAssignment('draft')
    toast.warning(getErrorMessage(error, '已保护到本地草稿，服务端草稿同步失败'))
  } finally {
    isSavingDraft.value = false
  }
}

const publishPost = async () => {
  if (isPublishing.value || isLoadingPost.value) return
  clearFieldErrors()
  publicUpdateError.value = ''
  const validation = validateEditorPublish({
    domain: selectedDomain.value,
    title: form.value.title,
    content: form.value.content,
    summary: extensionValue.value.summary,
    tags: selectedTags.value,
    coverUrl: form.value.coverUrl,
    minContentLength: activePostType.value.minContentLength,
    minTagCount: isInterviewPost.value ? 2 : 1,
  })
  const localErrors = validation.errors
  if (Object.keys(localErrors).length > 0) {
    fieldErrors.value = { ...localErrors }
    requestAnimationFrame(focusFirstFieldError)
    toast.error(`请先修正：${Object.values(localErrors).join('；')}`)
    return
  }
  if (blockingQualityIssues.value.length > 0) {
    toast.error(`请先补齐：${blockingQualityIssues.value.map((item) => item.title).join('、')}`)
    return
  }
  if (isEditing.value && respondedSuggestionIds.value.length > 0 && !publicUpdateSummary.value.trim()) {
    publicUpdateError.value = '关联读者建议时，请填写公开更新摘要，说明实际修改了什么。'
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('[data-field="publicUpdateSummary"]')?.focus()
    })
    toast.error(publicUpdateError.value)
    return
  }

  isPublishing.value = true
  try {
    const req = {
      domain: selectedDomain.value,
      anonymous: selectedDomain.value === DOMAIN.CAREER ? anonymousCareerPost.value : false,
      postType: form.value.postType,
      title: validation.normalized.title,
      content: validation.normalized.content,
      coverUrl: validation.normalized.coverUrl,
      visibility: 1,
      tagIds: form.value.tags,
      tagNames: normalizedTags.value,
      extJson: JSON.stringify({
        ...form.value.extension,
        summary: validation.normalized.summary || undefined,
        anonymous: selectedDomain.value === DOMAIN.CAREER ? anonymousCareerPost.value : false,
        contentType: contentTypeCodeOf(form.value.postType),
        templateCode: contentTypeCodeOf(form.value.postType),
        tags: normalizedTags.value,
        topicNames: selectedTopicNames.value,
        seriesId: selectedSeriesId.value || undefined,
        seriesTitle: selectedSeriesRecord.value?.title || undefined,
      }),
      draftId: serverDraftId.value || undefined,
      publicUpdateSummary: isEditing.value ? publicUpdateSummary.value.trim() || undefined : undefined,
      impactScope: isEditing.value && publicUpdateSummary.value.trim() ? updateImpactScope.value : undefined,
      respondedSuggestionIds: isEditing.value && respondedSuggestionIds.value.length
        ? respondedSuggestionIds.value
        : undefined,
    }

    const postId = currentPostId()
    if (isEditing.value) {
      if (!postId) {
        toast.error('帖子 ID 格式不正确')
        return
      }
      const res = await postApi.update(postId, req)
      if (res.code === 0) {
        await saveTrustProfileAfterPost(postId)
        const seriesSynced = await syncPublishedSeriesAssignment(postId)
        safeStorage.remove(localDraftKey())
        serverDraftId.value = ''
        selectedDraftId.value = ''
        markDraftClean()
        if (!isEditing.value) await loadServerDrafts()
        const reviewRequired = Boolean(res.data?.reviewRequired)
        if (seriesSynced) {
          toast.success(reviewRequired ? '已提交审核，通过后对外展示' : '保存成功')
        } else {
          toast.warning(reviewRequired ? '内容已提交审核，但合集暂未同步' : '内容已保存，但合集暂未同步，可稍后在合集工作台重试')
        }
        router.push(postPublishDestination(postId, reviewRequired))
      } else {
        toast.error(getResultMessage(res, '保存失败'))
      }
      return
    }
    const res = await postApi.create(req)
    if (res.code === 0) {
      const createdPostId = res.data?.postId == null ? undefined : String(res.data.postId)
      if (createdPostId) {
        await saveTrustProfileAfterPost(createdPostId)
      }
      const seriesSynced = await syncPublishedSeriesAssignment(createdPostId)
      safeStorage.remove(localDraftKey())
      serverDraftId.value = ''
      selectedDraftId.value = ''
      markDraftClean()
      if (!isEditing.value) await loadServerDrafts()
      const reviewRequired = Boolean(res.data?.reviewRequired)
      if (seriesSynced) {
        toast.success(reviewRequired ? '已提交审核，通过后对外展示' : '发布成功')
      } else {
        toast.warning(reviewRequired ? '内容已提交审核，但合集暂未同步' : '内容已发布，但合集暂未同步，可稍后在合集工作台重试')
      }
      router.push(postPublishDestination(createdPostId, reviewRequired))
    } else {
      toast.error(getResultMessage(res, `${isEditing.value ? '保存' : '发布'}失败`))
    }
  } catch (error) {
    persistLocalDraft()
    const errors = extractFieldErrors(error)
    if (Object.keys(errors).length > 0) {
      fieldErrors.value = errors
      requestAnimationFrame(focusFirstFieldError)
    }
    publishFailure.value = buildPublishFailure(error)
    toast.error(`${getErrorMessage(error, `${isEditing.value ? '保存' : '发布'}失败，请重试`)}，草稿已保存`)
  } finally {
    isPublishing.value = false
  }
}

const firstString = (value: unknown) => {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : ''
  return typeof value === 'string' ? value : ''
}

const errorCodeOf = (error: unknown) => {
  if (error instanceof BizException) return error.code
  const status = (error as any)?.response?.status
  return typeof status === 'number' ? status : undefined
}

const isForbiddenError = (error: unknown) => {
  const code = errorCodeOf(error)
  return code === 10403 || code === 403
}

const traceIdOf = (error: unknown) => {
  if (error instanceof BizException) return error.traceId || ''
  const traceId = (error as any)?.response?.data?.traceId
    || (error as any)?.response?.headers?.['x-trace-id']
    || (error as any)?.config?.headers?.['X-Trace-Id']
  return typeof traceId === 'string' ? traceId : ''
}

const publishFailureTitle = (error: unknown) => {
  const code = errorCodeOf(error)
  if (code === 400 || code === 10001) return '内容字段没有通过校验'
  if (code === 403 || code === 10403) return '当前账号暂时不能发布这篇内容'
  if (code === 404 || code === 10404) return '发布接口或关联资源不存在'
  if (code === 409 || code === 30002) return '内容状态已变化，请刷新后确认'
  if (code === 20000 || code === 20001 || code === 500 || code === 503) return '服务端暂时无法完成发布'
  return '发布请求没有成功完成'
}

const buildPublishFailure = (error: unknown): PublishFailure => {
  const code = errorCodeOf(error)
  const actions = [
    '当前内容已保存为本地草稿，可以稍后从编辑器或个人主页恢复。',
    '如果错误与标签有关，可先保留标签文本并移除旧标签 ID 后重试，或到标签治理页检查是否存在未合并标签。',
  ]
  if (code === 20000 || code === 20001 || code === 500 || code === 503) {
    actions.push('数据库迁移可能未补齐，请确认 20260608 社区、标签治理和审核队列迁移已执行。')
  }
  if (Object.keys(fieldErrors.value).length > 0) {
    actions.push('请优先修正页面上标红的字段，再重新发布。')
  }
  return {
    title: publishFailureTitle(error),
    message: getErrorMessage(error, `${isEditing.value ? '保存' : '发布'}失败，请重试`),
    traceId: traceIdOf(error),
    actions,
  }
}

const retryWithTextTagsOnly = () => {
  const textTags = normalizedTags.value
  if (!textTags.length) {
    toast.warning('当前没有可保留的标签文本，请先补充至少 1 个标签再重试')
    return
  }
  selectedTags.value = textTags
  form.value.tags = []
  if (fieldErrors.value.tags) {
    const { tags: _tags, ...rest } = fieldErrors.value
    fieldErrors.value = rest
  }
  persistLocalDraft()
  toast.success('已改为使用标签文本并保存本地草稿，可以重新发布')
}

const redirectForbiddenEdit = () => {
  isForbiddenEdit.value = true
  toast.warning('只能编辑本人发布的内容')
}

const normalizeSameSitePath = (value: unknown) => {
  const raw = firstString(value).trim()
  if (!raw) return ''

  let path = ''
  if (raw.startsWith('/')) {
    path = raw
  } else if (typeof window !== 'undefined') {
    try {
      const url = new URL(raw)
      if (url.origin !== window.location.origin) return ''
      path = `${url.pathname}${url.search}${url.hash}`
    } catch {
      return ''
    }
  }

  if (!path || path.startsWith('//')) return ''
  if (/^\/editor(?:\/|$|\?)/.test(path)) return ''
  if (path === route.fullPath) return ''
  return path
}

const safeReturnPath = () => {
  const state = typeof window !== 'undefined'
    ? window.history.state as Record<string, unknown> | null
    : null
  const candidates = [
    route.query.returnHref,
    route.query.from,
    route.query.returnTo,
    route.query.redirect,
    state?.back,
    typeof document !== 'undefined' ? document.referrer : '',
  ]
  return candidates.map(normalizeSameSitePath).find(Boolean) || fallbackReturnPath.value
}

const collaborationDeliveryReturnPath = (postId: string | undefined, reviewRequired: boolean) => {
  const context = editorAssistContext.value
  if (context?.source !== 'collaboration_need' || !context.needId) return ''
  const base = normalizeSameSitePath(context.returnHref) || `/collaboration/needs/${encodeURIComponent(context.needId)}`
  const [pathAndQuery, hash = ''] = base.split('#', 2)
  const [pathname, rawQuery = ''] = pathAndQuery.split('?', 2)
  const query = new URLSearchParams(rawQuery)
  if (reviewRequired || !postId) {
    query.delete('deliveryType')
    query.delete('deliveryId')
    query.set('deliveryPendingReview', '1')
  } else {
    query.delete('deliveryPendingReview')
    query.set('deliveryType', 'POST')
    query.set('deliveryId', postId)
  }
  const suffix = query.toString()
  return `${pathname}${suffix ? `?${suffix}` : ''}${hash ? `#${hash}` : ''}`
}

const postPublishDestination = (postId: string | undefined, reviewRequired: boolean) => {
  const collaborationReturn = collaborationDeliveryReturnPath(postId, reviewRequired)
  if (collaborationReturn) return collaborationReturn
  return reviewRequired || !postId
    ? '/me'
    : { path: `/post/${postId}`, query: { published: '1' } }
}

const goBack = () => {
  router.push(safeReturnPath())
}

watch(selectedDomain, (domain) => {
  if (domain !== DOMAIN.CAREER) anonymousCareerPost.value = false
  scheduleStageThreeAssist()
})

const localValidationFields = ['domain', 'title', 'content', 'summary', 'tags', 'coverUrl'] as const
const syncEditedFieldErrors = (fields: readonly string[]) => {
  if (Object.keys(fieldErrors.value).length === 0 && !publishFailure.value) return
  const next = { ...fieldErrors.value }
  let changed = false
  fields.forEach((field) => {
    if (!(field in next)) return
    const localMessage = localValidationFields.includes(field as typeof localValidationFields[number])
      ? editorValidation.value.errors[field as typeof localValidationFields[number]]
      : undefined
    if (localMessage) {
      if (next[field] !== localMessage) {
        next[field] = localMessage
        changed = true
      }
      return
    }
    delete next[field]
    changed = true
  })
  if (changed) fieldErrors.value = next
  if (changed) publishFailure.value = null
}

watch(() => form.value.title, () => syncEditedFieldErrors(['title']))
watch(() => form.value.content, () => syncEditedFieldErrors(['content']))
watch(selectedDomain, () => syncEditedFieldErrors(['domain']))
watch(selectedTags, () => syncEditedFieldErrors(['tags']), { deep: true })
watch(() => form.value.coverUrl, () => syncEditedFieldErrors(['coverUrl']))

const handleMetaFieldChange = (field: string) => {
  const aliases: Record<string, string[]> = {
    interviewRounds: ['interviewRounds', 'interviewRound', 'round'],
  }
  syncEditedFieldErrors(aliases[field] || [field])
}

watch(selectedSeriesId, () => {
  applyEditorExtension({
    seriesId: selectedSeriesId.value || undefined,
    seriesTitle: selectedSeriesRecord.value?.title || undefined,
    topicNames: selectedTopicNames.value.length ? selectedTopicNames.value : undefined,
  })
  scheduleAutoSave()
  scheduleStageThreeAssist()
})

watch([form, selectedTags, selectedDomain, anonymousCareerPost], scheduleAutoSave, { deep: true })

watch([normalizedTitle, normalizedContent, normalizedTags, selectedDomain], scheduleStageThreeAssist, { deep: true })

watch([normalizedTitle, normalizedContent, normalizedTags, selectedDomain], () => {
  editorContentRevision.value += 1
  if (explicitAiRequest.value
    && explicitAiRequest.value.contentRevision !== editorContentRevision.value
    && ['confirmed', 'released'].includes(explicitAiState.value)) {
    explicitAiState.value = 'stale'
  }
}, { deep: true })

watch(() => authStore.isLoggedIn, async (loggedIn) => {
  if (!loggedIn) {
    seriesRequestId += 1
    seriesRecords.value = []
    clearStageThreeAssistState()
    explicitAiCapability.value = null
    return
  }
  clearStageThreeAssistState()
  await Promise.all([loadEditorDomains(), loadSeriesWorkbench(), loadExplicitAiCapability()])
  await loadRecentEnhancedAssistRecovery()
})

const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  if (!hasUnsavedDraft.value || isPublishing.value || isForbiddenEdit.value) return
  persistLocalDraft()
  event.preventDefault()
  event.returnValue = '内容已保存到本地草稿，确认离开编辑器？'
}

onBeforeRouteLeave((_to, _from, next) => {
  if (!hasUnsavedDraft.value || isPublishing.value || isForbiddenEdit.value) {
    next()
    return
  }
  persistLocalDraft()
  if (window.confirm('内容已自动保存到本地草稿，确认离开编辑器？')) {
    next()
  } else {
    next(false)
  }
})

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  clearAutoSaveTimer()
  clearStageThreeAssistTimer()
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<style scoped>
.editor-toolbar-inner,
.editor-toolbar-title,
.editor-toolbar-actions,
.editor-main-shell {
  min-width: 0;
}

.editor-heading {
  min-width: 0;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.editor-back-button {
  flex: 0 0 auto;
  white-space: nowrap;
}

.editor-title-input {
  width: 100%;
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.content-type-tabs {
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
  -webkit-overflow-scrolling: touch;
}

.content-type-tab {
  flex: 0 0 auto;
  min-height: 2.75rem;
  line-height: 1.2;
  white-space: nowrap;
}

.tag-entry-row input {
  min-width: 0;
}

.draft-select {
  min-height: 2.5rem;
  width: min(18rem, 42vw);
  border-radius: 0.5rem;
  border: 1px solid var(--border-subtle);
  background: white;
  padding: 0 0.75rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--text-primary);
  outline: none;
}

.draft-select:focus {
  box-shadow: 0 0 0 2px rgb(33 154 112 / 0.25);
}

.publish-action-group {
  display: grid;
  justify-items: end;
  gap: 0.35rem;
}

.publish-hint {
  max-width: min(22rem, 70vw);
  text-align: right;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.4;
  color: rgb(180 83 9);
}

.publish-hint--neutral {
  color: var(--text-muted);
  font-weight: 600;
}

.publish-hint__lead {
  display: block;
  margin-bottom: 0.35rem;
}

.publish-issue-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.3rem;
  font-weight: 600;
}

.publish-issue-list__item {
  display: flex;
  gap: 0.4rem;
  align-items: baseline;
  text-align: right;
}

.publish-issue-list__field {
  flex-shrink: 0;
  padding: 0.05rem 0.4rem;
  border-radius: 999px;
  background: rgb(254 243 199);
  color: rgb(146 64 14);
  font-size: 0.7rem;
  font-weight: 700;
}

.publish-diagnostic {
  display: grid;
  gap: 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(254 202 202);
  background: rgb(255 241 242);
  padding: 1rem;
  color: rgb(127 29 29);
}

.publish-diagnostic-kicker {
  font-size: 0.75rem;
  font-weight: 900;
  color: rgb(220 38 38);
}

.publish-diagnostic h2 {
  margin-top: 0.25rem;
  font-size: 1rem;
  font-weight: 900;
}

.publish-diagnostic p {
  margin-top: 0.35rem;
  font-size: 0.875rem;
  line-height: 1.55;
}

.publish-diagnostic span {
  margin-top: 0.4rem;
  display: inline-flex;
  border-radius: 999px;
  background: white;
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 800;
}

.publish-diagnostic ul {
  display: grid;
  gap: 0.4rem;
  padding-left: 1.1rem;
  font-size: 0.8125rem;
  line-height: 1.55;
}

.publish-diagnostic-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.publish-diagnostic-actions button,
.publish-diagnostic-actions a {
  display: inline-flex;
  min-height: 2.25rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  border: 1px solid rgb(252 165 165);
  background: white;
  padding: 0.45rem 0.8rem;
  font-size: 0.8125rem;
  font-weight: 800;
  color: rgb(185 28 28);
}

.template-helper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(205 232 220);
  background: rgb(232 243 237);
  padding: 1rem;
}

.editor-assist-context {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(187 247 208);
  background: rgb(240 253 244);
  padding: 1rem;
}

.public-update-editor {
  border: 1px solid rgb(167 243 208);
  border-radius: 0.5rem;
  background: rgb(240 253 250);
  padding: 1rem;
}

.public-update-editor-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.public-update-editor-head p {
  color: rgb(5 150 105);
  font-size: 0.75rem;
  font-weight: 900;
}

.public-update-editor-head strong {
  display: block;
  margin-top: 0.15rem;
  color: var(--text-strong);
}

.public-update-editor-head span,
.public-update-fields small {
  display: block;
  margin-top: 0.25rem;
  color: var(--text-primary);
  font-size: 0.78rem;
  line-height: 1.5;
}

.public-update-editor-head a {
  flex: 0 0 auto;
  color: rgb(4 120 87);
  font-size: 0.8rem;
  font-weight: 800;
}

.public-update-source {
  margin-top: 0.75rem;
  color: rgb(6 95 70);
  font-size: 0.8rem;
  font-weight: 700;
}

.public-update-fields {
  margin-top: 0.85rem;
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(12rem, 0.65fr);
  gap: 0.85rem;
}

.public-update-fields label {
  display: grid;
  gap: 0.4rem;
  color: var(--text-primary);
  font-size: 0.8rem;
  font-weight: 800;
}

.public-update-fields textarea,
.public-update-fields select {
  width: 100%;
  border: 1px solid var(--border-subtle);
  border-radius: 0.5rem;
  background: white;
  padding: 0.65rem 0.75rem;
  color: var(--text-strong);
  font-size: 0.875rem;
  outline: none;
}

.public-update-fields textarea:focus,
.public-update-fields select:focus {
  border-color: rgb(5 150 105);
  box-shadow: 0 0 0 2px rgb(167 243 208 / 0.6);
}

.post-reference-editor {
  display: grid;
  gap: 1rem;
  border: 1px solid var(--border-subtle);
  border-radius: 0.5rem;
  background: white;
  padding: 1rem;
}

.post-reference-editor-head,
.post-reference-toolbar,
.post-reference-item,
.post-reference-item-title-row,
.post-reference-item-actions,
.post-reference-form-actions,
.post-reference-primary-button,
.post-reference-secondary-button,
.post-reference-icon-button {
  display: flex;
  align-items: center;
}

.post-reference-editor-head,
.post-reference-toolbar,
.post-reference-item {
  justify-content: space-between;
  gap: 1rem;
}

.post-reference-editor-head {
  align-items: flex-start;
}

.post-reference-kicker {
  color: rgb(26 127 90);
  font-size: 0.75rem;
  font-weight: 900;
}

.post-reference-editor-head h2 {
  margin-top: 0.15rem;
  color: var(--text-strong);
  font-size: 0.95rem;
  font-weight: 900;
}

.post-reference-editor-head span,
.post-reference-toolbar p {
  margin-top: 0.25rem;
  color: var(--text-primary);
  font-size: 0.8125rem;
  line-height: 1.55;
}

.post-reference-error {
  border-radius: 0.5rem;
  background: rgb(255 241 242);
  padding: 0.65rem 0.75rem;
  color: rgb(190 18 60);
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1.5;
}

.post-reference-form {
  display: grid;
  gap: 0.85rem;
  border-radius: 0.5rem;
  background: var(--surface-soft);
  padding: 0.9rem;
}

.post-reference-form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(12rem, 0.45fr);
  gap: 0.75rem;
}

.post-reference-form-grid label {
  display: grid;
  gap: 0.4rem;
  color: var(--text-primary);
  font-size: 0.8rem;
  font-weight: 800;
}

.post-reference-form-grid label > span {
  display: inline-flex;
  align-items: baseline;
  gap: 0.3rem;
}

.post-reference-form-grid small {
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 700;
}

.post-reference-form-grid input,
.post-reference-form-grid select,
.post-reference-form-grid textarea {
  width: 100%;
  border: 1px solid var(--border-subtle);
  border-radius: 0.5rem;
  background: white;
  padding: 0.65rem 0.75rem;
  color: var(--text-strong);
  font-size: 0.875rem;
  outline: none;
}

.post-reference-form-grid textarea {
  resize: vertical;
}

.post-reference-form-grid input:focus,
.post-reference-form-grid select:focus,
.post-reference-form-grid textarea:focus {
  border-color: rgb(26 127 90);
  box-shadow: 0 0 0 2px rgb(169 216 195 / 0.7);
}

.post-reference-form-wide {
  grid-column: 1 / -1;
}

.post-reference-form-actions {
  justify-content: flex-end;
  gap: 0.5rem;
}

.post-reference-primary-button,
.post-reference-secondary-button,
.post-reference-icon-button {
  min-height: 2.35rem;
  justify-content: center;
  gap: 0.4rem;
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 800;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.post-reference-primary-button {
  border: 1px solid rgb(26 127 90);
  background: rgb(26 127 90);
  padding: 0.5rem 0.8rem;
  color: white;
}

.post-reference-primary-button:hover:not(:disabled) {
  border-color: rgb(18 99 74);
  background: rgb(18 99 74);
}

.post-reference-secondary-button,
.post-reference-icon-button {
  border: 1px solid var(--border-subtle);
  background: white;
  color: var(--text-primary);
}

.post-reference-secondary-button {
  padding: 0.5rem 0.8rem;
}

.post-reference-icon-button {
  width: 2.35rem;
  flex: 0 0 2.35rem;
}

.post-reference-secondary-button:hover:not(:disabled),
.post-reference-icon-button:hover:not(:disabled) {
  border-color: rgb(124 195 165);
  background: rgb(232 243 237);
  color: rgb(18 99 74);
}

.post-reference-delete-button:hover:not(:disabled) {
  border-color: rgb(253 164 175);
  background: rgb(255 241 242);
  color: rgb(190 18 60);
}

.post-reference-primary-button:disabled,
.post-reference-secondary-button:disabled,
.post-reference-icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.post-reference-list {
  display: grid;
  gap: 0.65rem;
}

.post-reference-item {
  align-items: flex-start;
  border: 1px solid var(--border-subtle);
  border-radius: 0.5rem;
  background: var(--surface-soft);
  padding: 0.8rem;
}

.post-reference-item-main {
  min-width: 0;
}

.post-reference-item-title-row {
  min-width: 0;
  justify-content: flex-start;
  gap: 0.35rem;
  color: rgb(26 127 90);
}

.post-reference-item-title-row a {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 0.875rem;
  font-weight: 800;
}

.post-reference-meta {
  margin-top: 0.35rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  color: var(--text-muted);
  font-size: 0.75rem;
}

.post-reference-meta > span:not(:last-child)::after {
  margin-left: 0.35rem;
  content: "·";
  color: var(--text-muted);
}

.post-reference-status-active,
.post-reference-status-broken {
  border-radius: 999px;
  padding: 0.15rem 0.45rem;
  font-weight: 800;
}

.post-reference-status-active {
  background: rgb(220 252 231);
  color: rgb(22 101 52);
}

.post-reference-status-broken {
  background: rgb(254 249 195);
  color: rgb(133 77 14);
}

.post-reference-note,
.post-reference-broken-reason {
  margin-top: 0.4rem;
  overflow-wrap: anywhere;
  font-size: 0.8125rem;
  line-height: 1.55;
}

.post-reference-note {
  color: var(--text-primary);
}

.post-reference-broken-reason {
  color: rgb(180 83 9);
  font-weight: 700;
}

.post-reference-item-actions {
  flex: 0 0 auto;
  gap: 0.4rem;
}

.editor-assist-context p,
.template-helper p {
  font-size: 0.75rem;
  font-weight: 900;
  color: rgb(26 127 90);
}

.editor-assist-context p {
  color: rgb(21 128 61);
}

.editor-assist-context strong,
.template-helper strong {
  margin-top: 0.15rem;
  display: block;
  color: var(--text-strong);
}

.editor-assist-context span,
.template-helper span {
  margin-top: 0.25rem;
  display: block;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--text-primary);
}

.editor-assist-context small,
.template-helper small {
  margin-top: 0.35rem;
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.5;
  color: var(--text-muted);
}

.editor-assist-context a,
.template-helper button {
  flex: 0 0 auto;
  border-radius: 0.5rem;
  background: rgb(26 127 90);
  padding: 0.55rem 0.9rem;
  font-size: 0.875rem;
  font-weight: 800;
  color: white;
}

.editor-assist-context a {
  background: rgb(22 163 74);
}

.template-helper button:disabled {
  cursor: not-allowed;
  background: var(--text-muted);
}

.template-chip-row {
  margin-top: 0.65rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.template-helper .template-chip {
  min-height: 1.85rem;
  border: 1px solid rgb(169 216 195);
  background: white;
  padding: 0.25rem 0.55rem;
  font-size: 0.75rem;
  color: rgb(26 127 90);
}

.template-helper .template-chip-topic {
  border-color: rgb(187 247 208);
  color: rgb(22 101 52);
}

.template-control-group {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
}

.template-select {
  min-height: 2.25rem;
  max-width: 12rem;
  border-radius: 0.5rem;
  border: 1px solid rgb(169 216 195);
  background: white;
  padding: 0 0.6rem;
  font-size: 0.8125rem;
  font-weight: 800;
  color: rgb(14 74 55);
}

.knowledge-assist {
  display: grid;
  gap: 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(169 216 195);
  background: rgb(232 243 237);
  padding: 1rem;
}

.knowledge-assist-head {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.knowledge-assist h2 {
  font-size: 0.95rem;
  font-weight: 900;
  color: rgb(14 74 55);
}

.knowledge-assist p {
  margin-top: 0.3rem;
  font-size: 0.8125rem;
  line-height: 1.55;
  color: var(--text-primary);
}

.knowledge-assist-head > span {
  flex: 0 0 auto;
  border-radius: 999px;
  background: white;
  padding: 0.25rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 900;
  color: rgb(18 99 74);
}

.knowledge-assist-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.knowledge-assist-grid article {
  min-width: 0;
  border-radius: 0.65rem;
  border: 1px solid rgb(169 216 195);
  background: white;
  padding: 0.85rem;
}

.knowledge-assist-grid strong {
  display: block;
  font-size: 0.8125rem;
  font-weight: 900;
  color: rgb(14 74 55);
}

.knowledge-assist-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.knowledge-assist-actions button {
  display: inline-flex;
  min-height: 2.25rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  border: 1px solid rgb(124 195 165);
  background: white;
  padding: 0.45rem 0.8rem;
  font-size: 0.8125rem;
  font-weight: 800;
  color: rgb(18 99 74);
}

.domain-source-note {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--text-muted);
}

.stage3-assist-panel {
  display: grid;
  gap: 1rem;
  border-radius: 0.85rem;
  border: 1px solid rgb(169 216 195);
  background: linear-gradient(180deg, var(--surface-soft), rgb(255 255 255));
  padding: 1rem;
}

.stage3-assist-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.stage3-assist-kicker {
  font-size: 0.75rem;
  font-weight: 900;
  color: rgb(26 127 90);
}

.stage3-assist-head h2 {
  margin-top: 0.2rem;
  font-size: 1rem;
  font-weight: 900;
  color: var(--text-strong);
}

.stage3-assist-head p:last-child {
  margin-top: 0.3rem;
  max-width: 44rem;
  font-size: 0.8125rem;
  line-height: 1.55;
  color: var(--text-primary);
}

.stage3-assist-head-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
}

.assist-status-pill,
.assist-head-button {
  display: inline-flex;
  min-height: 2.25rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0.4rem 0.8rem;
  font-size: 0.75rem;
  font-weight: 800;
}

.assist-status-pill {
  border: 1px solid rgb(169 216 195);
  background: white;
  color: rgb(26 127 90);
}

.assist-head-button {
  border: 1px solid var(--border-subtle);
  background: white;
  color: var(--text-primary);
}

.assist-head-button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.assist-head-button-primary {
  border-color: rgb(22 163 74);
  background: rgb(22 163 74);
  color: white;
}

.stage3-quota-copy {
  margin-top: -0.35rem;
  font-size: 0.75rem;
  line-height: 1.45;
  color: var(--text-primary);
}

.stage3-quota-copy-warning {
  color: rgb(161 98 7);
}

.assist-status-ready {
  border-color: rgb(187 247 208);
  color: rgb(21 128 61);
}

.assist-status-degraded {
  border-color: rgb(253 224 71);
  color: rgb(161 98 7);
}

.assist-status-loading {
  border-color: rgb(169 216 195);
  color: rgb(18 99 74);
}

.assist-status-disabled,
.assist-status-unauthenticated {
  border-color: var(--border-subtle);
  color: var(--text-muted);
}

.assist-status-failed {
  border-color: rgb(252 165 165);
  color: rgb(185 28 28);
}

.stage3-assist-state {
  border-radius: 0.75rem;
  border: 1px dashed rgb(169 216 195);
  background: white;
  padding: 0.9rem 1rem;
}

.stage3-assist-state strong {
  display: block;
  font-size: 0.875rem;
  color: var(--text-strong);
}

.stage3-assist-state p {
  margin-top: 0.3rem;
  font-size: 0.8125rem;
  line-height: 1.55;
  color: var(--text-primary);
}

.stage3-assist-state-error {
  border-style: solid;
  border-color: rgb(252 165 165);
  background: rgb(255 241 242);
}

.stage3-assist-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
}

.stage3-card {
  display: grid;
  gap: 0.75rem;
  min-width: 0;
  border-radius: 0.75rem;
  border: 1px solid var(--border-subtle);
  background: white;
  padding: 0.95rem;
}

.stage3-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.stage3-card-head strong {
  font-size: 0.875rem;
  color: var(--text-strong);
}

.stage3-card-head > span,
.stage3-card-head > a {
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(26 127 90);
}

.stage3-card-copy,
.stage3-empty-copy {
  font-size: 0.8125rem;
  line-height: 1.6;
  color: var(--text-primary);
}

.stage3-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.stage3-actions button {
  display: inline-flex;
  min-height: 2.25rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.55rem;
  border: 1px solid rgb(169 216 195);
  background: rgb(232 243 237);
  padding: 0.45rem 0.8rem;
  font-size: 0.8125rem;
  font-weight: 800;
  color: rgb(18 99 74);
}

.stage3-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.stage3-quality-badge {
  display: inline-flex;
  min-width: 3rem;
  justify-content: center;
  border-radius: 999px;
  background: rgb(232 243 237);
  padding: 0.25rem 0.65rem;
  font-size: 0.8rem;
  font-weight: 900;
  color: rgb(18 99 74);
}

.stage3-metric-list {
  display: grid;
  gap: 0.55rem;
}

.stage3-metric-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.6rem;
  align-items: center;
  border-radius: 0.6rem;
  background: var(--surface-soft);
  padding: 0.7rem;
}

.stage3-metric-row strong {
  display: block;
  font-size: 0.8125rem;
  color: var(--text-strong);
}

.stage3-metric-row p {
  margin-top: 0.15rem;
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--text-muted);
}

.stage3-metric-row > span {
  border-radius: 999px;
  background: white;
  padding: 0.25rem 0.55rem;
  font-size: 0.75rem;
  font-weight: 900;
  color: rgb(26 127 90);
}

.stage3-chip-list,
.stage3-selected-list,
.stage3-hint-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.stage3-chip {
  display: inline-flex;
  min-height: 2.5rem;
  align-items: center;
  gap: 0.45rem;
  border-radius: 999px;
  border: 1px solid rgb(169 216 195);
  background: rgb(232 243 237);
  padding: 0.45rem 0.8rem;
  text-align: left;
}

.stage3-chip span {
  font-size: 0.8125rem;
  font-weight: 800;
  color: rgb(14 74 55);
}

.stage3-chip small {
  font-size: 0.6875rem;
  font-weight: 800;
  color: rgb(26 127 90);
}

.stage3-chip-adopted {
  border-color: rgb(187 247 208);
  background: rgb(240 253 244);
}

.stage3-chip-adopted span,
.stage3-chip-adopted small {
  color: rgb(22 101 52);
}

.stage3-selected-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border-radius: 999px;
  background: var(--surface-soft);
  padding: 0.35rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--text-primary);
}

.stage3-selected-pill button {
  color: inherit;
}

.stage3-series-select {
  min-height: 2.5rem;
  border-radius: 0.65rem;
  border: 1px solid var(--border-subtle);
  background: var(--surface-soft);
  padding: 0.55rem 0.7rem;
  font-size: 0.875rem;
  color: var(--text-strong);
  outline: none;
}

.stage3-hint-list span {
  display: grid;
  gap: 0.15rem;
  border-radius: 0.65rem;
  background: var(--surface-soft);
  padding: 0.55rem 0.7rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--text-strong);
}

.stage3-hint-list small {
  font-size: 0.6875rem;
  font-weight: 700;
  line-height: 1.45;
  color: var(--text-muted);
}

.forbidden-primary-action,
.forbidden-secondary-action {
  display: inline-flex;
  min-height: 2.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  padding: 0.55rem 1rem;
  font-size: 0.875rem;
  font-weight: 800;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.forbidden-primary-action {
  background: rgb(26 127 90);
  color: white;
}

.forbidden-primary-action:hover {
  background: rgb(18 99 74);
}

.forbidden-secondary-action {
  border: 1px solid var(--border-subtle);
  background: white;
  color: var(--text-primary);
}

.forbidden-secondary-action:hover {
  border-color: rgb(169 216 195);
  background: rgb(232 243 237);
  color: rgb(18 99 74);
}

.quality-score {
  display: inline-flex;
  min-height: 2rem;
  min-width: 3.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 900;
}

.quality-score-ok {
  background: rgb(220 252 231);
  color: rgb(22 101 52);
}

.quality-score-warn {
  background: rgb(254 249 195);
  color: rgb(133 77 14);
}

.quality-row {
  display: grid;
  grid-template-columns: 1.75rem 1fr;
  gap: 0.65rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border-subtle);
  background: var(--surface-soft);
  padding: 0.75rem;
}

.quality-row > span {
  display: inline-flex;
  height: 1.5rem;
  width: 1.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: white;
  font-size: 0.8rem;
  font-weight: 900;
  color: var(--text-muted);
}

.quality-row strong {
  display: block;
  font-size: 0.85rem;
  color: var(--text-strong);
}

.quality-row p {
  margin-top: 0.2rem;
  font-size: 0.78rem;
  line-height: 1.5;
  color: var(--text-muted);
}

.quality-row-ok {
  border-color: rgb(187 247 208);
  background: rgb(240 253 244);
}

.quality-row-ok > span {
  color: rgb(22 101 52);
}

.quality-row-blocking {
  border-color: rgb(253 224 71);
  background: rgb(254 252 232);
}

.quality-row-blocking > span {
  color: rgb(161 98 7);
}

.field-error {
  font-size: 0.8125rem;
  font-weight: 700;
  color: rgb(225 29 72);
}

.dark .quality-score-ok {
  background: rgb(20 83 45);
  color: rgb(187 247 208);
}

.dark .quality-score-warn {
  background: rgb(113 63 18);
  color: rgb(254 240 138);
}

.dark .quality-row {
  border-color: var(--border-subtle);
  background: var(--surface-1);
}

.dark .quality-row > span {
  background: var(--surface-1);
}

.dark .draft-select {
  border-color: var(--border-subtle);
  background: var(--surface-1);
  color: var(--text-primary);
}

.dark .forbidden-secondary-action {
  border-color: var(--border-subtle);
  background: var(--surface-1);
  color: var(--text-muted);
}

.dark .forbidden-secondary-action:hover {
  border-color: rgb(33 154 112);
  background: var(--surface-1);
  color: rgb(169 216 195);
}

.dark .publish-hint {
  color: rgb(251 191 36);
}

.dark .publish-hint--neutral {
  color: var(--text-muted);
}

.dark .publish-diagnostic {
  border-color: rgb(127 29 29);
  background: rgb(69 10 10 / 0.55);
  color: rgb(254 202 202);
}

.dark .publish-diagnostic-kicker,
.dark .publish-diagnostic h2 {
  color: rgb(254 202 202);
}

.dark .publish-diagnostic span {
  background: rgb(127 29 29 / 0.55);
}

.dark .publish-diagnostic-actions button,
.dark .publish-diagnostic-actions a {
  border-color: rgb(153 27 27);
  background: var(--surface-1);
  color: rgb(254 202 202);
}

.dark .editor-assist-context,
.dark .template-helper,
.dark .public-update-editor {
  border-color: rgb(14 74 55);
  background: var(--surface-1);
}

.dark .editor-assist-context strong,
.dark .template-helper strong,
.dark .public-update-editor-head strong {
  color: var(--text-strong);
}

.dark .editor-assist-context span,
.dark .editor-assist-context small,
.dark .template-helper small,
.dark .template-helper span,
.dark .public-update-editor-head span,
.dark .public-update-fields small {
  color: var(--text-muted);
}

.dark .public-update-editor-head p,
.dark .public-update-editor-head a,
.dark .public-update-source {
  color: rgb(110 231 183);
}

.dark .public-update-fields label {
  color: var(--text-primary);
}

.dark .public-update-fields textarea,
.dark .public-update-fields select {
  border-color: var(--border-subtle);
  background: var(--surface-1);
  color: var(--text-strong);
}

.dark .post-reference-editor {
  border-color: var(--border-subtle);
  background: var(--surface-1);
}

.dark .post-reference-editor-head h2 {
  color: var(--text-strong);
}

.dark .post-reference-editor-head span,
.dark .post-reference-toolbar p,
.dark .post-reference-note {
  color: var(--text-muted);
}

.dark .post-reference-error {
  background: rgb(69 10 10 / 0.55);
  color: rgb(254 202 202);
}

.dark .post-reference-form,
.dark .post-reference-item {
  background: var(--surface-1);
}

.dark .post-reference-item {
  border-color: var(--border-subtle);
}

.dark .post-reference-form-grid label {
  color: var(--text-primary);
}

.dark .post-reference-form-grid small,
.dark .post-reference-meta {
  color: var(--text-muted);
}

.dark .post-reference-form-grid input,
.dark .post-reference-form-grid select,
.dark .post-reference-form-grid textarea {
  border-color: var(--border-subtle);
  background: var(--surface-1);
  color: var(--text-strong);
}

.dark .post-reference-secondary-button,
.dark .post-reference-icon-button {
  border-color: var(--border-subtle);
  background: var(--surface-1);
  color: var(--text-muted);
}

.dark .post-reference-secondary-button:hover:not(:disabled),
.dark .post-reference-icon-button:hover:not(:disabled) {
  border-color: rgb(33 154 112);
  background: var(--surface-1);
  color: rgb(169 216 195);
}

.dark .post-reference-delete-button:hover:not(:disabled) {
  border-color: rgb(190 18 60);
  background: rgb(76 5 25);
  color: rgb(254 205 211);
}

.dark .post-reference-status-active {
  background: rgb(20 83 45);
  color: rgb(187 247 208);
}

.dark .post-reference-status-broken {
  background: rgb(113 63 18);
  color: rgb(254 240 138);
}

.dark .post-reference-broken-reason {
  color: rgb(253 186 116);
}

.dark .editor-assist-context a,
.dark .template-select,
.dark .template-helper .template-chip {
  border-color: rgb(14 74 55);
  background: rgb(7 31 24);
  color: rgb(169 216 195);
}

.dark .knowledge-assist {
  border-color: rgb(14 74 55);
  background: rgb(7 31 24 / 0.5);
}

.dark .knowledge-assist h2,
.dark .knowledge-assist-grid strong {
  color: rgb(169 216 195);
}

.dark .knowledge-assist p {
  color: var(--text-muted);
}

.dark .knowledge-assist-head > span {
  background: var(--surface-1);
  color: rgb(169 216 195);
}

.dark .knowledge-assist-grid article,
.dark .knowledge-assist-actions button {
  border-color: rgb(14 74 55);
  background: var(--surface-1);
  color: rgb(169 216 195);
}

.dark .domain-source-note,
.dark .stage3-card-copy,
.dark .stage3-empty-copy,
.dark .stage3-hint-list small,
.dark .stage3-metric-row p,
.dark .stage3-assist-head p:last-child,
.dark .stage3-assist-state p {
  color: var(--text-muted);
}

.dark .stage3-assist-panel {
  border-color: rgb(14 74 55);
  background: linear-gradient(180deg, var(--surface-1), var(--surface-1));
}

.dark .stage3-assist-head h2,
.dark .stage3-card-head strong,
.dark .stage3-metric-row strong,
.dark .stage3-assist-state strong,
.dark .stage3-hint-list span {
  color: var(--text-strong);
}

.dark .assist-status-pill,
.dark .assist-head-button,
.dark .stage3-card,
.dark .stage3-assist-state,
.dark .stage3-series-select,
.dark .stage3-metric-row,
.dark .stage3-selected-pill,
.dark .stage3-hint-list span {
  border-color: var(--border-subtle);
  background: var(--surface-1);
  color: var(--text-primary);
}

.dark .stage3-quality-badge,
.dark .stage3-metric-row > span {
  background: var(--surface-1);
  color: rgb(169 216 195);
}

.dark .assist-head-button-primary {
  border-color: rgb(22 163 74);
  background: rgb(21 128 61);
  color: white;
}

.dark .stage3-quota-copy {
  color: var(--text-muted);
}

.dark .stage3-quota-copy-warning {
  color: rgb(253 224 71);
}

.dark .stage3-chip {
  border-color: rgb(14 74 55);
  background: rgb(7 31 24);
}

.dark .stage3-chip span,
.dark .stage3-chip small,
.dark .stage3-card-head > span,
.dark .stage3-card-head > a,
.dark .assist-status-ready {
  color: rgb(169 216 195);
}

.dark .stage3-chip-adopted {
  border-color: rgb(22 101 52);
  background: rgb(5 46 22);
}

.dark .stage3-chip-adopted span,
.dark .stage3-chip-adopted small {
  color: rgb(187 247 208);
}

.dark .assist-status-degraded {
  border-color: rgb(161 98 7);
  color: rgb(253 224 71);
}

.dark .assist-status-disabled,
.dark .assist-status-unauthenticated {
  color: var(--text-muted);
}

.dark .assist-status-failed,
.dark .stage3-assist-state-error {
  border-color: rgb(153 27 27);
  background: rgb(69 10 10 / 0.55);
  color: rgb(254 202 202);
}

.dark .stage3-actions button {
  border-color: rgb(14 74 55);
  background: rgb(7 31 24);
  color: rgb(169 216 195);
}

.dark .quality-row strong {
  color: var(--text-strong);
}

.dark .quality-row p {
  color: var(--text-muted);
}

.dark .quality-row-ok {
  border-color: rgb(22 101 52);
  background: rgb(5 46 22);
}

.dark .quality-row-blocking {
  border-color: rgb(161 98 7);
  background: rgb(69 26 3);
}

@media (max-width: 640px) {
  .editor-toolbar-inner {
    align-items: stretch;
    flex-direction: column;
    gap: 0.85rem;
  }

  .editor-toolbar-title {
    width: 100%;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .editor-back-button {
    min-height: 44px;
    padding-inline: 0.75rem;
  }

  .editor-heading {
    flex: 1 1 auto;
    font-size: 1.25rem;
  }

  .editor-toolbar-actions {
    display: grid;
    width: 100%;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: stretch;
    gap: 0.75rem;
  }

  .draft-select {
    grid-column: 1 / -1;
    width: 100%;
    min-height: 44px;
  }

  .editor-main-shell {
    padding: 1rem 0.75rem 2rem;
  }

  .editor-title-input {
    padding-inline: 0.25rem;
    font-size: 1.75rem;
  }

  .content-type-tabs {
    margin-inline: -0.75rem;
    padding-inline: 0.75rem;
  }

  .content-type-tab {
    padding: 0.75rem 0.9rem;
  }

  .tag-entry-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .publish-action-group {
    width: 100%;
    justify-items: stretch;
  }

  .publish-action-group button {
    min-height: 44px;
    width: 100%;
  }

  .publish-hint {
    max-width: none;
    text-align: left;
  }

  .publish-diagnostic {
    margin-inline: 0;
  }

  .editor-assist-context,
  .template-helper,
  .public-update-editor-head {
    margin-inline: 0;
    flex-direction: column;
    align-items: stretch;
  }

  .public-update-editor {
    margin-inline: 0;
  }

  .public-update-fields {
    grid-template-columns: 1fr;
  }

  .post-reference-editor {
    margin-inline: 0;
  }

  .post-reference-editor-head,
  .post-reference-toolbar,
  .post-reference-item {
    align-items: stretch;
    flex-direction: column;
  }

  .post-reference-editor-head > .post-reference-icon-button {
    align-self: flex-end;
  }

  .post-reference-form-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .post-reference-form-wide {
    grid-column: auto;
  }

  .post-reference-toolbar .post-reference-primary-button {
    width: 100%;
  }

  .post-reference-item-actions {
    justify-content: flex-end;
  }

  .post-reference-form-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .post-reference-form-actions button {
    min-height: 44px;
    width: 100%;
  }

  .editor-assist-context a,
  .template-select,
  .template-helper button {
    min-height: 44px;
  }

  .template-control-group {
    justify-content: stretch;
  }

  .template-control-group > * {
    flex: 1 1 100%;
    max-width: none;
  }

  .knowledge-assist {
    margin-inline: 0;
  }

  .knowledge-assist-head {
    flex-direction: column;
  }

  .knowledge-assist-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .stage3-assist-panel {
    margin-inline: 0;
  }

  .stage3-assist-head {
    flex-direction: column;
  }

  .stage3-assist-head-actions {
    width: 100%;
    justify-content: stretch;
  }

  .assist-status-pill,
  .assist-head-button {
    width: 100%;
  }

  .stage3-assist-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .stage3-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .stage3-actions button,
  .stage3-chip,
  .stage3-series-select {
    width: 100%;
  }

  .publish-diagnostic-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .publish-diagnostic-actions button,
  .publish-diagnostic-actions a,
  .knowledge-assist-actions button,
  .forbidden-primary-action,
  .forbidden-secondary-action {
    min-height: 44px;
    width: 100%;
  }
}

/* Writing-first editor layout aligned with the community prototype. */
.editor-page {
  min-height: 100vh;
  background: var(--surface-2);
}

.editor-toolbar-shell {
  position: sticky;
  top: var(--community-header-height);
  z-index: 30;
  padding: 0.65rem 0;
  background: rgb(255 255 255 / 0.96) !important;
  backdrop-filter: blur(10px);
}

.editor-toolbar-inner {
  min-height: 2.75rem;
  gap: 1rem;
}

.editor-toolbar-title {
  gap: 0.75rem !important;
}

.editor-heading {
  color: var(--text-strong) !important;
  font-size: 1rem !important;
  font-weight: 800 !important;
}

.editor-back-button {
  min-height: 2.25rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control) !important;
  padding: 0 0.7rem !important;
  background: var(--surface);
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 750;
}

.editor-back-button:hover {
  border-color: var(--primary-100);
  background: var(--primary-50) !important;
  color: var(--primary-600);
}

.editor-toolbar-actions {
  gap: 0.6rem !important;
}

.editor-toolbar-actions > button,
.publish-action-group > button {
  min-height: 2.35rem;
  border-radius: var(--radius-control) !important;
  padding: 0 0.85rem !important;
  font-size: 0.75rem;
  font-weight: 750;
}

.editor-toolbar-actions > button {
  border-color: var(--border-subtle) !important;
  background: var(--surface);
  color: var(--text-primary);
}

.publish-action-group > button {
  background: var(--primary-600) !important;
}

.draft-select {
  min-height: 2.35rem;
  width: min(14rem, 34vw);
  border-color: var(--border-subtle);
  border-radius: var(--radius-control);
  font-size: 0.75rem;
}

.publish-hint {
  max-width: 18rem;
  font-size: 0.6875rem;
}

.editor-main-shell {
  padding-top: 1.35rem;
  padding-bottom: 3rem;
}

.editor-workspace {
  display: grid;
  gap: 1.25rem;
}

.local-draft-recovery {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid rgb(251 191 36);
  border-radius: var(--radius-surface);
  background: rgb(255 251 235);
  padding: 1rem 1.1rem;
  color: rgb(120 53 15);
}

.local-draft-recovery p {
  font-size: 0.75rem;
  font-weight: 850;
}

.local-draft-recovery h2 {
  margin-top: 0.2rem;
  font-size: 1rem;
  font-weight: 850;
}

.local-draft-recovery span {
  display: block;
  margin-top: 0.35rem;
  font-size: 0.8rem;
  line-height: 1.5;
}

.local-draft-recovery-actions {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.55rem;
}

.local-draft-recovery-primary,
.local-draft-recovery-secondary {
  min-height: 2.4rem;
  border-radius: var(--radius-control);
  padding: 0.5rem 0.8rem;
  font-size: 0.8rem;
  font-weight: 800;
}

.local-draft-recovery-primary {
  border: 1px solid rgb(180 83 9);
  background: rgb(180 83 9);
  color: white;
}

.local-draft-recovery-secondary {
  border: 1px solid rgb(217 119 6);
  background: white;
  color: rgb(146 64 14);
}

.editor-compose-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 286px;
  gap: 1.25rem;
  align-items: start;
}

.editor-compose-main {
  display: grid;
  min-width: 0;
  gap: 1rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
  padding: 1.25rem;
}

.editor-compose-main > .mx-4 {
  margin-right: 0;
  margin-left: 0;
}

.editor-compose-main > div:first-child {
  gap: 0.2rem;
}

.editor-title-input {
  min-height: 3.25rem;
  padding: 0.35rem 0 !important;
  color: var(--text-strong) !important;
  font-size: 1.65rem !important;
  font-weight: 800 !important;
  line-height: 1.35;
}

.editor-title-input::placeholder {
  color: #98a2b3 !important;
}

.editor-compose-main > div:first-child > div:last-child {
  padding: 0 !important;
  color: var(--text-muted) !important;
  font-size: 0.6875rem;
}

.content-type-tabs {
  gap: 0.3rem !important;
  margin: 0;
  border: 0 !important;
  padding: 0 0 0.15rem !important;
  scrollbar-width: none;
}

.content-type-tabs::-webkit-scrollbar {
  display: none;
}

.content-type-tab {
  min-height: 2.1rem;
  border: 1px solid transparent !important;
  border-radius: 5px;
  padding: 0 0.65rem !important;
  background: var(--surface-3);
  color: var(--text-muted) !important;
  font-size: 0.7rem !important;
  font-weight: 700 !important;
}

.content-type-tab:hover:not(:disabled) {
  background: var(--primary-50);
  color: var(--primary-600) !important;
}

.content-type-tab.text-primary-600 {
  border-color: var(--primary-100) !important;
  background: var(--primary-50);
  color: var(--primary-600) !important;
}

.template-helper {
  align-items: flex-start;
  border: 0;
  border-top: 1px solid var(--border-subtle);
  border-bottom: 1px solid var(--border-subtle);
  border-radius: 0;
  background: transparent;
  padding: 0.85rem 0;
}

.template-helper > div:first-child {
  min-width: 0;
}

.template-helper p {
  color: var(--primary-600);
  font-size: 0.6875rem;
}

.template-helper strong {
  color: var(--text-strong);
  font-size: 0.8125rem;
}

.template-helper span,
.template-helper small {
  color: var(--text-muted);
  font-size: 0.7rem;
  line-height: 1.55;
}

.template-chip-row {
  margin-top: 0.5rem;
  gap: 0.3rem;
}

.template-helper .template-chip {
  min-height: 1.7rem;
  border-color: var(--border-subtle);
  border-radius: 4px;
  background: var(--surface);
  padding: 0.2rem 0.45rem;
  color: var(--text-muted);
  font-size: 0.65rem;
}

.template-control-group {
  max-width: 15rem;
  gap: 0.35rem;
}

.template-select,
.template-helper .template-control-group button {
  min-height: 2rem;
  border: 1px solid var(--border-subtle);
  border-radius: 5px;
  padding: 0 0.55rem;
  background: var(--surface-2);
  color: var(--text-primary);
  font-size: 0.6875rem;
  font-weight: 700;
}

.template-helper .template-control-group button {
  background: var(--primary-600);
  color: white;
}

.template-helper .template-control-group button:disabled {
  border-color: var(--border-subtle);
  background: var(--surface-3);
  color: var(--text-muted);
}

.editor-writing-body {
  min-width: 0;
}

.editor-writing-body :deep(.markdown-editor-shell) {
  gap: 0.75rem;
}

.editor-writing-body :deep(.markdown-editor-toolbar) {
  padding-bottom: 0.55rem;
}

.editor-writing-body :deep(.markdown-tabs) {
  width: 10.5rem;
  border-color: var(--border-subtle);
  border-radius: 6px;
  background: var(--surface-2);
}

.editor-writing-body :deep(.markdown-tab-button) {
  min-height: 2rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.editor-writing-body :deep(.markdown-textarea) {
  min-height: 31rem;
  height: 56vh;
  max-height: 44rem;
  border-color: var(--border-subtle);
  border-radius: 6px;
  background: var(--surface);
  padding: 1rem 1.1rem;
  color: var(--text-primary);
  font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", ui-sans-serif, system-ui, sans-serif;
  font-size: 0.875rem;
  line-height: 1.8;
}

.editor-writing-body :deep(.markdown-textarea::placeholder) {
  color: #667085;
}

.editor-compose-rail {
  position: sticky;
  top: calc(var(--community-header-height) + 4.65rem);
  display: grid;
  min-width: 0;
  gap: 0.75rem;
}

.editor-rail-section {
  min-width: 0;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
  padding: 0.9rem;
}

.editor-rail-label,
.editor-domain-field > label {
  color: var(--text-strong) !important;
  font-size: 0.75rem !important;
  font-weight: 800 !important;
}

.editor-rail-label span {
  color: var(--text-muted);
  font-size: 0.6875rem;
  font-weight: 600;
}

.editor-domain-field select,
.editor-tag-section input,
.editor-cover-input {
  min-height: 2.4rem;
  width: 100%;
  border: 1px solid var(--border-subtle) !important;
  border-radius: 6px !important;
  background: var(--surface-2) !important;
  padding: 0 0.65rem !important;
  color: var(--text-primary) !important;
  font-size: 0.75rem !important;
}

.editor-domain-field select {
  text-overflow: ellipsis;
}

.domain-source-note,
.editor-rail-note {
  color: var(--text-muted);
  font-size: 0.6875rem;
  line-height: 1.55;
}

.anonymous-career-toggle {
  margin: 0;
}

.editor-tag-section {
  display: grid;
  gap: 0.6rem;
}

.editor-tag-section .tag-entry-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.4rem;
}

.editor-tag-add {
  min-height: 2.4rem;
  border-radius: 6px;
  background: var(--primary-600);
  padding: 0 0.7rem;
  color: white;
  font-size: 0.7rem;
  font-weight: 750;
}

.editor-selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.editor-selected-tags > span {
  display: inline-flex;
  min-height: 1.75rem;
  align-items: center;
  gap: 0.3rem;
  border-radius: 4px;
  background: var(--primary-50);
  padding: 0.2rem 0.45rem;
  color: var(--primary-700);
  font-size: 0.6875rem;
  font-weight: 700;
}

.editor-selected-tags button {
  color: inherit;
}

.editor-cover-section {
  display: grid;
  gap: 0.55rem;
}

.editor-cover-preview {
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 6px;
  background: var(--surface-3);
}

.editor-cover-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.editor-cover-fallback {
  border: 1px dashed var(--border-subtle);
  border-radius: 6px;
  padding: 0.75rem;
  color: var(--text-muted);
  font-size: 0.6875rem;
  line-height: 1.5;
}

.editor-rail-checklist {
  display: grid;
  gap: 0.75rem;
}

.editor-rail-checklist__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.65rem;
}

.editor-rail-checklist__head p {
  color: var(--text-strong);
  font-size: 0.75rem;
  font-weight: 800;
}

.editor-rail-checklist__head strong {
  display: block;
  margin-top: 0.15rem;
  color: var(--text-muted);
  font-size: 0.6875rem;
}

.editor-rail-checklist__head > span {
  flex: 0 0 auto;
  border-radius: 4px;
  padding: 0.25rem 0.4rem;
  font-size: 0.625rem;
  font-weight: 750;
}

.editor-rail-checklist__head > .is-ready {
  background: #ecfdf3;
  color: #027a48;
}

.editor-rail-checklist__head > .is-warning {
  background: #fffaeb;
  color: #b54708;
}

.editor-rail-checklist__items {
  display: grid;
}

.editor-rail-checklist__items > div {
  display: grid;
  grid-template-columns: 1.25rem minmax(0, 1fr);
  align-items: center;
  gap: 0.45rem;
  min-height: 2rem;
  border-top: 1px solid var(--surface-3);
}

.editor-rail-checklist__items > div > button {
  margin-left: auto;
  color: var(--primary-700);
  font-size: 0.72rem;
  font-weight: 750;
}

.editor-rail-checklist__items > div > span {
  display: grid;
  width: 1rem;
  height: 1rem;
  place-items: center;
  border-radius: 50%;
  background: var(--surface-3);
  color: var(--text-muted);
  font-size: 0.625rem;
  font-weight: 800;
}

.editor-rail-checklist__items > div > p {
  overflow: hidden;
  color: var(--text-muted);
  font-size: 0.6875rem;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editor-rail-checklist__items > .is-passed > span {
  background: #ecfdf3;
  color: #027a48;
}

.editor-rail-checklist__items > .is-passed > p {
  color: var(--text-primary);
}

.editor-advanced-stack {
  display: grid;
  gap: 1rem;
}

.editor-advanced-disclosure {
  margin: 0 1rem 1rem;
  border: 1px solid var(--border-subtle);
  border-radius: 0.75rem;
  background: color-mix(in srgb, var(--surface-soft) 72%, transparent);
}

.editor-advanced-summary {
  display: flex;
  min-height: 4.5rem;
  cursor: pointer;
  list-style: none;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
}

.editor-advanced-summary::-webkit-details-marker {
  display: none;
}

.editor-advanced-summary > div {
  display: grid;
  gap: 0.25rem;
}

.editor-advanced-summary strong {
  color: var(--text-strong);
  font-size: 0.95rem;
}

.editor-advanced-summary span {
  color: var(--text-muted);
  font-size: 0.8rem;
  line-height: 1.5;
}

.editor-advanced-summary__action {
  flex-shrink: 0;
  font-weight: 700;
}

.editor-advanced-disclosure[open] .editor-advanced-summary__action {
  font-size: 0;
}

.editor-advanced-disclosure[open] .editor-advanced-summary__action::after {
  content: "收起";
  font-size: 0.8rem;
}

.editor-advanced-disclosure[open] .editor-advanced-stack {
  padding-bottom: 1rem;
}

.dark .editor-advanced-disclosure {
  border-color: var(--border-subtle);
  background: color-mix(in srgb, var(--surface-1) 50%, transparent);
}

.dark .editor-advanced-summary strong {
  color: var(--text-strong);
}

.dark .editor-advanced-summary span {
  color: var(--text-muted);
}

.editor-advanced-stack > .mx-4 {
  margin-right: 0;
  margin-left: 0;
}

.editor-advanced-stack > .px-4 {
  padding-right: 0;
  padding-left: 0;
}

.dark .editor-toolbar-shell {
  background: rgb(15 17 21 / 0.96) !important;
}

.dark .editor-compose-main,
.dark .editor-rail-section {
  border-color: var(--border-subtle);
  background: rgb(24 26 32);
}

.dark .local-draft-recovery {
  border-color: rgb(146 64 14);
  background: rgb(69 26 3);
  color: rgb(253 230 138);
}

.dark .local-draft-recovery-primary {
  border-color: rgb(245 158 11);
  background: rgb(245 158 11);
  color: rgb(69 26 3);
}

.dark .local-draft-recovery-secondary {
  border-color: rgb(180 83 9);
  background: rgb(69 26 3);
  color: rgb(253 230 138);
}

.dark .editor-title-input::placeholder,
.dark .editor-writing-body :deep(.markdown-textarea::placeholder) {
  color: var(--text-muted) !important;
}

.dark .content-type-tab {
  background: var(--surface-1);
  color: var(--text-muted) !important;
}

.dark .content-type-tab.text-primary-600,
.dark .content-type-tab:hover:not(:disabled) {
  border-color: rgb(14 74 55) !important;
  background: rgb(10 52 39 / 0.38);
  color: rgb(124 195 165) !important;
}

.dark .template-helper {
  border-color: var(--border-subtle);
  background: transparent;
}

.dark .editor-domain-field select,
.dark .editor-tag-section input,
.dark .editor-cover-input,
.dark .template-select {
  border-color: var(--border-subtle) !important;
  background: rgb(15 17 21) !important;
  color: var(--text-primary) !important;
}

.dark .editor-selected-tags > span {
  background: rgb(10 52 39 / 0.4);
  color: rgb(169 216 195);
}

.dark .editor-rail-checklist__items > div {
  border-color: var(--border-subtle);
}

@media (max-width: 1023px) {
  .editor-compose-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .editor-compose-rail {
    position: static;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .editor-domain-field,
  .editor-rail-checklist {
    grid-column: span 1;
  }
}

@media (max-width: 640px) {
  .local-draft-recovery {
    align-items: flex-start;
    flex-direction: column;
  }

  .local-draft-recovery-actions {
    width: 100%;
    justify-content: stretch;
  }

  .local-draft-recovery-actions button {
    flex: 1 1 10rem;
  }

  .editor-toolbar-shell {
    position: static;
    padding: 0.6rem 0;
    backdrop-filter: none;
  }

  .editor-toolbar-inner {
    gap: 0.65rem;
  }

  .editor-toolbar-title {
    justify-content: flex-start;
  }

  .editor-toolbar-actions {
    gap: 0.5rem !important;
  }

  .draft-select {
    min-height: 2.5rem;
  }

  .editor-main-shell {
    padding: 0.85rem 1rem 2rem;
  }

  .editor-compose-main {
    gap: 0.85rem;
    padding: 1rem;
  }

  .editor-title-input {
    min-height: 2.75rem;
    font-size: 1.35rem !important;
  }

  .content-type-tabs {
    margin-right: -1rem;
    margin-left: -1rem;
    padding-right: 1rem !important;
    padding-left: 1rem !important;
  }

  .template-helper {
    flex-direction: column;
    gap: 0.75rem;
  }

  .template-control-group {
    display: grid;
    width: 100%;
    max-width: none;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .template-control-group > * {
    min-height: 2.5rem !important;
    max-width: none;
  }

  .template-select {
    grid-column: 1 / -1;
  }

  .editor-writing-body :deep(.markdown-textarea) {
    min-height: 25rem;
    height: 58dvh;
    max-height: 38rem;
    padding: 0.9rem;
    font-size: 16px;
  }

  .editor-compose-rail {
    grid-template-columns: minmax(0, 1fr);
  }

  .editor-rail-section {
    padding: 0.85rem;
  }

  .editor-advanced-stack {
    gap: 0.85rem;
  }
}

/* ==========================================================
   暖调对齐层：把遗留冷灰 slate 原子类收敛到「闻野」品牌 token。
   仅在本组件作用域内生效；特异性高于 Tailwind utilities 与 dark:
   变体，使描边与前景由 token 统一驱动亮暗两态。
   ========================================================== */

.editor-page [class~="border-slate-100"],
.editor-page [class~="border-slate-200"],
.editor-page [class~="border-slate-300"],
.editor-page [class~="border-slate-400"] {
  border-color: var(--border-subtle);
}

.editor-page [class~="bg-slate-50"],
.editor-page [class~="bg-slate-100"] {
  background-color: var(--surface-soft);
}

.editor-page [class~="bg-white"] {
  background-color: var(--surface);
}

.editor-page [class~="text-slate-900"],
.editor-page [class~="text-slate-800"] {
  color: var(--text-strong);
}

.editor-page [class~="text-slate-700"],
.editor-page [class~="text-slate-600"] {
  color: var(--text-primary);
}

.editor-page [class~="text-slate-500"],
.editor-page [class~="text-slate-400"] {
  color: var(--text-muted);
}

/* 恢复被上面覆盖的悬停反馈（原子类 hover 变体特异性较低） */
.editor-page [class~="hover:bg-slate-50"]:hover,
.editor-page [class~="hover:bg-slate-100"]:hover {
  background-color: var(--surface-soft);
}

.editor-page [class~="hover:bg-slate-800"]:hover {
  background-color: var(--surface-2);
}
</style>
