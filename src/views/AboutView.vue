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
            <h2>这里适合分享什么</h2>
            <p>
              {{ siteBrand.displayName }}是一个以真实经验和公共讨论为中心的内容社区。你可以从科技数码、学习成长、职场经验、生活方式和投资理财等频道进入，也可以沿着话题和作者继续阅读。
            </p>
            <p>
              在这里，你可以：
            </p>
            <ul>
              <li>发布经验、问题、攻略、资源、观点和复盘</li>
              <li>通过搜索、发现页、话题和标签找到值得参考的内容</li>
              <li>点赞、收藏、评论和关注，参与持续讨论</li>
              <li>提交补充或纠错建议，帮助作者完善内容</li>
            </ul>
          </section>

          <section class="about-section">
            <h2>社区边界</h2>
            <p>
              这里的内容来自社区成员，不代表平台的事实结论、专业意见或任何形式的承诺。涉及投资、医疗、法律、求职和其他高风险场景时，请结合可靠来源和专业人士意见独立判断。
            </p>
            <ul>
              <li>尊重他人隐私，不发布未经授权的个人信息、内部资料或侵权内容</li>
              <li>讨论具体问题和经验，避免骚扰、人身攻击、虚假承诺和误导性营销</li>
              <li>发现问题时优先使用举报、评论或内容建议入口反馈</li>
            </ul>
          </section>

          <section class="about-section">
            <h2>参与入口</h2>
            <div class="about-capabilities">
              <router-link to="/explore">
                <h3>先浏览</h3>
                <p>从频道、活跃话题和精选内容开始。</p>
              </router-link>
              <router-link to="/editor">
                <h3>发布内容</h3>
                <p>分享一段真实经历、问题或可复用方法。</p>
              </router-link>
              <router-link to="/search?sort=hot">
                <h3>寻找答案</h3>
                <p>搜索公开内容、作者、话题和标签。</p>
              </router-link>
              <router-link to="/collaboration">
                <h3>参与共建</h3>
                <p>浏览公开需求，留下可验证的贡献。</p>
              </router-link>
            </div>
          </section>

          <section class="about-section">
            <h2>内容与互动</h2>
            <div class="about-capabilities">
              <div>
                <h3>经验发布</h3>
                <p>
                  支持经验、问题、攻略、资源、观点、复盘和图文笔记
                </p>
              </div>
              <div>
                <h3>社区互动</h3>
                <p>
                  点赞、收藏、评论、关注，与不同领域的作者和读者交流
                </p>
              </div>
              <div>
                <h3>长期回看</h3>
                <p>
                  收藏内容、关注讨论，之后回到个人空间继续整理
                </p>
              </div>
            </div>
          </section>

          <section id="terms" class="about-section policy-anchor">
            <h2>服务条款</h2>
            <p>
              使用社区即表示你同意以真实、合法、尊重他人的方式浏览、发布和互动。你应对自己提交的内容负责，不得利用平台实施骚扰、欺诈、侵权、违法传播或自动化滥用。
            </p>
            <p>
              平台可以基于公开规则限制违规内容和账号，并保留必要的申诉与反馈入口。涉及重大规则变化时，注册或后续使用流程会要求重新确认。
            </p>
          </section>

          <section id="privacy" class="about-section policy-anchor">
            <h2>隐私政策</h2>
            <p>
              注册时收集邮箱、昵称和安全凭据，用于账号识别、登录、安全风控与必要通知。公开页面不会展示邮箱、密码、内部账号标识或运维诊断信息。
            </p>
            <p>
              你可以在设置页管理公开资料、通知和可联系范围。平台仅在实现社区功能、安全审计和法定义务所需范围内处理相关信息。
            </p>
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

.policy-anchor {
  scroll-margin-top: calc(var(--community-header-height) + 1rem);
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

.about-capabilities > div,
.about-capabilities > a {
  padding: 1rem;
  border-right: 1px solid var(--border-subtle);
  border-bottom: 1px solid var(--border-subtle);
}

.about-capabilities > a {
  display: block;
  color: inherit;
  text-decoration: none;
}

.about-capabilities > a:hover {
  background: var(--surface-2);
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
