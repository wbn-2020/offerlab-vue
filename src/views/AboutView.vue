<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />
    <main class="p-8">
    <div class="max-w-4xl mx-auto">
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12">
        <h1 class="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-6">关于 OfferLab 综合社区</h1>

        <div class="prose dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 class="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">项目介绍</h2>
            <p class="text-slate-700 dark:text-slate-300 leading-relaxed">
              OfferLab 是一个多领域实践社区，帮助用户围绕技术、职场、阅读、生活与投资理财发布、发现、讨论和搜索真实经验。
            </p>
            <p class="text-slate-700 dark:text-slate-300 leading-relaxed">
              我们希望它成为一个成长型社区。在这里，你可以：
            </p>
            <ul class="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
              <li>发布技术、职场、阅读、生活与投资理财等多领域实践内容</li>
              <li>浏览真实经验，快速找到可复用的思路与参考路径</li>
              <li>围绕专题、领域和作者持续讨论与交流</li>
              <li>收藏高质量内容，形成自己的长期成长资料库</li>
              <li>查看趋势看板，了解社区正在关注的话题方向</li>
            </ul>
          </section>

          <section>
            <h2 class="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">核心特性</h2>
            <div class="grid grid-cols-2 gap-4">
              <div class="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <h3 class="font-bold text-slate-900 dark:text-slate-100 mb-2">经验发布</h3>
                <p class="text-sm text-slate-600 dark:text-slate-400">
                  支持技术文章、项目复盘、踩坑记录、问答求助和资源分享
                </p>
              </div>
              <div class="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <h3 class="font-bold text-slate-900 dark:text-slate-100 mb-2">趋势看板</h3>
                <p class="text-sm text-slate-600 dark:text-slate-400">
                  数据化展示热门技术栈、专题标签、活跃作者和内容趋势
                </p>
              </div>
              <div class="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <h3 class="font-bold text-slate-900 dark:text-slate-100 mb-2">社区互动</h3>
                <p class="text-sm text-slate-600 dark:text-slate-400">
                  点赞、收藏、评论、关注，与志同道合的开发者交流
                </p>
              </div>
              <div class="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <h3 class="font-bold text-slate-900 dark:text-slate-100 mb-2">知识沉淀</h3>
                <p class="text-sm text-slate-600 dark:text-slate-400">
                  通过摘要、标签、FAQ 和知识卡，把长内容转成可检索资产
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 class="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">技术栈</h2>
            <p class="text-slate-700 dark:text-slate-300 leading-relaxed">
              前端：Vue 3 + TypeScript + Vite + TailwindCSS
            </p>
            <p class="text-slate-700 dark:text-slate-300 leading-relaxed">
              后端：Spring Boot + MySQL + Redis + Elasticsearch
            </p>
            <p class="text-slate-700 dark:text-slate-300 leading-relaxed">
              实时通信：WebSocket + Netty
            </p>
          </section>

          <section>
            <h2 class="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">联系方式</h2>
            <p class="text-slate-700 dark:text-slate-300 leading-relaxed">
              如有建议或反馈，欢迎通过以下方式联系我们：
            </p>
            <ul class="space-y-2 text-slate-700 dark:text-slate-300">
              <li>邮箱：contact@interviewcircle.com</li>
              <li>GitHub：github.com/interviewcircle</li>
              <li>微博：@OfferLab</li>
            </ul>
          </section>

          <section>
            <h2 class="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">免责声明</h2>
            <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              本网站所有内容均由用户上传，我们不对内容的真实性、准确性、合法性负责。
              用户在使用本网站时应遵守相关法律法规，不得发布违法、违规、侵权的内容。
            </p>
          </section>
        </div>

        <div class="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 text-center">
          <p class="text-sm text-slate-500 dark:text-slate-400">
            OfferLab 综合社区 © 2026 | 个人项目 |
            <router-link to="/" class="text-primary-600 hover:text-primary-700">
              返回首页
            </router-link>
          </p>
        </div>
      </div>
    </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
</script>
