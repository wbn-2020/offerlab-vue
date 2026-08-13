<template>
  <div class="app-shell">
    <AppHeader />
    <main class="explore-page">
      <section class="explore-band explore-band-hero">
        <div class="mb-8 explore-shell">
          <nav class="explore-toolbar" aria-label="发现页路径">
            <button type="button" class="explore-back-button" @click="returnToCommunity">
              <ArrowLeft class="h-4 w-4" aria-hidden="true" />
              返回社区
            </button>
            <span>发现</span>
          </nav>

          <div class="explore-hero-layout">
            <div class="hero-copy">
              <p class="eyebrow">发现社区内容</p>
              <h1>频道广场与话题广场</h1>
              <p class="hero-summary">
                从频道、活跃话题和精选内容进入真实经验，找到值得继续阅读、讨论或共建的方向。
              </p>
              <form class="hero-search" role="search" @submit.prevent="submitSearch">
                <Search class="h-5 w-5" aria-hidden="true" />
                <input
                  v-model.trim="keyword"
                  type="search"
                  aria-label="搜索公开经验、话题或资源"
                  placeholder="搜索公开经验、话题或资源"
                >
                <button type="submit" aria-label="搜索">
                  <ArrowRight class="h-5 w-5" aria-hidden="true" />
                </button>
              </form>
            </div>

            <aside class="explore-hero-guide" aria-label="发现页内容概览" aria-live="polite">
              <div>
                <span>公开频道</span>
                <strong>{{ loading ? '加载中' : communityChannels.length }}</strong>
              </div>
              <div>
                <span>活跃话题</span>
                <strong>{{ loading ? '加载中' : activeTopics.length }}</strong>
              </div>
              <div>
                <span>内容形式</span>
                <strong>{{ loading ? '加载中' : contentForms.length }}</strong>
              </div>
              <p v-if="loading">正在更新公共内容地图</p>
              <p v-else-if="degraded">当前可见内容可正常浏览，个别入口会在对应区域提示状态</p>
              <p v-else>{{ activeDomainOption?.label ? `正在浏览 ${activeDomainOption.label}` : '从感兴趣的频道开始探索' }}</p>
            </aside>
          </div>
        </div>
      </section>

      <section class="explore-channel-strip">
        <div class="explore-shell">
          <div class="explore-channel-strip__label">
            <strong>浏览内容</strong>
            <span>选择一个频道或内容形式</span>
          </div>
          <div class="explore-channel-strip__inner">
            <RouterLink to="/explore" class="explore-channel-strip__item" :class="{ 'explore-channel-strip__item--active': !activeChannel && !activeContentForm }">
              全部
            </RouterLink>
            <RouterLink
              v-for="channel in communityChannels"
              :key="channel.key"
              :to="{ path: '/explore', query: { channel: channel.key } }"
              class="explore-channel-strip__item"
              :class="{ 'explore-channel-strip__item--active': activeChannel?.key === channel.key }"
            >
              {{ channel.icon }} {{ channel.name }}
            </RouterLink>
            <RouterLink
              v-for="form in contentForms"
              :key="form.id"
              :to="form.href"
              class="explore-channel-strip__item"
              :class="{ 'explore-channel-strip__item--active': activeContentForm?.key === form.id.replace('content-form:', '') }"
            >
              {{ form.title }}
            </RouterLink>
          </div>
        </div>
      </section>

      <section class="explore-browse-band">
        <div class="explore-shell explore-browse-layout">
          <section class="explore-browse-content">
            <div v-if="error && !hasItems" class="state-banner state-banner-error">
              <AlertCircle class="h-5 w-5" aria-hidden="true" />
              <span>{{ error }}</span>
              <button type="button" @click="reload">
                <RefreshCw class="h-4 w-4" aria-hidden="true" />
                重试
              </button>
            </div>

            <div v-else-if="!loading && !hasItems" class="empty-panel">
              <Inbox class="h-8 w-8" aria-hidden="true" />
              <h2>发现页暂时没有可展示内容</h2>
              <p>可以先进入公开搜索浏览热门内容。</p>
              <RouterLink class="primary-link" to="/search?sort=hot">查看热门内容</RouterLink>
            </div>

            <template v-else>
              <section class="explore-content-section">
                <SectionHeader title="精选专题" :module="moduleOf('featuredTopics')" />
                <div v-if="loading" class="explore-feature-grid">
                  <SkeletonCard v-for="index in 3" :key="index" />
                </div>
                <div v-else-if="featuredTopics.length" class="explore-feature-grid">
                  <RouterLink v-for="item in featuredTopics" :key="item.id" class="explore-feature-card" :to="item.href">
                    <span class="card-kicker">精选专题</span>
                    <h2>{{ item.title }}</h2>
                    <p>{{ item.summary || item.reasonText || item.reason || '进入专题继续浏览公开内容。' }}</p>
                    <span class="card-link">
                      进入专题
                      <ArrowRight class="h-4 w-4" aria-hidden="true" />
                    </span>
                  </RouterLink>
                </div>
                <ModuleEmpty v-else :module="moduleOf('featuredTopics')" />
              </section>

              <section v-if="crossDomainStatus !== 'unauthenticated'" class="explore-content-section stage4-cross-domain-panel">
                <header class="section-header">
                  <div>
                    <p class="eyebrow">延展阅读</p>
                    <h2>跨领域推荐</h2>
                    <p class="section-copy">用公开可见的内容信号，帮你从熟悉频道走到相邻的经验和观点。</p>
                  </div>
                  <span class="module-status" :class="{ 'module-status-degraded': crossDomainStatus === 'degraded' || crossDomainStatus === 'failed' }">
                    {{ crossDomainStatusLabel }}
                  </span>
                </header>
                <div v-if="crossDomainStatus === 'failed'" class="state-banner state-banner-error">
                  <AlertCircle class="h-5 w-5" aria-hidden="true" />
                  <span>跨领域推荐暂时不可用，已保留公共内容发现入口。</span>
                  <button type="button" @click="loadCrossDomainRecommendations">
                    <RefreshCw class="h-4 w-4" aria-hidden="true" />
                    重试
                  </button>
                </div>
                <div v-else-if="crossDomainStatus === 'loading'" class="explore-feature-grid">
                  <SkeletonCard v-for="index in 3" :key="index" />
                </div>
                <div v-else-if="crossDomainRecommendations.length" class="explore-feature-grid explore-feature-grid--cross">
                  <RouterLink
                    v-for="item in crossDomainRecommendations"
                    :key="item.item.post?.postId || safeCrossDomainReason(item)"
                    class="explore-feature-card"
                    :to="`/post/${item.item.post?.postId}`"
                  >
                    <span class="card-kicker">{{ crossDomainDisplayLabel(item) }}</span>
                    <h2>{{ item.item.post?.title || '公开内容推荐' }}</h2>
                    <p>{{ safeCrossDomainReason(item) }}</p>
                    <span class="card-link">
                      阅读
                      <ArrowRight class="h-4 w-4" aria-hidden="true" />
                    </span>
                  </RouterLink>
                </div>
                <ModuleEmpty v-else-if="crossDomainStatus === 'empty'" />
              </section>

              <section v-if="activeChannel || activeContentForm" class="explore-content-section explore-content-section--entry">
                <header class="section-header">
                  <div>
                    <p class="eyebrow">当前入口</p>
                    <h2>{{ activeEntryName }}</h2>
                    <p class="section-copy">先看最新公开内容，再继续沿着代表话题深入。</p>
                  </div>
                  <span class="module-status">频道聚合</span>
                </header>

                <div v-if="visibleLatestPosts.length" class="explore-entry-list">
                  <RouterLink
                    v-for="post in visibleLatestPosts"
                    :key="post.postId"
                    class="explore-entry-row"
                    :to="`/post/${post.postId}`"
                  >
                    <img v-if="latestPostCoverUrl(post)" :src="latestPostCoverUrl(post)" :alt="post.title">
                    <Hash v-else class="h-4 w-4" aria-hidden="true" />
                    <span>
                      <strong>{{ post.title }}</strong>
                      <small>{{ activeEntryName }} · {{ getContentTypeShortLabel(post.postType) }}</small>
                    </span>
                    <ArrowRight class="h-4 w-4" aria-hidden="true" />
                  </RouterLink>
                </div>
                <ModuleEmpty v-else />

                <div v-if="channelFeaturedDirections.length" class="explore-direction-grid">
                  <RouterLink
                    v-for="direction in channelFeaturedDirections.slice(0, 6)"
                    :key="`${direction.channelKey}-${direction.topic}`"
                    class="channel-featured-direction"
                    :to="direction.href"
                  >
                    <span class="card-kicker">精选方向</span>
                    <strong>{{ direction.topic }}</strong>
                    <p>{{ direction.channelName }} · {{ direction.tags.join(' / ') }}</p>
                    <small v-if="direction.riskNote">{{ direction.riskNote }}</small>
                  </RouterLink>
                </div>

                <div v-if="recommendedAuthors.length" class="explore-author-list">
                  <div v-for="user in recommendedAuthors" :key="user.uid" class="explore-author-row">
                    <RouterLink :to="`/u/${user.uid}`" class="min-w-0 flex-1">
                      <strong>{{ user.nickname }}</strong>
                      <small>{{ user.followReasons[0] || `${user.followerCount || 0} 位关注者` }}</small>
                    </RouterLink>
                    <button
                      type="button"
                      :disabled="followingBusyIds.has(String(user.uid))"
                      @click="toggleFollowUser(user)"
                    >
                      {{ user.isFollowing ? '已关注' : '关注' }}
                    </button>
                  </div>
                </div>
              </section>
            </template>
          </section>

          <aside class="explore-browse-rail">
            <section class="explore-rail-section">
              <div class="explore-rail-section__title">
                <h2>活跃话题</h2>
                <Hash class="h-4 w-4" aria-hidden="true" />
              </div>
              <p class="explore-rail-intro">从本周正在讨论的主题进入公开内容。</p>
              <div v-if="activeTopics.length" class="explore-rail-list explore-topic-list">
                <RouterLink v-for="item in activeTopics.slice(0, 6)" :key="item.id" :to="item.href">
                  <span><Hash class="h-3.5 w-3.5" aria-hidden="true" />{{ item.title }}</span>
                  <small>{{ formatPublicContentCountText(item.reasonText || item.reason) }}</small>
                </RouterLink>
              </div>
              <ModuleEmpty v-else :module="moduleOf('activeTopics')" />
            </section>

            <section class="explore-rail-section">
              <div class="explore-rail-section__title">
                <h2>继续探索</h2>
                <Search class="h-4 w-4" aria-hidden="true" />
              </div>
              <div class="explore-rail-list">
                <RouterLink :to="communityQuestionQuery">
                  <span>社区问答讨论</span>
                  <small>从高频问题进入讨论</small>
                </RouterLink>
                <RouterLink :to="{ path: '/explore', query: { channel: 'learning-growth' } }">
                  <span>学习话题</span>
                  <small>阅读、读书、书单、学习方法：阅读清单共读 / 学习方法复盘</small>
                </RouterLink>
                <RouterLink v-for="item in searchEntrypoints.slice(0, 4)" :key="item.id" :to="item.href">
                  <span>{{ item.title }}</span>
                  <small>{{ item.summary || '进入公开搜索继续浏览' }}</small>
                </RouterLink>
              </div>
            </section>

            <section id="collab" class="explore-rail-section explore-collaboration">
              <div class="explore-rail-section__title">
                <h2>参与共建</h2>
                <ArrowRight class="h-4 w-4" aria-hidden="true" />
              </div>
              <p class="explore-rail-intro">发布真实经验，或参与公开需求与协作合集。</p>
              <div class="explore-collaboration__links">
                <RouterLink to="/editor">
                  <span>
                    <strong>发布公开内容</strong>
                    <small>经验、攻略、资源与讨论</small>
                  </span>
                  <ArrowRight class="h-4 w-4" aria-hidden="true" />
                </RouterLink>
                <RouterLink to="/collaboration">
                  <span>
                    <strong>浏览共建需求</strong>
                    <small>认领需求并留下公开贡献</small>
                  </span>
                  <ArrowRight class="h-4 w-4" aria-hidden="true" />
                </RouterLink>
                <RouterLink to="/series/workbench">
                  <span>
                    <strong>整理内容合集</strong>
                    <small>把散篇内容沉淀成长期专题</small>
                  </span>
                  <ArrowRight class="h-4 w-4" aria-hidden="true" />
                </RouterLink>
              </div>
            </section>

            <section v-if="crossDomainStatus === 'unauthenticated'" class="explore-rail-section explore-rail-section--signin">
              <p>登录后可获得跨领域的延展阅读推荐。</p>
              <RouterLink to="/login">登录查看</RouterLink>
            </section>
          </aside>
        </div>
      </section>

      <section v-if="false && error" class="explore-band">
        <div class="explore-shell">
          <div class="state-banner state-banner-error">
            <AlertCircle class="h-5 w-5" aria-hidden="true" />
            <span>{{ error }}</span>
            <button type="button" @click="reload">
              <RefreshCw class="h-4 w-4" aria-hidden="true" />
              重试
            </button>
          </div>
        </div>
      </section>

      <section v-if="false && !loading && !error && !hasItems" class="explore-band">
        <div class="explore-shell">
          <div class="empty-panel">
            <Inbox class="h-8 w-8" aria-hidden="true" />
            <h2>发现页暂时没有可展示内容</h2>
            <p>可以先进入公开搜索浏览热门内容。</p>
            <RouterLink class="primary-link" to="/search?sort=hot">查看热门内容</RouterLink>
          </div>
        </div>
      </section>

      <section v-if="false" class="explore-band">
        <div class="explore-shell section-layout">
          <SectionHeader title="精选专题" :module="moduleOf('featuredTopics')" />
          <div v-if="loading" class="topic-grid">
            <SkeletonCard v-for="index in 3" :key="index" />
          </div>
          <div v-else-if="featuredTopics.length" class="topic-grid">
            <RouterLink v-for="item in featuredTopics" :key="item.id" class="feature-card" :to="item.href">
              <span class="card-kicker">运营精选</span>
              <h2>{{ item.title }}</h2>
              <p>{{ item.summary || item.reasonText || item.reason || '进入专题继续浏览公开内容。' }}</p>
              <span class="card-link">
                进入
                <ArrowRight class="h-4 w-4" aria-hidden="true" />
              </span>
            </RouterLink>
          </div>
          <ModuleEmpty v-else :module="moduleOf('featuredTopics')" />
        </div>
      </section>

      <section v-if="false" class="explore-band stage4-cross-domain-panel">
        <div class="explore-shell section-layout">
          <header class="section-header">
            <div>
              <p class="eyebrow">拓展阅读</p>
              <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">跨领域推荐</h2>
              <p class="section-copy">
                基于公共内容信号与领域差异生成阅读建议，推荐理由会经过安全中和处理。
              </p>
            </div>
            <span class="module-status" :class="{ 'module-status-degraded': crossDomainStatus === 'degraded' || crossDomainStatus === 'failed' }">
              {{ crossDomainStatusLabel }}
            </span>
          </header>

          <div v-if="crossDomainStatus === 'unauthenticated'" class="module-empty">
            <Inbox class="h-5 w-5" aria-hidden="true" />
            <span>登录后可查看个性化跨领域推荐，当前只展示公共发现入口。</span>
          </div>
          <div v-else-if="crossDomainStatus === 'failed'" class="state-banner state-banner-error">
            <AlertCircle class="h-5 w-5" aria-hidden="true" />
            <span>跨领域推荐暂时不可用，已保留公共内容发现入口。</span>
            <button type="button" @click="loadCrossDomainRecommendations">
              <RefreshCw class="h-4 w-4" aria-hidden="true" />
              重试
            </button>
          </div>
          <div v-else-if="crossDomainStatus === 'loading'" class="topic-grid">
            <SkeletonCard v-for="index in 3" :key="index" />
          </div>
          <div v-else-if="crossDomainStatus === 'degraded'" class="state-banner">
            <AlertCircle class="h-5 w-5" aria-hidden="true" />
            <span>跨领域推荐处于降级展示，仅呈现已通过公开可见性过滤的内容。</span>
          </div>

          <div v-if="crossDomainRecommendations.length" class="topic-grid">
            <RouterLink
              v-for="item in crossDomainRecommendations"
              :key="item.item.post?.postId || safeCrossDomainReason(item)"
              class="feature-card"
              :to="`/post/${item.item.post?.postId}`"
            >
              <span class="card-kicker">{{ crossDomainDisplayLabel(item) }}</span>
              <h2>{{ item.item.post?.title || '公开内容推荐' }}</h2>
              <p>{{ safeCrossDomainReason(item) }}</p>
              <span class="card-link">
                阅读
                <ArrowRight class="h-4 w-4" aria-hidden="true" />
              </span>
            </RouterLink>
          </div>
          <ModuleEmpty v-else-if="crossDomainStatus === 'empty'" />
        </div>
      </section>

      <section v-if="false" class="explore-band explore-band-muted">
        <article class="explore-shell section-layout">
          <header class="section-header">
            <div>
              <p class="eyebrow">按频道浏览</p>
              <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">频道广场</h2>
              <p class="section-copy">
                选择一个频道后，会在发现页内聚合对应内容类型、代表话题和推荐标签。
              </p>
            </div>
            <span v-if="activeChannel || activeContentForm" class="module-status">当前入口：{{ activeEntryName }}</span>
          </header>
          <div v-if="communityChannels.length" class="channel-grid">
            <RouterLink
              v-for="channel in communityChannels"
              :key="channel.key"
              class="channel-card"
              :to="{ path: '/explore', query: { channel: channel.key } }"
            >
              <span class="channel-icon">{{ channel.icon || 'C' }}</span>
              <strong>{{ channel.name }}</strong>
              <p>{{ channel.description }}</p>
              <small v-if="channel.topics?.length">代表话题：{{ (channel.topics || []).slice(0, 2).join(' / ') }}</small>
              <small v-if="channel.tags?.length">推荐标签：{{ (channel.tags || []).slice(0, 3).join(' / ') }}</small>
              <span class="card-link">
                {{ activeChannel?.key === channel.key ? '当前频道' : '进入频道聚合' }}
                <ArrowRight class="h-4 w-4" aria-hidden="true" />
              </span>
            </RouterLink>
          </div>
          <div v-if="contentForms.length" class="content-form-grid">
            <RouterLink
              v-for="form in contentForms"
              :key="form.id"
              class="channel-card"
              :to="form.href"
            >
              <span class="channel-icon">{{ form.icon || 'F' }}</span>
              <strong>{{ form.title }}</strong>
              <p>{{ form.summary }}</p>
              <small v-if="form.reasonText">内容形式：{{ form.reasonText }}</small>
              <span class="card-link">
                进入内容形式
                <ArrowRight class="h-4 w-4" aria-hidden="true" />
              </span>
            </RouterLink>
          </div>
          <div v-if="channelFeaturedDirections.length" class="channel-featured-direction-grid">
            <RouterLink
              v-for="direction in channelFeaturedDirections"
              :key="`${direction.channelKey}-${direction.topic}`"
              class="channel-featured-direction"
              :to="direction.href"
            >
              <span class="card-kicker">精选方向</span>
              <strong>{{ direction.topic }}</strong>
              <p>{{ direction.channelName }} · {{ direction.tags.join(' / ') }}</p>
              <small v-if="direction.riskNote">{{ direction.riskNote }}</small>
            </RouterLink>
          </div>
          <div v-if="activeChannel || activeContentForm" class="compact-list">
            <RouterLink
              v-for="post in visibleLatestPosts"
              :key="post.postId"
              class="compact-row"
              :to="`/post/${post.postId}`"
            >
              <img v-if="latestPostCoverUrl(post)" :src="latestPostCoverUrl(post)" :alt="post.title" class="latest-post-cover">
              <Hash v-else class="h-4 w-4" aria-hidden="true" />
              <span>{{ post.title }}</span>
              <small>{{ activeEntryName }} · {{ getContentTypeShortLabel(post.postType) }}</small>
            </RouterLink>
          </div>
          <div v-if="recommendedAuthors.length" class="compact-list">
            <button
              v-for="user in recommendedAuthors"
              :key="user.uid"
              type="button"
              class="compact-row"
              :disabled="followingBusyIds.has(String(user.uid))"
              @click="toggleFollowUser(user)"
            >
              <Hash class="h-4 w-4" aria-hidden="true" />
              <span>{{ user.nickname }}</span>
              <small>{{ user.isFollowing ? '已关注' : '关注作者' }} · {{ user.followerCount || 0 }} 位关注者</small>
              <small v-for="reason in user.followReasons" :key="reason">{{ reason }}</small>
            </button>
          </div>
        </article>
        <div class="explore-shell section-layout">
          <SectionHeader title="频道入口" :module="moduleOf('channels')" />
          <div v-if="channels.length" class="channel-grid">
            <RouterLink v-for="item in channels" :key="item.id" class="channel-card" :to="item.href">
              <span class="channel-icon">{{ item.icon || 'C' }}</span>
              <strong>{{ item.title }}</strong>
              <p>{{ item.summary }}</p>
            </RouterLink>
          </div>
          <ModuleEmpty v-else :module="moduleOf('channels')" />
        </div>
      </section>

      <section v-if="false" class="explore-band">
        <div class="explore-shell two-column-layout">
          <div class="section-layout">
            <SectionHeader title="活跃话题" :module="moduleOf('activeTopics')" />
            <div v-if="activeTopics.length" class="compact-list">
              <RouterLink v-for="item in activeTopics" :key="item.id" class="compact-row" :to="item.href">
                <Hash class="h-4 w-4" aria-hidden="true" />
                <span>{{ item.title }}</span>
                <small v-if="item.reasonText || item.reason">{{ item.reasonText || item.reason }}</small>
              </RouterLink>
            </div>
            <ModuleEmpty v-else :module="moduleOf('activeTopics')" />
          </div>

          <div class="section-layout">
            <SectionHeader title="搜索延展" :module="moduleOf('searchEntrypoints')" />
            <div class="search-entry-grid">
              <RouterLink class="search-entry" :to="communityQuestionQuery">
                <Search class="h-4 w-4" aria-hidden="true" />
                <span>社区问答讨论</span>
              </RouterLink>
              <RouterLink class="search-entry" :to="{ path: '/explore', query: { channel: 'learning-growth' } }">
                <Hash class="h-4 w-4" aria-hidden="true" />
                <span>学习话题</span>
                <small>阅读、读书、书单、学习方法：阅读清单共读 / 学习方法复盘</small>
              </RouterLink>
              <RouterLink v-for="item in searchEntrypoints" :key="item.id" class="search-entry" :to="item.href">
                <Search class="h-4 w-4" aria-hidden="true" />
                <span>{{ item.title }}</span>
              </RouterLink>
            </div>
            <ModuleEmpty v-if="!searchEntrypoints.length" :module="moduleOf('searchEntrypoints')" />
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { AlertCircle, ArrowLeft, ArrowRight, Hash, Inbox, RefreshCw, Search } from 'lucide-vue-next'
import { recommendationsApi } from '@/api/recommendations'
import { useAuthStore } from '@/stores/auth'
import { useDomainCatalog } from '@/composables/useDomainCatalog'
import { useDiscoveryMap } from '@/composables/useDiscoveryMap'
import { ALL_COMMUNITY_CHANNELS, COMMUNITY_CONTENT_FORMS, getCommunityChannel, getDomainLabelSafe, resolveDomainLabel, resolveDomainValue, type CommunityChannel, type CommunityContentForm, type DomainValue } from '@/utils/domains'
import { COMMUNITY_CONTENT_TYPES, POST_TYPE, getContentTypeShortLabel, type PostTypeValue } from '@/utils/contentTypes'
import { formatPublicContentCountText } from '@/utils/publicDisplay'
import { filterDiscoverySuppressedItems, filterVisiblePosts, normalizeRecommendationReason, type ViewerDiscoverySuppressions } from '@/utils/recommendationGovernance'
import { filterPublicContent } from '@/utils/textQuality'
import { buildFollowReasons, isPublicAuthor } from '@/utils/creatorSignals'
import { discoveryApi, type DiscoveryItem, type DiscoveryModuleState } from '@/api/discovery'
import type { CrossDomainRecommendation, Post, User } from '@/api/types'
import AppHeader from '@/components/layout/AppHeader.vue'

type RecommendedAuthor = User & {
  followReasons: string[]
}

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const keyword = ref('')
const { data: discoveryMap, loading, error, degraded, hasItems, reload } = useDiscoveryMap()
const { domains, loadDomains } = useDomainCatalog()
const defaultChannelPostTypes = COMMUNITY_CONTENT_TYPES.map((item) => item.value)
const domainOptions = computed(() => domains.value.map((item) => ({
    value: item.domain as DomainValue,
    label: getDomainLabelSafe(item.domain),
    icon: item.icon,
    description: item.description,
  })))
const communityChannels = computed<CommunityChannel[]>(() => ALL_COMMUNITY_CHANNELS
  .map((channel) => {
    if (!channel.domain) return channel
    const domain = domains.value.find((item) => Number(item.domain) === Number(channel.domain))
    return domain
      ? {
          ...channel,
          name: getDomainLabelSafe(domain.domain),
          icon: domain.icon,
          description: domain.description,
          riskNote: domain.postingNotice || channel.riskNote,
        }
      : null
  })
  .filter((channel): channel is CommunityChannel => Boolean(channel)))
const latestPosts = ref<Post[]>([])
const channelLatestPosts = ref<Post[]>([])
const followingBusyIds = ref(new Set<string>())
const crossDomainRecommendationItems = ref<CrossDomainRecommendation[]>([])
const crossDomainStatus = ref<'idle' | 'loading' | 'ready' | 'empty' | 'unauthenticated' | 'failed' | 'degraded'>('idle')

const viewerDiscoverySuppressions = computed<ViewerDiscoverySuppressions>(() => ({}))
const visibleDiscoveryItems = (items?: DiscoveryItem[]) => filterDiscoverySuppressedItems(filterVisiblePosts(items || []), viewerDiscoverySuppressions.value)
const postSummaryForDiscovery = (post: Post) => (post.highlightSummary || post.summary || post.content || '').replace(/\s+/g, ' ').trim().slice(0, 120)
const postToDiscoveryItem = (post: Post): DiscoveryItem => ({
  id: `post-${String(post.postId)}`,
  type: 'post',
  title: post.highlightTitle || post.title,
  summary: postSummaryForDiscovery(post),
  href: `/post/${encodeURIComponent(String(post.postId))}`,
  source: 'public-content-query',
  sourceId: post.postId,
  domain: post.domain,
  tags: (post.tags || []).map((tag) => tag.name).filter(Boolean),
  reasonText: getContentTypeShortLabel(post.postType),
})
const cleanTags = computed(() => filterDiscoverySuppressedItems(discoveryMap.value?.searchEntrypoints || [], viewerDiscoverySuppressions.value))
const cleanTopics = computed(() => filterDiscoverySuppressedItems(visibleDiscoveryItems(discoveryMap.value?.activeTopics), viewerDiscoverySuppressions.value))
const cleanLatestPosts = computed(() => filterVisiblePosts(
  filterDiscoverySuppressedItems(filterPublicContent(latestPosts.value).map(postToDiscoveryItem), viewerDiscoverySuppressions.value),
  5,
))
const cleanFeaturedTopics = computed(() => filterDiscoverySuppressedItems(filterVisiblePosts(discoveryMap.value?.featuredTopics || [], 5), viewerDiscoverySuppressions.value))
const isFeaturedPost = (item: DiscoveryItem) => Boolean(item.href && item.title)
const featuredPosts = computed(() => cleanLatestPosts.value.filter(isFeaturedPost))
const featuredTopics = computed<DiscoveryItem[]>(() => featuredPosts.value.length ? featuredPosts.value : cleanFeaturedTopics.value.filter(isFeaturedPost))
const channels = computed(() => visibleDiscoveryItems(discoveryMap.value?.channels)
  .filter((item) => ALL_COMMUNITY_CHANNELS.some((channel) => item.id === `channel:${channel.key}`)))
const discoveryContentForms = computed(() => visibleDiscoveryItems(discoveryMap.value?.contentForms))
const activeTopics = computed(() => cleanTopics.value)
const searchEntrypoints = computed(() => cleanTags.value)
const domainQueryValue = computed(() => {
  const value = route.query.domain
  return Array.isArray(value) ? value[0] : value
})
const activeDomain = computed<DomainValue | undefined>(() => {
  const raw = domainQueryValue.value
  if (raw == null || raw === '') return undefined
  const resolved = resolveDomainValue(raw)
  return resolved && domains.value.some((item) => Number(item.domain) === resolved)
    ? resolved
    : undefined
})
const hasInvalidDomainQuery = computed(() => (
  domainQueryValue.value !== undefined && activeDomain.value === undefined
))
const activeChannelQuery = computed(() => {
  const value = route.query.channel
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  return typeof value === 'string' ? value : undefined
})
const activeChannel = computed(() => {
  const value = Array.isArray(activeChannelQuery.value) ? activeChannelQuery.value[0] : activeChannelQuery.value
  const resolved = getCommunityChannel(value)
  return resolved ? communityChannels.value.find((channel) => channel.key === resolved.key) : undefined
})
const activeContentFormQuery = computed(() => {
  const value = route.query.contentForm ?? route.query.channel
  return Array.isArray(value) ? value[0] : value
})
const activeContentForm = computed<CommunityContentForm | undefined>(() => {
  const value = String(activeContentFormQuery.value || '')
  const legacy = value === 'resources'
    ? 'resource'
    : value === 'qa-discussion'
      ? 'question'
      : value === 'review'
        ? 'retrospective'
        : value
  return COMMUNITY_CONTENT_FORMS.find((form) => form.key === legacy)
})
const activeEntryName = computed(() => activeChannel.value?.name || activeContentForm.value?.name || '公共内容')
const contentForms = computed(() => (
  discoveryContentForms.value.length
    ? discoveryContentForms.value
    : COMMUNITY_CONTENT_FORMS.map((form) => ({
        id: `content-form:${form.key}`,
        type: 'content-form',
        title: form.name,
        summary: form.description,
        href: `/explore?contentForm=${encodeURIComponent(form.key)}`,
        source: 'public-content-query' as const,
        icon: form.icon,
        tags: form.tags,
        reasonText: form.postTypes.map((type) => getContentTypeShortLabel(type)).join(' / '),
      }))
))
const activeChannelDomain = computed<DomainValue | undefined>(() => (
  domainQueryValue.value === undefined ? activeChannel.value?.domain : activeDomain.value
))
const activeDomainOption = computed(() => domainOptions.value.find((item) => item.value === activeChannelDomain.value))
const activeChannelPostTypes = computed(() => (
  activeContentForm.value?.postTypes?.length
    ? activeContentForm.value.postTypes
    : activeChannel.value?.postTypes?.length ? activeChannel.value.postTypes : defaultChannelPostTypes
))
const activeEntryPostTypes = computed(() => activeChannelPostTypes.value)
const activeEntryPostTypeSet = computed(() => new Set<PostTypeValue>(activeEntryPostTypes.value))
const channelFeaturedDirections = computed(() => {
  const source = activeChannel.value ? [activeChannel.value] : communityChannels.value
  return source.flatMap((channel) => (channel.topics || []).slice(0, 2).map((topic) => ({
    channelKey: channel.key,
    channelName: channel.name,
    topic,
    tags: (channel.tags || []).slice(0, 3),
    riskNote: channel.riskNote,
    href: {
      path: '/search',
      query: {
        q: topic,
        channel: channel.key,
        ...(channel.domain ? { domain: String(channel.domain) } : {}),
        ...(channel.postTypes?.length ? { types: channel.postTypes.map(String).join(',') } : {}),
      },
    },
  })))
})
const visibleLatestPosts = computed(() => filterVisiblePosts(
  filterDiscoverySuppressedItems(filterPublicContent(channelLatestPosts.value), viewerDiscoverySuppressions.value),
  6,
)
  .filter((post) => activeEntryPostTypeSet.value.has(Number(post.postType) as PostTypeValue)))
const rawRecommendedAuthors = computed<RecommendedAuthor[]>(() => {
  const users = new Map<string, User>()
  const postsByAuthor = new Map<string, Post[]>()
  visibleLatestPosts.value
    .filter((post) => isPublicAuthor(post.author))
    .forEach((post) => {
      const uid = String(post.author?.uid || '')
      if (uid && post.author && !users.has(uid)) users.set(uid, post.author)
      if (uid) postsByAuthor.set(uid, [...(postsByAuthor.get(uid) || []), post])
    })
  return Array.from(users.values())
    .filter(isPublicAuthor)
    .slice(0, 4)
    .map((user) => Object.assign(user, {
      followReasons: buildFollowReasons(user, postsByAuthor.get(String(user.uid)) || []),
    }))
})
const cleanRecommendedUsers = computed(() => filterDiscoverySuppressedItems(rawRecommendedAuthors.value, viewerDiscoverySuppressions.value))
const recommendedAuthors = computed(() => cleanRecommendedUsers.value)
const communityQuestionQuery = computed(() => ({
  path: '/search',
  query: {
    mode: 'posts',
    type: String(POST_TYPE.QUESTION),
    sort: 'hot',
  },
}))
const crossDomainStatusLabel = computed(() => {
  if (crossDomainStatus.value === 'unauthenticated') return '登录可用'
  if (crossDomainStatus.value === 'failed') return '暂不可用'
  if (crossDomainStatus.value === 'degraded') return '降级展示'
  if (crossDomainStatus.value === 'loading') return '加载中'
  if (crossDomainStatus.value === 'empty') return '暂无推荐'
  return '已过滤'
})
const safeCrossDomainReason = (item: CrossDomainRecommendation) => (
  normalizeRecommendationReason(item.recommendationReason) || '公共内容信号显示这篇内容适合作为延展阅读。'
)
const crossDomainDisplayLabel = (item: CrossDomainRecommendation) => {
  const source = resolveDomainLabel(item.sourceDomain, item.sourceDomainName)
  const target = resolveDomainLabel(
    item.targetDomain ?? item.item.post?.domain,
    item.targetDomainName,
  )
  if (source && target && source !== target) return `${source} 到 ${target}`
  if (target) return `跨频道推荐 · ${target}`
  return '跨频道推荐'
}
const crossDomainRecommendations = computed(() => filterDiscoverySuppressedItems(
  crossDomainRecommendationItems.value,
  viewerDiscoverySuppressions.value,
)
  .filter((item) => filterVisiblePosts(item.item.post ? [item.item.post] : []).length > 0))

const moduleOf = (key: string): DiscoveryModuleState | undefined => discoveryMap.value?.modules?.[key]
const latestPostCoverUrl = (post: Post) => String(post.coverUrl || '').trim()

const syncAuthorFollowState = (uid: User['uid'], following: boolean, followerCount: number) => {
  channelLatestPosts.value.forEach((post) => {
    if (String(post.author.uid) === String(uid)) {
      post.author.isFollowing = following
      post.author.followerCount = followerCount
    }
  })
}

const toggleFollowUser = async (user: User) => {
  const uid = String(user.uid)
  if (!uid || followingBusyIds.value.has(uid)) return
  followingBusyIds.value = new Set(followingBusyIds.value).add(uid)
  const wasFollowing = Boolean(user.isFollowing)
  try {
    if (wasFollowing) {
      await discoveryApi.unfollowPublicAuthor(user.uid)
    } else {
      await discoveryApi.followPublicAuthor(user.uid)
    }
    const followerCount = Math.max(0, Number(user.followerCount ?? 0) + (wasFollowing ? -1 : 1))
    user.isFollowing = !wasFollowing
    user.followerCount = followerCount
    syncAuthorFollowState(user.uid, user.isFollowing, followerCount)
  } finally {
    const next = new Set(followingBusyIds.value)
    next.delete(uid)
    followingBusyIds.value = next
  }
}

let latestPostsRequestGeneration = 0
let crossDomainRequestGeneration = 0

const loadChannelLatestPosts = async () => {
  const requestGeneration = ++latestPostsRequestGeneration
  const requestedEntryKey = activeChannel.value?.key || activeContentForm.value?.key
  const requestedDomain = activeChannelDomain.value
  const requestedPostTypes = activeEntryPostTypes.value.join(',')
  const requestedCatalog = domains.value
  const requestedToken = authStore.token
  latestPosts.value = []
  channelLatestPosts.value = []
  if (!requestedEntryKey || hasInvalidDomainQuery.value) {
    return
  }
  const settled = await Promise.allSettled(activeEntryPostTypes.value.map((type) => discoveryApi.listPublicChannelPosts({
    type,
    size: 6,
    domain: activeChannelDomain.value,
  })))
  if (
    requestGeneration !== latestPostsRequestGeneration
    || requestedEntryKey !== (activeChannel.value?.key || activeContentForm.value?.key)
    || requestedDomain !== activeChannelDomain.value
    || requestedPostTypes !== activeEntryPostTypes.value.join(',')
    || requestedCatalog !== domains.value
    || requestedToken !== authStore.token
  ) return
  const postRes = settled.find((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof discoveryApi.listPublicChannelPosts>>> => result.status === 'fulfilled')
  if (postRes) {
    latestPosts.value = filterVisiblePosts(filterPublicContent(postRes.value.data?.items || []))
  } else {
    latestPosts.value = []
  }
  channelLatestPosts.value = filterVisiblePosts(filterPublicContent(settled
    .flatMap((result) => result.status === 'fulfilled' ? (result.value.data?.items || []) : [])
    .filter((post, index, source) => source.findIndex((item) => item.postId === post.postId) === index)))
}

const loadCrossDomainRecommendations = async () => {
  const requestGeneration = ++crossDomainRequestGeneration
  const requestedToken = authStore.token
  crossDomainRecommendationItems.value = []
  if (!requestedToken) {
    crossDomainStatus.value = 'unauthenticated'
    return
  }
  crossDomainStatus.value = 'loading'
  try {
    const res = await recommendationsApi.listCrossDomain(undefined, 6)
    if (requestGeneration !== crossDomainRequestGeneration || requestedToken !== authStore.token) return
    const items = res.data?.items || []
    crossDomainRecommendationItems.value = items
    if (!items.length) {
      crossDomainStatus.value = 'empty'
    } else if (items.some((item) => item.degraded)) {
      crossDomainStatus.value = 'degraded'
    } else {
      crossDomainStatus.value = 'ready'
    }
  } catch (err) {
    if (requestGeneration !== crossDomainRequestGeneration || requestedToken !== authStore.token) return
    const status = (err as { response?: { status?: number }, code?: number })?.response?.status
    const code = (err as { code?: number })?.code
    crossDomainRecommendationItems.value = []
    crossDomainStatus.value = status === 401 || code === 10401 ? 'unauthenticated' : 'failed'
  }
}

const submitSearch = () => {
  const q = keyword.value.trim()
  router.push({ path: '/search', query: q ? { q, sort: 'hot' } : { sort: 'hot' } })
}

const returnToCommunity = () => {
  const previousRoute = window.history.state?.back
  if (typeof previousRoute === 'string' && previousRoute.startsWith('/')) {
    router.back()
    return
  }
  router.push('/')
}

onMounted(loadDomains)

watch(() => [
  activeChannel.value?.key,
  activeContentForm.value?.key,
  activeChannelDomain.value,
  activeEntryPostTypes.value.join(','),
  domains.value,
  authStore.token,
] as const, () => {
  loadChannelLatestPosts()
}, { immediate: true })

watch(() => authStore.token, () => {
  loadCrossDomainRecommendations()
}, { immediate: true, flush: 'sync' })

onUnmounted(() => {
  latestPostsRequestGeneration += 1
  crossDomainRequestGeneration += 1
})

const SectionHeader = defineComponent({
  props: {
    title: { type: String, required: true },
    module: { type: Object as () => DiscoveryModuleState | undefined, required: false },
  },
  setup(props) {
    return () => h('header', { class: 'section-header' }, [
      h('div', [
        h('p', { class: 'eyebrow' }, '社区发现'),
        h('h2', props.title),
      ]),
      props.module
        ? h('span', { class: ['module-status', props.module.degraded ? 'module-status-degraded' : ''] }, props.module.degraded ? '暂不可用' : `${props.module.itemCount} 项`)
        : null,
    ])
  },
})

const ModuleEmpty = defineComponent({
  props: {
    module: { type: Object as () => DiscoveryModuleState | undefined, required: false },
  },
  setup(props) {
    return () => h('div', { class: 'module-empty' }, [
      h(Inbox, { class: 'h-5 w-5', 'aria-hidden': 'true' }),
      h('span', props.module?.fallbackReason ? '这个模块暂时没有可展示内容。' : '暂无可展示内容。'),
    ])
  },
})

const SkeletonCard = defineComponent({
  setup() {
    return () => h('div', { class: 'skeleton-card', 'aria-hidden': 'true' }, [
      h('span'),
      h('strong'),
      h('p'),
    ])
  },
})
</script>

<style scoped>
.explore-page {
  min-height: 100vh;
  background: #f7faf9;
  color: #111827;
}

.explore-band {
  width: 100%;
  padding: 28px 20px;
}

.explore-band-hero {
  padding-top: 44px;
  background: linear-gradient(135deg, #0f172a 0%, #164e63 48%, #365314 100%);
  color: white;
}

.explore-band-muted {
  background: #eef7f3;
}

.explore-shell {
  width: min(1120px, 100%);
  margin: 0 auto;
}

.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(260px, 0.6fr);
  gap: 24px;
  align-items: end;
}

.hero-copy h1 {
  margin: 0;
  font-size: 42px;
  line-height: 1.12;
  letter-spacing: 0;
}

.hero-summary {
  margin: 14px 0 22px;
  max-width: 620px;
  color: #dbeafe;
  font-size: 16px;
  line-height: 1.7;
}

.eyebrow {
  margin: 0 0 8px;
  color: #0891b2;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.explore-band-hero .eyebrow {
  color: #a7f3d0;
}

.hero-search {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) 44px;
  align-items: center;
  width: min(620px, 100%);
  min-height: 52px;
  gap: 10px;
  padding: 6px 6px 6px 16px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.96);
  color: #334155;
}

.hero-search input {
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #111827;
  font-size: 15px;
}

.hero-search button,
.state-banner button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 0;
  border-radius: 8px;
  background: #0f766e;
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.hero-search button {
  width: 40px;
  height: 40px;
}

.status-panel {
  display: grid;
  gap: 10px;
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.42);
}

.status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 32px;
  color: #dbeafe;
}

.status-row strong {
  font-size: 24px;
  color: white;
}

.status-note {
  margin: 6px 0 0;
  color: #ccfbf1;
  line-height: 1.6;
}

.state-banner,
.empty-panel,
.module-empty {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: white;
  padding: 14px 16px;
  color: #475569;
}

.state-banner-error {
  border-color: #fecaca;
  color: #991b1b;
}

.state-banner button {
  min-height: 36px;
  padding: 0 12px;
  margin-left: auto;
}

.empty-panel {
  flex-direction: column;
  align-items: flex-start;
  padding: 24px;
}

.empty-panel h2 {
  margin: 0;
  font-size: 22px;
}

.empty-panel p {
  margin: 0;
}

.primary-link,
.card-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #0f766e;
  font-weight: 800;
  text-decoration: none;
}

.section-layout {
  display: grid;
  gap: 16px;
}

.section-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
}

.section-header h2 {
  margin: 0;
  font-size: 26px;
  line-height: 1.2;
  letter-spacing: 0;
}

.module-status {
  flex: 0 0 auto;
  border-radius: 999px;
  background: #dcfce7;
  color: #166534;
  padding: 6px 10px;
  font-size: 13px;
  font-weight: 800;
}

.module-status-degraded {
  background: #fef3c7;
  color: #92400e;
}

.topic-grid,
.channel-grid,
.channel-featured-direction-grid,
.content-form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.feature-card,
.channel-card,
.channel-featured-direction,
.search-entry {
  border: 1px solid #dbe3ea;
  border-radius: 8px;
  background: white;
  color: inherit;
  text-decoration: none;
  transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
}

.feature-card {
  display: grid;
  align-content: space-between;
  min-height: 210px;
  padding: 18px;
}

.feature-card:hover,
.channel-card:hover,
.channel-featured-direction:hover,
.search-entry:hover {
  transform: translateY(-2px);
  border-color: #0f766e;
  box-shadow: 0 18px 40px -30px rgba(15, 23, 42, 0.45);
}

.card-kicker {
  color: #0f766e;
  font-size: 12px;
  font-weight: 800;
}

.feature-card h2 {
  margin: 10px 0;
  font-size: 20px;
  line-height: 1.35;
  letter-spacing: 0;
  overflow-wrap: anywhere;
}

.feature-card p,
.channel-card p {
  margin: 0;
  color: #64748b;
  line-height: 1.65;
  overflow-wrap: anywhere;
}

.channel-card {
  display: grid;
  gap: 8px;
  min-height: 156px;
  padding: 16px;
}

.channel-featured-direction {
  display: grid;
  gap: 8px;
  min-height: 136px;
  padding: 16px;
}

.channel-featured-direction strong {
  color: #111827;
  font-size: 16px;
}

.channel-featured-direction small {
  color: #92400e;
  line-height: 1.6;
}

.channel-icon {
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: #e0f2fe;
  color: #075985;
  font-weight: 900;
}

.two-column-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 0.72fr);
  gap: 22px;
}

.compact-list,
.search-entry-grid {
  display: grid;
  gap: 10px;
}

.compact-row {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  border-bottom: 1px solid #e2e8f0;
  color: #1f2937;
  text-decoration: none;
}

.compact-row span {
  overflow-wrap: anywhere;
  font-weight: 700;
}

.compact-row small {
  color: #64748b;
}

.latest-post-cover {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  object-fit: cover;
  background: #e2e8f0;
}

.search-entry {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 0 14px;
  font-weight: 800;
}

.skeleton-card {
  min-height: 210px;
  border-radius: 8px;
  background: linear-gradient(90deg, #f1f5f9, #e2e8f0, #f1f5f9);
}

.skeleton-card span,
.skeleton-card strong,
.skeleton-card p {
  display: block;
}

@media (max-width: 900px) {
  .hero-grid,
  .two-column-layout {
    grid-template-columns: 1fr;
  }

  .topic-grid,
  .channel-grid,
  .channel-featured-direction-grid,
  .content-form-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .explore-band {
    padding: 22px 14px;
  }

  .hero-copy h1 {
    font-size: 32px;
  }

  .topic-grid,
  .channel-grid,
  .channel-featured-direction-grid,
  .content-form-grid {
    grid-template-columns: 1fr;
  }

  .section-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .compact-row {
    grid-template-columns: 20px minmax(0, 1fr);
  }

  .compact-row small {
    grid-column: 2;
  }
}

/* Community browse layout: content leads, modules stay lightweight. */
.explore-page {
  min-height: calc(100vh - 64px);
  background: transparent;
  color: rgb(31 41 55);
}

.explore-band {
  padding: 0 1.25rem;
}

.explore-band-hero {
  padding-top: 0;
  background: transparent;
  color: inherit;
  border-bottom: 1px solid rgb(229 231 235);
}

.explore-band-muted {
  background: transparent;
}

.explore-shell {
  width: min(1180px, 100%);
}

.explore-band > .explore-shell,
.explore-band > article.explore-shell {
  padding: 2rem 0;
}

.explore-band-hero .explore-shell {
  padding: 1.4rem 0 1.2rem;
}

.hero-grid {
  display: block;
}

.status-panel {
  display: none;
}

.hero-copy {
  max-width: 760px;
}

.explore-toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  color: rgb(107 114 128);
  font-size: 0.75rem;
  font-weight: 800;
}

.explore-back-button {
  display: inline-flex;
  min-height: 2rem;
  align-items: center;
  gap: 0.35rem;
  padding: 0 0.55rem;
  border: 1px solid rgb(229 231 235);
  border-radius: 6px;
  background: white;
  color: rgb(55 65 81);
  font-size: 0.75rem;
  font-weight: 800;
}

.explore-back-button:hover {
  border-color: rgb(191 219 254);
  background: rgb(239 246 255);
  color: rgb(29 78 216);
}

.eyebrow,
.explore-band-hero .eyebrow {
  margin-bottom: 0.45rem;
  color: rgb(37 99 235);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: none;
}

.hero-copy h1 {
  color: rgb(23 23 23);
  font-size: 1.7rem;
  line-height: 1.3;
}

.hero-summary {
  max-width: 680px;
  margin: 0.55rem 0 1rem;
  color: rgb(75 85 99);
  font-size: 0.875rem;
  line-height: 1.75;
}

.hero-search {
  width: min(620px, 100%);
  min-height: 2.6rem;
  padding: 0.3rem 0.3rem 0.3rem 0.8rem;
  border-color: rgb(229 231 235);
  border-radius: 6px;
  background: white;
  color: rgb(107 114 128);
}

.hero-search:focus-within {
  border-color: rgb(147 197 253);
}

.hero-search input {
  color: rgb(31 41 55);
  font-size: 0.8125rem;
}

.hero-search button {
  width: 2rem;
  height: 2rem;
  border-radius: 5px;
  background: rgb(37 99 235);
}

.explore-channel-strip {
  overflow: hidden;
  border-bottom: 1px solid rgb(229 231 235);
  background: white;
}

.explore-channel-strip .explore-shell {
  padding: 0;
}

.explore-channel-strip__inner {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 3.35rem;
  overflow-x: auto;
  scrollbar-width: none;
}

.explore-channel-strip__inner::-webkit-scrollbar {
  display: none;
}

.explore-channel-strip__item {
  display: inline-flex;
  min-height: 2rem;
  flex: 0 0 auto;
  align-items: center;
  padding: 0 0.65rem;
  border-radius: 5px;
  color: rgb(75 85 99);
  font-size: 0.8125rem;
  font-weight: 700;
  white-space: nowrap;
}

.explore-channel-strip__item:hover,
.explore-channel-strip__item--active {
  background: rgb(239 246 255);
  color: rgb(29 78 216);
}

.section-layout {
  gap: 1rem;
}

.section-header {
  align-items: center;
  padding-bottom: 0.85rem;
  border-bottom: 1px solid rgb(229 231 235);
}

.section-header h2 {
  color: rgb(23 23 23);
  font-size: 1.125rem;
  line-height: 1.35;
}

.section-copy {
  max-width: 680px;
  margin: 0.35rem 0 0;
  color: rgb(107 114 128);
  font-size: 0.8125rem;
  line-height: 1.7;
}

.module-status {
  padding: 0.3rem 0.55rem;
  border-radius: 5px;
  background: rgb(243 244 246);
  color: rgb(75 85 99);
  font-size: 0.7rem;
}

.module-status-degraded {
  background: rgb(255 247 237);
  color: rgb(154 52 18);
}

.topic-grid,
.channel-grid,
.channel-featured-direction-grid,
.content-form-grid {
  gap: 0;
  border-top: 1px solid rgb(229 231 235);
}

.feature-card,
.channel-card,
.channel-featured-direction {
  min-height: 0;
  padding: 1rem;
  border: 0;
  border-right: 1px solid rgb(229 231 235);
  border-bottom: 1px solid rgb(229 231 235);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.feature-card:hover,
.channel-card:hover,
.channel-featured-direction:hover {
  transform: none;
  border-color: rgb(191 219 254);
  background: rgb(248 250 252);
  box-shadow: none;
}

.feature-card h2 {
  margin: 0.55rem 0 0.45rem;
  color: rgb(31 41 55);
  font-size: 0.95rem;
  line-height: 1.45;
}

.feature-card p,
.channel-card p {
  color: rgb(107 114 128);
  font-size: 0.8125rem;
  line-height: 1.65;
}

.feature-card .card-link,
.channel-card .card-link {
  margin-top: 0.9rem;
  color: rgb(37 99 235);
  font-size: 0.75rem;
}

.channel-card {
  gap: 0.45rem;
}

.channel-card strong,
.channel-featured-direction strong {
  color: rgb(31 41 55);
  font-size: 0.875rem;
}

.channel-icon {
  width: 1.85rem;
  height: 1.85rem;
  border-radius: 5px;
  background: rgb(239 246 255);
  color: rgb(29 78 216);
}

.channel-featured-direction {
  gap: 0.4rem;
}

.channel-featured-direction p,
.channel-featured-direction small {
  margin: 0;
  color: rgb(107 114 128);
  font-size: 0.75rem;
  line-height: 1.6;
}

.compact-list {
  gap: 0;
  border-top: 1px solid rgb(229 231 235);
}

.compact-row {
  min-height: 3.25rem;
  padding: 0.6rem 0.3rem;
  border-bottom-color: rgb(229 231 235);
  color: rgb(55 65 81);
}

.compact-row:hover {
  background: rgb(249 250 251);
}

.compact-row span {
  font-size: 0.8125rem;
}

.compact-row small {
  color: rgb(107 114 128);
  font-size: 0.7rem;
}

.search-entry-grid {
  gap: 0;
  border-top: 1px solid rgb(229 231 235);
}

.search-entry {
  min-height: 3rem;
  border: 0;
  border-bottom: 1px solid rgb(229 231 235);
  border-radius: 0;
  background: transparent;
  color: rgb(55 65 81);
  font-size: 0.8125rem;
}

.search-entry:hover {
  transform: none;
  border-color: rgb(191 219 254);
  background: rgb(248 250 252);
  box-shadow: none;
}

.state-banner,
.empty-panel,
.module-empty {
  border-color: rgb(229 231 235);
  border-radius: 6px;
  box-shadow: none;
}

.empty-panel {
  background: white;
}

.skeleton-card {
  min-height: 8.5rem;
  border-radius: 0;
  background: rgb(243 244 246);
}

.dark .explore-band-hero,
.dark .explore-channel-strip {
  border-color: rgb(63 63 70);
  background: rgb(24 26 32);
}

.dark .explore-page,
.dark .hero-copy h1,
.dark .section-header h2,
.dark .feature-card h2,
.dark .channel-card strong,
.dark .channel-featured-direction strong {
  color: rgb(241 245 249);
}

.dark .hero-summary,
.dark .section-copy,
.dark .feature-card p,
.dark .channel-card p,
.dark .compact-row,
.dark .compact-row small,
.dark .channel-featured-direction p,
.dark .channel-featured-direction small,
.dark .search-entry {
  color: rgb(148 163 184);
}

.dark .hero-search,
.dark .explore-back-button,
.dark .state-banner,
.dark .empty-panel,
.dark .module-empty {
  border-color: rgb(63 63 70);
  background: rgb(24 26 32);
  color: rgb(203 213 225);
}

.dark .hero-search input {
  color: rgb(241 245 249);
}

.dark .explore-channel-strip__item,
.dark .search-entry {
  color: rgb(203 213 225);
}

.dark .explore-channel-strip__item:hover,
.dark .explore-channel-strip__item--active {
  background: rgb(30 58 138 / 0.35);
  color: rgb(147 197 253);
}

.dark .section-header,
.dark .topic-grid,
.dark .channel-grid,
.dark .channel-featured-direction-grid,
.dark .content-form-grid,
.dark .compact-list,
.dark .search-entry-grid,
.dark .feature-card,
.dark .channel-card,
.dark .channel-featured-direction,
.dark .compact-row,
.dark .search-entry {
  border-color: rgb(63 63 70);
}

.dark .feature-card:hover,
.dark .channel-card:hover,
.dark .channel-featured-direction:hover,
.dark .compact-row:hover,
.dark .search-entry:hover {
  background: rgb(39 39 42);
}

.dark .channel-icon {
  background: rgb(30 58 138 / 0.35);
  color: rgb(147 197 253);
}

.dark .module-status {
  background: rgb(39 39 42);
  color: rgb(203 213 225);
}

@media (max-width: 640px) {
  .explore-band {
    padding: 0 1rem;
  }

  .explore-band > .explore-shell,
  .explore-band > article.explore-shell {
    padding: 1.4rem 0;
  }

  .explore-band-hero .explore-shell {
    padding: 1rem 0;
  }

  .hero-copy h1 {
    font-size: 1.35rem;
  }

  .hero-summary {
    font-size: 0.8125rem;
  }

  .section-header {
    gap: 0.55rem;
  }

  .topic-grid,
  .channel-grid,
  .channel-featured-direction-grid,
  .content-form-grid {
    grid-template-columns: 1fr;
  }

  .feature-card,
  .channel-card,
  .channel-featured-direction {
    border-right: 0;
  }
}

/* Discovery uses a browse surface, not a catalogue of equally weighted cards. */
.explore-page {
  min-height: calc(100vh - 68px);
  background: transparent;
}

.explore-band-hero {
  border-bottom: 1px solid var(--border-subtle);
  background: transparent;
  color: var(--text-primary);
}

.explore-band-hero .explore-shell {
  padding: 1.35rem 0 1.15rem;
}

.hero-copy {
  max-width: 760px;
}

.explore-toolbar {
  margin-bottom: 0.85rem;
}

.explore-back-button {
  border-color: var(--border-subtle);
  border-radius: var(--radius-control);
  color: var(--text-primary);
}

.explore-back-button:hover {
  border-color: rgb(147 197 253);
  background: var(--primary-50);
  color: var(--primary-600);
}

.eyebrow,
.explore-band-hero .eyebrow {
  margin-bottom: 0.35rem;
  color: var(--primary-600);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: none;
}

.hero-copy h1 {
  color: var(--text-strong);
  font-size: 1.55rem;
  font-weight: 800;
  line-height: 1.35;
  text-wrap: balance;
}

.hero-summary {
  max-width: 42rem;
  margin: 0.45rem 0 0.95rem;
  color: var(--text-muted);
  font-size: 0.8125rem;
  line-height: 1.7;
}

.hero-search {
  min-height: 2.55rem;
  border-color: var(--border-subtle);
  border-radius: var(--radius-control);
  background: var(--surface);
}

.hero-search:focus-within {
  border-color: rgb(147 197 253);
  box-shadow: 0 0 0 3px rgb(219 234 254 / 0.82);
}

.hero-search input {
  color: var(--text-primary);
  font-size: 0.8125rem;
}

.hero-search button {
  border-radius: 5px;
  background: var(--primary-600);
}

.hero-search button:hover {
  background: var(--primary-700);
}

.explore-channel-strip {
  display: none;
}

.explore-browse-band {
  padding: 0 1.25rem;
}

.explore-browse-layout {
  display: grid;
  grid-template-columns: 196px minmax(0, 680px) 250px;
  gap: 2rem;
  align-items: start;
  padding: 1.85rem 0 3rem;
}

.explore-browse-aside,
.explore-browse-content,
.explore-browse-rail {
  min-width: 0;
}

.explore-side-nav {
  position: sticky;
  top: 5.85rem;
  display: grid;
  gap: 0.15rem;
}

.explore-side-nav__heading,
.explore-rail-section__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.explore-side-nav__heading {
  margin-bottom: 0.35rem;
  padding: 0 0.55rem;
  color: var(--text-muted);
  font-size: 0.7rem;
  font-weight: 800;
}

.explore-side-nav__heading a {
  color: var(--primary-600);
  font-size: 0.6875rem;
}

.explore-side-nav__item {
  display: flex;
  min-height: 2.45rem;
  align-items: center;
  gap: 0.6rem;
  padding: 0 0.55rem;
  border-radius: var(--radius-control);
  color: var(--text-primary);
  font-size: 0.8125rem;
  font-weight: 650;
  transition: background-color 0.18s ease, color 0.18s ease;
}

.explore-side-nav__item > span {
  display: grid;
  width: 1.6rem;
  height: 1.6rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 6px;
  background: var(--surface-3);
  color: var(--text-muted);
  font-size: 0.7rem;
  font-weight: 800;
}

.explore-side-nav__item:hover,
.explore-side-nav__item--active {
  background: var(--primary-50);
  color: var(--primary-600);
}

.explore-side-nav__item--active > span {
  background: var(--primary-100);
  color: var(--primary-600);
}

.explore-side-nav__divider {
  margin: 0.55rem 0 0.45rem;
  border-top: 1px solid var(--border-subtle);
}

.explore-side-nav__label {
  margin: 0 0 0.2rem;
  padding: 0 0.55rem;
  color: var(--text-muted);
  font-size: 0.7rem;
  font-weight: 800;
}

.explore-side-nav__item--form {
  min-height: 2.2rem;
  font-size: 0.75rem;
}

.explore-side-nav__item--form > span {
  width: 1.4rem;
  height: 1.4rem;
  border-radius: 5px;
  font-size: 0.625rem;
}

.explore-browse-content {
  display: grid;
  gap: 1.65rem;
}

.explore-content-section {
  display: grid;
  gap: 0.9rem;
  padding-top: 0.05rem;
}

.explore-content-section + .explore-content-section {
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-subtle);
}

.section-header {
  align-items: flex-start;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-subtle);
}

.section-header h2 {
  color: var(--text-strong);
  font-size: 1.1rem;
  font-weight: 800;
  line-height: 1.4;
  text-wrap: balance;
}

.section-copy {
  max-width: 38rem;
  margin-top: 0.3rem;
  color: var(--text-muted);
  font-size: 0.75rem;
  line-height: 1.65;
}

.module-status {
  border-radius: 5px;
  background: var(--surface-3);
  color: var(--text-muted);
  font-size: 0.6875rem;
  font-weight: 750;
}

.module-status-degraded {
  background: #fff4e5;
  color: #b54708;
}

.explore-feature-grid,
.explore-direction-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.explore-feature-card,
.channel-featured-direction {
  display: grid;
  min-height: 10.5rem;
  align-content: start;
  gap: 0.45rem;
  padding: 1rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
  color: var(--text-primary);
  transition: border-color 0.18s ease, background-color 0.18s ease, transform 0.18s ease;
}

.explore-feature-card:first-child:nth-last-child(odd) {
  grid-column: span 2;
}

.explore-feature-card:hover,
.channel-featured-direction:hover {
  border-color: rgb(147 197 253);
  background: var(--primary-50);
  transform: translateY(-1px);
}

.card-kicker {
  color: var(--primary-600);
  font-size: 0.6875rem;
  font-weight: 800;
}

.explore-feature-card h2 {
  margin: 0.1rem 0;
  color: var(--text-strong);
  font-size: 0.925rem;
  font-weight: 780;
  line-height: 1.5;
}

.explore-feature-card p,
.channel-featured-direction p {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.75rem;
  line-height: 1.65;
}

.explore-feature-card .card-link {
  margin-top: auto;
  color: var(--primary-600);
  font-size: 0.7rem;
}

.explore-feature-grid--cross .explore-feature-card {
  min-height: 9.5rem;
}

.explore-entry-list,
.explore-author-list {
  border-top: 1px solid var(--border-subtle);
}

.explore-entry-row {
  display: grid;
  grid-template-columns: 2.45rem minmax(0, 1fr) auto;
  gap: 0.7rem;
  align-items: center;
  min-height: 4.1rem;
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text-primary);
  transition: background-color 0.18s ease;
}

.explore-entry-row:hover {
  background: var(--surface-2);
}

.explore-entry-row > img,
.explore-entry-row > svg:first-child {
  width: 2.1rem;
  height: 2.1rem;
  margin-left: 0.35rem;
  border-radius: 6px;
  object-fit: cover;
  color: var(--primary-600);
}

.explore-entry-row > span {
  display: grid;
  gap: 0.15rem;
  min-width: 0;
}

.explore-entry-row strong,
.explore-entry-row small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.explore-entry-row strong {
  color: var(--text-primary);
  font-size: 0.8125rem;
  font-weight: 720;
}

.explore-entry-row small {
  color: var(--text-muted);
  font-size: 0.6875rem;
}

.explore-entry-row > svg:last-child {
  margin-right: 0.35rem;
  color: var(--text-muted);
}

.explore-direction-grid {
  margin-top: 0.25rem;
}

.channel-featured-direction {
  min-height: 8.4rem;
}

.channel-featured-direction strong {
  color: var(--text-strong);
  font-size: 0.8125rem;
  line-height: 1.5;
}

.channel-featured-direction small {
  color: #b54708;
  font-size: 0.6875rem;
  line-height: 1.55;
}

.explore-author-list {
  margin-top: 0.3rem;
}

.explore-author-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 3.35rem;
  border-bottom: 1px solid var(--border-subtle);
}

.explore-author-row > a {
  display: grid;
  gap: 0.15rem;
}

.explore-author-row strong {
  overflow: hidden;
  color: var(--text-primary);
  font-size: 0.8rem;
  font-weight: 720;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.explore-author-row small {
  overflow: hidden;
  color: var(--text-muted);
  font-size: 0.6875rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.explore-author-row button {
  min-height: 1.85rem;
  flex: 0 0 auto;
  padding: 0 0.5rem;
  border: 1px solid var(--primary-100);
  border-radius: 5px;
  background: var(--primary-50);
  color: var(--primary-600);
  font-size: 0.7rem;
  font-weight: 750;
}

.explore-author-row button:disabled {
  opacity: 0.6;
}

.explore-browse-rail {
  position: sticky;
  top: 5.85rem;
  display: grid;
  align-content: start;
}

.explore-rail-section {
  padding: 0 0 1rem;
  border-bottom: 1px solid var(--border-subtle);
}

.explore-rail-section + .explore-rail-section {
  padding-top: 1rem;
}

.explore-rail-section__title h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 0.875rem;
  font-weight: 800;
}

.explore-rail-section__title svg {
  color: var(--text-muted);
}

.explore-rail-list {
  display: grid;
  margin-top: 0.55rem;
}

.explore-rail-list > a {
  display: grid;
  gap: 0.15rem;
  padding: 0.55rem 0;
  border-bottom: 1px solid var(--surface-3);
}

.explore-rail-list > a:last-child {
  border-bottom: 0;
}

.explore-rail-list span {
  color: var(--text-primary);
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.45;
}

.explore-rail-list small {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: var(--text-muted);
  font-size: 0.6875rem;
  line-height: 1.55;
}

.explore-rail-list > a:hover span {
  color: var(--primary-600);
}

.explore-rail-section--signin {
  display: grid;
  gap: 0.6rem;
  padding-bottom: 0;
  border-bottom: 0;
}

.explore-rail-section--signin p {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.75rem;
  line-height: 1.65;
}

.explore-rail-section--signin a {
  color: var(--primary-600);
  font-size: 0.75rem;
  font-weight: 750;
}

.explore-browse-content .state-banner,
.explore-browse-content .empty-panel,
.explore-browse-content .module-empty,
.explore-rail-section .module-empty {
  border-color: var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
  box-shadow: none;
}

.explore-browse-content .empty-panel {
  min-height: 14rem;
}

.explore-browse-content .skeleton-card {
  min-height: 10.5rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface-3);
}

.dark .explore-band-hero,
.dark .explore-page {
  background: transparent;
}

.dark .explore-band-hero,
.dark .explore-side-nav__divider,
.dark .explore-content-section + .explore-content-section,
.dark .section-header,
.dark .explore-entry-list,
.dark .explore-entry-row,
.dark .explore-author-list,
.dark .explore-author-row,
.dark .explore-rail-section,
.dark .explore-rail-list > a {
  border-color: rgb(63 63 70);
}

.dark .explore-back-button,
.dark .hero-search,
.dark .explore-feature-card,
.dark .channel-featured-direction,
.dark .explore-browse-content .state-banner,
.dark .explore-browse-content .empty-panel,
.dark .explore-browse-content .module-empty,
.dark .explore-rail-section .module-empty {
  border-color: rgb(63 63 70);
  background: rgb(24 26 32);
}

.dark .hero-search:focus-within {
  box-shadow: 0 0 0 3px rgb(30 58 138 / 0.48);
}

.dark .hero-copy h1,
.dark .section-header h2,
.dark .explore-feature-card h2,
.dark .channel-featured-direction strong,
.dark .explore-entry-row strong,
.dark .explore-author-row strong,
.dark .explore-rail-section__title h2,
.dark .explore-rail-list span {
  color: rgb(241 245 249);
}

.dark .hero-summary,
.dark .section-copy,
.dark .explore-feature-card p,
.dark .channel-featured-direction p,
.dark .explore-entry-row small,
.dark .explore-author-row small,
.dark .explore-rail-list small,
.dark .explore-rail-section--signin p {
  color: rgb(148 163 184);
}

.dark .explore-side-nav__item,
.dark .explore-side-nav__item > span {
  color: rgb(203 213 225);
}

.dark .explore-side-nav__item > span,
.dark .module-status {
  background: rgb(39 39 42);
}

.dark .explore-side-nav__item:hover,
.dark .explore-side-nav__item--active,
.dark .explore-feature-card:hover,
.dark .channel-featured-direction:hover {
  background: rgb(30 58 138 / 0.36);
  color: rgb(147 197 253);
}

.dark .explore-side-nav__item--active > span {
  background: rgb(30 58 138 / 0.5);
  color: rgb(147 197 253);
}

.dark .explore-entry-row:hover {
  background: rgb(39 39 42);
}

.dark .explore-rail-list > a {
  border-color: rgb(39 39 42);
}

@media (max-width: 1023px) {
  .explore-channel-strip {
    display: block;
  }

  .explore-channel-strip__inner {
    padding: 0 0.25rem;
  }

  .explore-browse-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 1.75rem;
    padding-top: 1.35rem;
  }

  .explore-browse-content {
    width: min(720px, 100%);
    margin: 0 auto;
  }

  .explore-browse-rail {
    position: static;
    display: grid;
    width: min(720px, 100%);
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.25rem;
    margin: 0 auto;
  }

  .explore-rail-section {
    padding: 0;
    border-top: 1px solid var(--border-subtle);
    border-bottom: 0;
  }

  .explore-rail-section + .explore-rail-section {
    padding-top: 0;
  }

  .explore-rail-section--signin {
    grid-column: 1 / -1;
  }
}

@media (max-width: 640px) {
  .explore-browse-band {
    padding: 0 1rem;
  }

  .explore-band-hero .explore-shell {
    padding: 1rem 0;
  }

  .hero-copy h1 {
    font-size: 1.3rem;
  }

  .hero-summary {
    font-size: 0.75rem;
  }

  .explore-channel-strip__inner {
    min-height: 3.15rem;
  }

  .explore-browse-layout {
    gap: 1.35rem;
    padding: 1.1rem 0 1.75rem;
  }

  .explore-feature-grid,
  .explore-direction-grid,
  .explore-browse-rail {
    grid-template-columns: 1fr;
  }

  .explore-feature-card:first-child:nth-last-child(odd) {
    grid-column: auto;
  }

  .explore-feature-card {
    min-height: 9.25rem;
  }

  .explore-browse-rail {
    gap: 1rem;
  }

  .explore-rail-section {
    padding-top: 0.9rem;
  }

  .explore-entry-row {
    grid-template-columns: 2.2rem minmax(0, 1fr) auto;
  }
}

/* Explore redesign: discovery content leads, filters and system state stay secondary. */
.explore-page {
  min-height: calc(100vh - var(--community-header-height));
  padding-bottom: 2.5rem;
  background: var(--surface-2);
}

.explore-shell {
  width: min(1180px, calc(100% - 2.5rem));
}

.explore-band-hero {
  border-bottom: 0;
}

.explore-band-hero .explore-shell {
  padding: 1.1rem 0 1.4rem;
}

.explore-toolbar {
  margin-bottom: 1rem;
}

.explore-toolbar > span {
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 700;
}

.explore-back-button {
  min-height: 2rem;
  padding: 0 0.65rem;
  background: var(--surface);
  font-size: 0.75rem;
}

.explore-hero-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 18.5rem;
  gap: 3rem;
  align-items: end;
}

.hero-copy {
  max-width: 47rem;
}

.hero-copy h1 {
  max-width: 16ch;
  font-size: 2rem;
  line-height: 1.25;
  letter-spacing: 0;
}

.hero-summary {
  max-width: 40rem;
  margin: 0.55rem 0 1rem;
  font-size: 0.875rem;
}

.hero-search {
  width: min(36rem, 100%);
  min-height: 2.85rem;
}

.hero-search button {
  width: 2.35rem;
  height: 2.1rem;
}

.explore-hero-guide {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 1px solid var(--border-subtle);
  border-bottom: 1px solid var(--border-subtle);
}

.explore-hero-guide > div {
  display: grid;
  gap: 0.15rem;
  padding: 0.8rem 0.75rem;
  border-right: 1px solid var(--border-subtle);
}

.explore-hero-guide > div:last-of-type {
  border-right: 0;
}

.explore-hero-guide span {
  color: var(--text-muted);
  font-size: 0.6875rem;
}

.explore-hero-guide strong {
  color: var(--text-strong);
  font-size: 1rem;
  font-weight: 800;
}

.explore-hero-guide p {
  grid-column: 1 / -1;
  margin: 0;
  padding: 0.65rem 0.75rem;
  border-top: 1px solid var(--border-subtle);
  color: var(--text-muted);
  font-size: 0.6875rem;
  line-height: 1.55;
}

.explore-channel-plaza {
  width: 100%;
  margin: 0 !important;
  border-right: 0;
  border-left: 0;
  border-radius: 0;
  background: var(--surface);
}

.explore-plaza-shell {
  padding: 1.5rem 0 1.35rem;
}

.explore-section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.explore-section-heading h2 {
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.4;
}

.explore-section-heading p:not(.eyebrow) {
  margin: 0.25rem 0 0;
  color: var(--text-muted);
  font-size: 0.75rem;
}

.explore-domain-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.75rem;
}

.explore-domain-card {
  display: grid;
  grid-template-columns: 2.25rem minmax(0, 1fr);
  gap: 0.65rem;
  min-width: 0;
  min-height: 9.5rem;
  align-content: start;
  padding: 0.9rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
  color: var(--text-primary);
  transition: border-color 0.18s ease, background-color 0.18s ease, transform 0.18s ease;
}

.explore-domain-card:hover,
.explore-domain-card--active {
  border-color: rgb(147 197 253);
  background: var(--primary-50);
  transform: translateY(-1px);
}

.explore-domain-card > svg {
  grid-column: 2;
  align-self: end;
  justify-self: end;
  color: var(--primary-600);
}

.explore-domain-card__icon {
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  place-items: center;
  border-radius: var(--radius-control);
  background: var(--surface-3);
  font-size: 1rem;
}

.explore-domain-card--active .explore-domain-card__icon {
  background: var(--primary-100);
}

.explore-domain-card__body {
  display: grid;
  min-width: 0;
  align-content: start;
  gap: 0.3rem;
}

.explore-domain-card__body strong {
  color: var(--text-strong);
  font-size: 0.8125rem;
  line-height: 1.4;
}

.explore-domain-card__body small,
.explore-domain-card__body em {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  color: var(--text-muted);
  font-size: 0.6875rem;
  font-style: normal;
  line-height: 1.55;
}

.explore-domain-card__body small {
  -webkit-line-clamp: 3;
}

.explore-domain-card__body em {
  -webkit-line-clamp: 2;
  margin-top: 0.1rem;
  color: var(--primary-600);
}

.explore-form-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-subtle);
}

.explore-form-row__label {
  margin-right: 0.25rem;
  color: var(--text-muted);
  font-size: 0.7rem;
  font-weight: 800;
}

.explore-form-chip {
  display: inline-flex;
  min-height: 2rem;
  align-items: center;
  gap: 0.35rem;
  padding: 0 0.7rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-pill);
  background: var(--surface);
  color: var(--text-primary);
  font-size: 0.7rem;
  font-weight: 700;
}

.explore-form-chip:hover,
.explore-form-chip--active {
  border-color: rgb(147 197 253);
  background: var(--primary-50);
  color: var(--primary-600);
}

.explore-channel-strip {
  display: none !important;
}

.explore-browse-band {
  padding: 0 1.25rem;
}

.explore-browse-layout {
  grid-template-columns: 184px minmax(0, 1fr) 270px;
  gap: 1.75rem;
  padding: 1.65rem 0 0;
}

.explore-browse-content {
  gap: 1.75rem;
}

.explore-mobile-topics {
  display: none;
}

.explore-content-section {
  gap: 0.85rem;
  padding: 1rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
}

.explore-content-section + .explore-content-section {
  padding-top: 1rem;
  border-top: 1px solid var(--border-subtle);
}

.explore-content-section .section-header {
  padding-bottom: 0.7rem;
}

.explore-feature-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0;
  border-top: 1px solid var(--border-subtle);
  border-left: 1px solid var(--border-subtle);
}

.explore-feature-card {
  min-height: 9.5rem;
  border-top: 0;
  border-right: 1px solid var(--border-subtle);
  border-bottom: 1px solid var(--border-subtle);
  border-left: 0;
  border-radius: 0;
}

.explore-feature-card:first-child:nth-last-child(odd) {
  grid-column: span 2;
}

.explore-browse-rail {
  gap: 0;
}

.explore-rail-section {
  padding: 0 0 1.15rem;
}

.explore-rail-intro {
  margin: 0.35rem 0 0;
  color: var(--text-muted);
  font-size: 0.7rem;
  line-height: 1.55;
}

.explore-topic-list span {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.explore-topic-list span svg {
  flex: 0 0 auto;
  color: var(--primary-600);
}

.explore-collaboration__links {
  display: grid;
  margin-top: 0.55rem;
}

.explore-collaboration__links > a {
  display: flex;
  min-height: 3.6rem;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--surface-3);
}

.explore-collaboration__links > a:last-child {
  border-bottom: 0;
}

.explore-collaboration__links > a > span {
  display: grid;
  gap: 0.15rem;
}

.explore-collaboration__links strong {
  color: var(--text-primary);
  font-size: 0.75rem;
}

.explore-collaboration__links small {
  color: var(--text-muted);
  font-size: 0.6875rem;
  line-height: 1.5;
}

.explore-collaboration__links svg {
  flex: 0 0 auto;
  color: var(--text-muted);
}

.explore-collaboration__links > a:hover strong,
.explore-collaboration__links > a:hover svg {
  color: var(--primary-600);
}

.dark .explore-page {
  background: rgb(15 23 42);
}

.dark .explore-channel-plaza,
.dark .explore-domain-card,
.dark .explore-form-chip,
.dark .explore-content-section {
  border-color: rgb(51 65 85);
  background: rgb(24 26 32);
}

.dark .explore-domain-card:hover,
.dark .explore-domain-card--active,
.dark .explore-form-chip:hover,
.dark .explore-form-chip--active {
  background: rgb(30 58 138 / 0.36);
}

.dark .explore-domain-card__icon {
  background: rgb(39 39 42);
}

.dark .explore-domain-card__body strong,
.dark .explore-collaboration__links strong,
.dark .explore-hero-guide strong {
  color: rgb(241 245 249);
}

.dark .explore-hero-guide,
.dark .explore-hero-guide > div,
.dark .explore-hero-guide p,
.dark .explore-form-row,
.dark .explore-feature-grid,
.dark .explore-collaboration__links > a {
  border-color: rgb(51 65 85);
}

@media (max-width: 1100px) {
  .explore-domain-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .explore-browse-layout {
    grid-template-columns: minmax(0, 1fr) 250px;
  }

  .explore-browse-aside {
    display: none;
  }
}

@media (max-width: 820px) {
  .explore-hero-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 1rem;
  }

  .explore-hero-guide {
    width: min(32rem, 100%);
  }

  .explore-browse-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .explore-browse-rail {
    width: 100%;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .explore-collaboration {
    grid-column: 1 / -1;
  }
}

@media (max-width: 640px) {
  .explore-page {
    padding-bottom: calc(5.5rem + env(safe-area-inset-bottom));
  }

  .explore-shell {
    width: min(100% - 2rem, 1180px);
  }

  .explore-band-hero .explore-shell {
    padding: 0.8rem 0 1.15rem;
  }

  .explore-toolbar {
    margin-bottom: 0.75rem;
  }

  .hero-copy h1 {
    max-width: none;
    font-size: 1.5rem;
  }

  .hero-summary {
    margin-bottom: 0.85rem;
    font-size: 0.8125rem;
  }

  .hero-search {
    min-height: 2.65rem;
  }

  .explore-hero-guide {
    width: 100%;
  }

  .explore-hero-guide > div {
    padding: 0.65rem 0.55rem;
  }

  .explore-plaza-shell {
    padding: 1.15rem 0 1rem;
  }

  .explore-section-heading {
    margin-bottom: 0.8rem;
  }

  .explore-section-heading .module-status {
    display: none;
  }

  .explore-domain-grid {
    display: flex;
    gap: 0.65rem;
    margin-right: -1rem;
    padding-right: 1rem;
    overflow-x: auto;
    scroll-snap-type: x proximity;
    scrollbar-width: none;
  }

  .explore-domain-grid::-webkit-scrollbar {
    display: none;
  }

  .explore-domain-card {
    width: 15rem;
    min-width: 15rem;
    min-height: 8.75rem;
    scroll-snap-align: start;
  }

  .explore-form-row {
    flex-wrap: nowrap;
    margin-right: -1rem;
    padding-right: 1rem;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .explore-form-row::-webkit-scrollbar {
    display: none;
  }

  .explore-form-row__label,
  .explore-form-chip {
    flex: 0 0 auto;
  }

  .explore-browse-band {
    padding: 0 1rem;
  }

  .explore-browse-layout {
    gap: 1rem;
    padding-top: 1rem;
  }

  .explore-mobile-topics {
    display: block;
    padding: 0.85rem;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-surface);
    background: var(--surface);
  }

  .explore-browse-content {
    gap: 1rem;
  }

  .explore-content-section {
    padding: 0.85rem;
  }

  .explore-feature-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .explore-feature-card:first-child:nth-last-child(odd) {
    grid-column: auto;
  }

  .explore-feature-card {
    min-height: 8.5rem;
  }

  .explore-browse-rail {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .explore-rail-section {
    padding: 1rem 0;
    border-top: 1px solid var(--border-subtle);
  }

  .explore-rail-section:first-child {
    display: none;
  }

  .explore-collaboration {
    order: -1;
  }

  .explore-topic-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
    margin-top: 0.7rem;
  }

  .explore-topic-list > a {
    min-width: 0;
    padding: 0.7rem;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-control);
    background: var(--surface);
  }

  .explore-topic-list span,
  .explore-topic-list small {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .explore-topic-list span {
    white-space: nowrap;
  }

  .explore-topic-list small {
    display: block;
    white-space: nowrap;
  }

  .dark .explore-topic-list > a {
    border-color: rgb(51 65 85);
    background: rgb(24 26 32);
  }

  .dark .explore-mobile-topics {
    border-color: rgb(51 65 85);
    background: rgb(24 26 32);
  }
}

@media (prefers-reduced-motion: reduce) {
  .explore-domain-card,
  .explore-feature-card,
  .channel-featured-direction {
    transition: none;
  }
}

.explore-channel-strip .explore-shell {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 1rem;
}

.explore-channel-strip__label {
  display: grid;
  flex: 0 0 auto;
  gap: 0.1rem;
  padding-right: 1rem;
  border-right: 1px solid var(--border-subtle);
}

.explore-channel-strip__label strong {
  color: var(--text-strong);
  font-size: 0.8125rem;
}

.explore-channel-strip__label span {
  color: var(--text-muted);
  font-size: 0.6875rem;
  white-space: nowrap;
}

.explore-browse-layout {
  grid-template-columns: minmax(0, 1fr) 18rem;
}

.explore-browse-content {
  grid-column: 1;
}

.explore-browse-rail {
  grid-column: 2;
}

@media (max-width: 900px) {
  .explore-channel-strip .explore-shell {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.5rem;
  }

  .explore-channel-strip__label {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    padding-right: 0;
    border-right: 0;
  }

  .explore-browse-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .explore-browse-content,
  .explore-browse-rail {
    grid-column: 1;
  }
}
</style>
