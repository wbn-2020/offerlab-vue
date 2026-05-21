<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 p-8">
    <div class="max-w-4xl mx-auto">
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12">
        <h1 class="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-6">关于面试圈</h1>

        <div class="prose dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 class="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">项目介绍</h2>
            <p class="text-slate-700 dark:text-slate-300 leading-relaxed">
              面试圈是一个求职垂直社区，致力于帮助求职者分享面试经验、学习技术知识、了解行业动态。
            </p>
            <p class="text-slate-700 dark:text-slate-300 leading-relaxed">
              在这里，你可以：
            </p>
            <ul class="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
              <li>分享你的面试经验和心得</li>
              <li>浏览其他求职者的面经，了解各公司的面试风格</li>
              <li>发布技术博客和题解，展示你的技术能力</li>
              <li>关注感兴趣的用户，获取最新的求职资讯</li>
              <li>查看趋势看板，了解当前的求职热点</li>
            </ul>
          </section>

          <section>
            <h2 class="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">核心特性</h2>
            <div class="grid grid-cols-2 gap-4">
              <div class="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <h3 class="font-bold text-slate-900 dark:text-slate-100 mb-2">面经分享</h3>
                <p class="text-sm text-slate-600 dark:text-slate-400">
                  详细记录面试过程、题目、结果，帮助他人了解各公司面试情况
                </p>
              </div>
              <div class="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <h3 class="font-bold text-slate-900 dark:text-slate-100 mb-2">趋势看板</h3>
                <p class="text-sm text-slate-600 dark:text-slate-400">
                  数据化展示热门公司、技术栈、岗位分布等求职市场信息
                </p>
              </div>
              <div class="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <h3 class="font-bold text-slate-900 dark:text-slate-100 mb-2">社区互动</h3>
                <p class="text-sm text-slate-600 dark:text-slate-400">
                  点赞、收藏、评论、关注，与志同道合的求职者交流
                </p>
              </div>
              <div class="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <h3 class="font-bold text-slate-900 dark:text-slate-100 mb-2">求职意向</h3>
                <p class="text-sm text-slate-600 dark:text-slate-400">
                  设置求职意向，让感兴趣的公司和猎头找到你
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
              <li>微博：@面试圈</li>
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
            面试圈 © 2026 | 个人项目 |
            <router-link to="/" class="text-primary-600 hover:text-primary-700">
              返回首页
            </router-link>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 关于页面
</script>
