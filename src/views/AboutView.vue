<template>
  <div class="app-shell about-page">
    <AppHeader />
    <main class="community-page about-main">
      <article class="about-article">
        <header class="about-header">
          <span>关于社区</span>
          <h1>关于 {{ siteBrand.displayName }}</h1>
          <p>真实经验、有用见闻、公共讨论和长期内容沉淀。</p>
        </header>

        <div class="about-content">
          <section class="about-section">
            <h2>项目介绍</h2>
            <p>
              {{ siteBrand.displayName }}是围绕真实经验、有用见闻、公共讨论和长期内容沉淀的综合内容社区。科技数码、学习成长、职场经验、生活方式和投资理财是并列频道。
            </p>
            <p>
              我们希望它成为一个成长型社区。在这里，你可以：
            </p>
            <ul>
              <li>发布科技数码、学习成长、职场经验、生活方式和投资理财等多领域内容</li>
              <li>跨领域浏览真实经验，找到可复用的思路与参考路径</li>
              <li>围绕话题、频道、合集和作者持续讨论与交流</li>
              <li>收藏高质量内容，形成自己的长期成长资料库</li>
              <li>查看趋势看板，了解不同频道正在关注的内容方向</li>
            </ul>
          </section>

          <section class="about-section">
            <h2>核心能力</h2>
            <div class="about-capabilities">
              <div>
                <h3>经验发布</h3>
                <p>
                  支持经验、问题、攻略、资源、观点、复盘和图文笔记
                </p>
              </div>
              <div>
                <h3>趋势看板</h3>
                <p>
                  按频道展示发布趋势、热门主题、高频标签和活跃作者
                </p>
              </div>
              <div>
                <h3>社区互动</h3>
                <p>
                  点赞、收藏、评论、关注，与不同领域的作者和读者交流
                </p>
              </div>
              <div>
                <h3>知识沉淀</h3>
                <p>
                  通过摘要、标签、FAQ 和知识卡，把长内容转成可检索资产
                </p>
              </div>
            </div>
          </section>

          <section class="about-section">
            <h2>技术与运行</h2>
            <dl class="about-facts">
              <div><dt>前端</dt><dd>Vue 3、TypeScript、Vite、TailwindCSS</dd></div>
              <div><dt>后端</dt><dd>Spring Boot、MySQL、Redis、Elasticsearch</dd></div>
              <div><dt>消息通知</dt><dd>定时轮询，近实时更新</dd></div>
            </dl>
          </section>

          <section class="about-section">
            <h2>反馈方式</h2>
            <p>
              如有建议或反馈，欢迎通过以下方式联系我们：
            </p>
            <ul>
              <li>站内反馈：通过举报、评论和设置页反馈入口联系我们</li>
            </ul>
          </section>

          <section class="about-section about-disclaimer">
            <h2>免责声明</h2>
            <p>
              本网站所有内容均由用户上传，我们不对内容的真实性、准确性、合法性负责。
              用户在使用本网站时应遵守相关法律法规，不得发布违法、违规、侵权的内容。
              投资理财内容仅用于经验交流和风险认知，不构成投资建议。
            </p>
          </section>
        </div>

        <footer class="about-footer">
          <span>{{ siteBrand.displayName }} © 2026</span>
          <router-link to="/">返回首页</router-link>
          <router-link to="/explore">浏览社区</router-link>
        </footer>
      </article>
    </main>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
import { siteBrand } from '@/utils/brand'
</script>

<style scoped>
.about-page {
  background: var(--surface-2);
}

.about-main {
  padding-top: 2rem;
  padding-bottom: 4rem;
}

.about-article {
  width: min(50rem, 100%);
  margin: 0 auto;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
}

.about-header {
  padding: 2rem 2.25rem;
  border-bottom: 1px solid var(--border-subtle);
}

.about-header span {
  color: var(--primary-600);
  font-size: 0.8125rem;
  font-weight: 800;
}

.about-header h1 {
  margin: 0.35rem 0 0;
  color: var(--text-strong);
  font-size: 2rem;
  font-weight: 900;
  text-wrap: balance;
}

.about-header p {
  margin: 0.55rem 0 0;
  color: var(--text-muted);
  font-size: 0.9375rem;
}

.about-content {
  padding: 0 2.25rem;
}

.about-section {
  padding: 1.75rem 0;
}

.about-section + .about-section {
  border-top: 1px solid var(--border-subtle);
}

.about-section h2 {
  margin: 0 0 0.75rem;
  color: var(--text-strong);
  font-size: 1.125rem;
  font-weight: 850;
}

.about-section h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 0.875rem;
  font-weight: 800;
}

.about-section p,
.about-section li,
.about-section dd {
  color: var(--text-primary);
  font-size: 0.875rem;
  line-height: 1.75;
}

.about-section p {
  max-width: 72ch;
  margin: 0.5rem 0 0;
}

.about-section ul {
  display: grid;
  gap: 0.35rem;
  margin: 0.75rem 0 0;
  padding-left: 1.25rem;
  list-style: disc;
}

.about-capabilities {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0;
  border-top: 1px solid var(--border-subtle);
  border-left: 1px solid var(--border-subtle);
}

.about-capabilities > div {
  padding: 1rem;
  border-right: 1px solid var(--border-subtle);
  border-bottom: 1px solid var(--border-subtle);
}

.about-capabilities p {
  margin-top: 0.35rem;
  color: var(--text-muted);
  font-size: 0.8125rem;
}

.about-facts {
  display: grid;
  margin: 0;
}

.about-facts > div {
  display: grid;
  grid-template-columns: 8rem minmax(0, 1fr);
  gap: 1rem;
  padding: 0.65rem 0;
  border-top: 1px solid var(--border-subtle);
}

.about-facts dt {
  color: var(--text-muted);
  font-size: 0.8125rem;
  font-weight: 700;
}

.about-facts dd {
  margin: 0;
}

.about-disclaimer p {
  color: var(--text-muted);
  font-size: 0.8125rem;
}

.about-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  padding: 1rem 2.25rem;
  border-top: 1px solid var(--border-subtle);
  color: var(--text-muted);
  font-size: 0.75rem;
}

.about-footer a {
  color: var(--primary-600);
  font-weight: 700;
}

@media (max-width: 640px) {
  .about-main {
    padding-top: 0.75rem;
    padding-bottom: 2rem;
  }

  .about-header,
  .about-content,
  .about-footer {
    padding-right: 1rem;
    padding-left: 1rem;
  }

  .about-header h1 {
    font-size: 1.5rem;
  }

  .about-capabilities {
    grid-template-columns: 1fr;
  }

  .about-facts > div {
    grid-template-columns: 1fr;
    gap: 0.15rem;
  }
}
</style>
