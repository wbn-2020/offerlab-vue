import type { CompanyPrep, MockInterviewSession, Question, UserPrepOverview, UserWeeklyPrepReport } from '@/api/question'
import { formatDate } from '@/lib/format'
import { aiReviewProviderText, aiReviewTitle, aiReviewTransparencyItems, answerHintText, answerMetaParts, answerQuestionText, buildMockInterviewReviewSuggestions, hasAiReviewTrace } from '@/utils/mockInterviewFormat'

export function downloadMarkdownFile(markdown: string, filename: string) {
  if (typeof document === 'undefined') return
  const safeFilename = normalizeMarkdownFilename(filename)
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = safeFilename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function normalizeMarkdownFilename(filename: string) {
  const base = normalizeText(filename)
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80) || 'offerlab-export'
  return base.toLowerCase().endsWith('.md') ? base : `${base}.md`
}

export const targetTypeText = (type: string) => {
  if (type === 'position') return '岗位'
  if (type === 'tag') return '标签'
  return '公司'
}

export const mistakeReasonText = (value: string) => {
  const map: Record<string, string> = {
    concept: '概念不熟',
    project: '项目表达弱',
    memory: '需要记忆',
    expression: '表达不清',
    careless: '粗心失误',
    other: '其他错因',
  }
  return map[value] || value
}

export const progressText = (value?: string) => {
  const map: Record<string, string> = {
    todo: '待学习',
    learning: '学习中',
    mastered: '已掌握',
    review: '待复习',
  }
  return map[value || ''] || '未标记'
}

export const difficultyText = (value?: string) => {
  const map: Record<string, string> = {
    easy: '简单',
    medium: '中等',
    hard: '困难',
  }
  return map[value || ''] || value || '不限'
}

export const knowledgeReviewCopy = (value: unknown) => {
  return normalizeText(value)
    .replace(/专项练习/g, '知识复盘')
    .replace(/专项表现/g, '主题表现')
    .replace(/专项标签/g, '复盘标签')
    .replace(/专项训练/g, '复盘练习')
    .replace(/专项:/g, '主题:')
}

export function buildUserPrepPackMarkdown(data: UserPrepOverview) {
  const lines = [
    '# 闻野学习包',
    '',
    `- 收藏题: ${data.favoriteCount}`,
    `- 待学习: ${data.todoCount}`,
    `- 学习中: ${data.learningCount}`,
    `- 已掌握: ${data.masteredCount}`,
    `- 待复习: ${data.reviewCount}`,
    '',
    '## 学习目标',
  ]
  if (data.targets.length) {
    data.targets.forEach((target) => lines.push(`- ${targetTypeText(target.targetType)}: ${inlineText(target.targetValue, '待整理目标')}`))
  } else {
    lines.push('- 暂无目标')
  }
  lines.push('', '## 今日优先复习')
  appendQuestionList(lines, data.reviewPlan?.todayQuestions || data.reviewQuestions)
  lines.push('', '## 复盘短板')
  if (data.mistakeReasonCounts.length) {
    data.mistakeReasonCounts.forEach((item) => lines.push(`- ${mistakeReasonText(item.reason)}: ${item.count} 道`))
  } else {
    lines.push('- 暂无错因标记')
  }
  lines.push('', '## 薄弱标签聚焦')
  appendNameCountList(lines, data.focusTagCounts)
  lines.push('', '## 目标推荐题')
  const targetQuestions = data.targetSummaries.flatMap((summary) => summary.recommendedQuestions).slice(0, 8)
  appendQuestionList(lines, targetQuestions.length ? targetQuestions : data.recommendedQuestions.slice(0, 8))
  return `${lines.join('\n')}\n`
}

export function buildWeeklyPrepReportMarkdown(data: UserWeeklyPrepReport) {
  const lines = [
    '# 闻野本周学习复盘',
    '',
    `- 时间范围: ${formatDate(data.windowStart, 'YYYY-MM-DD')} ~ ${formatDate(data.windowEnd, 'YYYY-MM-DD')}`,
    `- 本周触达题目: ${data.touchedQuestionCount}`,
    `- 新增/保持已掌握: ${data.masteredQuestionCount}`,
    `- 当前待复习: ${data.reviewQuestionCount}`,
    `- 新增笔记: ${data.noteCount}`,
    `- 回答卡片: ${data.answerDraftCount}`,
    `- 知识复盘: ${data.mockCompletedCount}/${data.mockSessionCount} 场完成，答题 ${data.mockAnsweredQuestionCount} 道，平均分 ${data.mockAverageScorePercent}%`,
    '',
    '## 本周复习题目',
  ]
  appendQuestionList(lines, data.touchedQuestions)
  lines.push('', '## 错因分布')
  if (data.mistakeReasonCounts.length) {
    data.mistakeReasonCounts.forEach((item) => lines.push(`- ${mistakeReasonText(item.reason)}: ${item.count} 道`))
  } else {
    lines.push('- 暂无错因标记')
  }
  lines.push('', '## 薄弱标签')
  appendNameCountList(lines, data.focusTagCounts)
  lines.push('', '## 下周动作')
  if (data.nextActions.length) {
    data.nextActions.forEach((action) => lines.push(`- ${inlineText(knowledgeReviewCopy(action), '继续保持复习节奏')}`))
  } else {
    lines.push('- 继续保持复习节奏，完成一次知识复盘')
  }
  return `${lines.join('\n')}\n`
}

export function buildCompanyPrepPackMarkdown(data: CompanyPrep) {
  const lines = [
    `# ${inlineText(data.company, '主题')} 学习主题包`,
    '',
    `- 学习分: ${data.prepScore}%`,
    `- 高频知识卡: ${data.topQuestions.length}`,
    `- 近期经验: ${data.recentPosts.length}`,
    `- 热门方向: ${data.hotPositions.length}`,
    `- 相关方向数: ${data.relatedPositionCount}`,
    `- 知识卡样本: ${data.questionSampleCount}`,
    `- 经验样本: ${data.postSampleCount}`,
    `- 反馈样本: ${data.resultSampleCount}`,
    `- 近 30 天反馈样本: ${data.recentResultSampleCount}`,
    `- 数据更新: ${data.dataUpdatedAt ? formatDate(data.dataUpdatedAt, 'YYYY-MM-DD HH:mm') : '暂无记录'}`,
  ]
  if (data.aliases.length) {
    lines.push(`- 主题别名: ${data.aliases.map((alias) => inlineText(alias)).filter(Boolean).join('、')}`)
  }
  lines.push('', '## 学习清单')
  if (data.checklist.length) {
    data.checklist.forEach((item) => {
      lines.push(`- ${item.done ? '[x]' : '[ ]'} ${inlineText(item.title, '待整理清单项')}: ${item.current}/${item.target}`)
    })
  } else {
    lines.push('- 暂无清单')
  }
  lines.push('', '## 下一步建议')
  if (data.nextActions.length) {
    data.nextActions.forEach((action) => lines.push(`- ${inlineText(knowledgeReviewCopy(action), '继续补充学习材料')}`))
  } else {
    lines.push('- 当前清单已完成，可以继续补充近期经验或复盘高频知识卡')
  }
  lines.push('', '## 高频知识卡')
  appendQuestionList(lines, data.topQuestions)
  if (data.recommendedQuestions.length) {
    lines.push('', '## 优先学习这些')
    appendQuestionList(lines, data.recommendedQuestions)
  }
  lines.push('', '## 高频技术标签')
  appendNameCountList(lines, data.topTags)
  lines.push('', '## 热门方向')
  appendNameCountList(lines, data.hotPositions)
  lines.push('', '## 反馈趋势')
  lines.push('### 近 30 天')
  appendNameCountList(lines, data.recentResultDistribution)
  lines.push('', '### 全部样本')
  appendNameCountList(lines, data.interviewResultDistribution)
  return `${lines.join('\n')}\n`
}

export function buildQuestionAnswerCardMarkdown(question: Question) {
  const meta = [question.company, question.position, question.interviewRound, question.difficulty]
    .filter(Boolean)
    .join(' / ')
  const lines = [
    `# ${inlineText(question.questionText, '知识卡回答卡片')}`,
  ]
  if (meta) {
    lines.push('', `- 题目上下文: ${inlineText(meta)}`)
  }
  if (question.tags.length) {
    lines.push(`- 标签: ${question.tags.map((tag) => inlineText(tag.name)).filter(Boolean).join('、')}`)
  }
  if (question.mistakeReason) {
    lines.push(`- 错因: ${mistakeReasonText(question.mistakeReason)}`)
  }
  lines.push('', '## 回答草稿')
  lines.push(blockText(question.answerDraft, '- 暂无回答草稿'))
  lines.push('', '## STAR 项目映射')
  lines.push(blockText(question.starStory, '- 暂无 STAR 项目映射'))
  lines.push('', '## 复习笔记')
  lines.push(blockText(question.note, '- 暂无复习笔记'))
  if (question.answerHint) {
    lines.push('', '## 参考思路')
    lines.push(blockText(question.answerHint, '- 暂无参考思路'))
  }
  return `${lines.join('\n')}\n`
}

export function buildStarStoryLibraryMarkdown(questions: Question[]) {
  const cards = questions.filter((question) => question.answerDraft || question.starStory || question.note)
  const lines = [
    '# 闻野素材整理库',
    '',
    `- 回答卡片数: ${cards.length}`,
  ]
  if (!cards.length) {
    lines.push('', '暂无回答卡片。')
    return `${lines.join('\n')}\n`
  }
  cards.forEach((question, index) => {
    lines.push('', `## ${index + 1}. ${inlineText(question.questionText, '待整理题目')}`)
    const meta = [question.company, question.position, question.interviewRound]
      .filter(Boolean)
      .join(' / ')
    if (meta) {
      lines.push(`- 场景: ${inlineText(meta)}`)
    }
    if (question.tags.length) {
      lines.push(`- 标签: ${question.tags.map((tag) => inlineText(tag.name)).filter(Boolean).join('、')}`)
    }
    lines.push('', '### STAR 项目映射')
    lines.push(blockText(question.starStory, '- 待补充 STAR 项目映射'))
    lines.push('', '### 回答草稿')
    lines.push(blockText(question.answerDraft, '- 待补充回答草稿'))
    if (question.note) {
      lines.push('', '### 复习笔记')
      lines.push(blockText(question.note, '- 暂无复习笔记'))
    }
  })
  return `${lines.join('\n')}\n`
}

export function buildMockInterviewReportMarkdown(session: MockInterviewSession) {
  const title = [session.focusTag ? `主题:${session.focusTag}` : '', session.company, session.position, session.difficulty ? difficultyText(session.difficulty) : '']
    .filter(Boolean)
    .map((item) => inlineText(item))
    .join(' / ') || '综合知识复盘'
  const lines = [
    `# 闻野知识复盘报告 - ${title}`,
    '',
    `- 状态: ${session.status === 'completed' ? '已完成' : '进行中'}`,
    `- 题数: ${session.answeredCount}/${session.questionCount}`,
    `- 得分: ${session.totalScore}/${Math.max(1, session.questionCount) * 5}`,
    `- 用时: ${formatDuration(session.durationSeconds)}`,
  ]
  if (!session.answers.length) {
    lines.push('', '暂无练习题目。')
    return `${lines.join('\n')}\n`
  }
  lines.push('', '## 知识复盘下一步建议')
  buildMockInterviewReviewSuggestions(session).forEach((item) => {
    lines.push(`- ${inlineText(item.title)}: ${inlineText(item.action)}`)
  })
  session.answers.forEach((answer) => {
    lines.push('', `## Q${answer.sequenceNo}. ${inlineText(answerQuestionText(answer), '题目不可见')}`)
    const meta = answerMetaParts(answer).join(' / ')
    if (meta) {
      lines.push(`- 题目上下文: ${inlineText(meta)}`)
    }
    lines.push(`- 自评分: ${answer.score || 0}/5`)
    lines.push('', '### 我的回答')
    lines.push(blockText(answer.answerText, '- 暂无回答'))
    lines.push('', '### 复盘备注')
    lines.push(blockText(answer.selfReview, '- 暂无复盘备注'))
    if (hasAiReviewTrace(answer)) {
      const hasAiReviewFeedback = answer.aiReviewed
        || answer.aiReviewStatus === 'SUCCEEDED'
        || answer.aiScore !== undefined
        || Boolean(answer.aiCompleteness || answer.aiProjectExpression || answer.aiFollowUpSuggestion)
      lines.push('', `### ${aiReviewTitle(answer)}`)
      lines.push(`- Provider: ${inlineText(aiReviewProviderText(answer.aiReviewProvider, answer.aiReviewFallbackUsed))}`)
      aiReviewTransparencyItems(answer).forEach((item) => lines.push(`- ${inlineText(item)}`))
      if (hasAiReviewFeedback) {
        lines.push(`- ${aiReviewTitle(answer)}分: ${answer.aiScore ?? 0}/5`)
        lines.push(`- 完整度: ${inlineText(answer.aiCompleteness, '暂无评价')}`)
        lines.push(`- 项目表达: ${inlineText(answer.aiProjectExpression, '暂无评价')}`)
        lines.push(`- 追问建议: ${inlineText(answer.aiFollowUpSuggestion, '暂无建议')}`)
      } else if (answer.aiReviewStatus === 'PENDING') {
        lines.push(`- 评价结果: ${aiReviewTitle(answer)}仍在生成中，请稍后回到页面刷新或重新导出。`)
      } else if (answer.aiReviewStatus === 'FAILED') {
        lines.push(`- 评价结果: ${aiReviewTitle(answer)}失败，可回到页面发起重试。`)
      } else {
        lines.push('- 评价结果: 暂无可用 AI/规则评价结果。')
      }
    }
    const hint = answerHintText(answer)
    if (hint) {
      lines.push('', '### 参考思路')
      lines.push(blockText(hint, '- 暂无参考思路'))
    }
  })
  return `${lines.join('\n')}\n`
}

function normalizeText(value: unknown) {
  return String(value ?? '').replace(/\r\n?/g, '\n').replace(/\u0000/g, '')
}

function inlineText(value: unknown, fallback = '') {
  const normalized = normalizeText(value).replace(/\s+/g, ' ').trim()
  const safe = normalized || fallback
  return safe.replace(/\\/g, '\\\\').replace(/([`*_{}\[\]()#+\-.!|>])/g, '\\$1')
}

function blockText(value: unknown, fallback: string) {
  const normalized = normalizeText(value).trim()
  if (!normalized) return fallback
  return normalized.split('\n').map(escapeBlockLine).join('\n')
}

function escapeBlockLine(line: string) {
  const lineWithEscapedPipes = line.replace(/\|/g, '\\|')
  const match = /^(\s*)(.*)$/.exec(lineWithEscapedPipes)
  const indent = match?.[1] || ''
  const body = match?.[2] || ''
  if (/^(#{1,6}\s|[-*+]\s|>|```|~~~)/.test(body)) {
    return `${indent}\\${body}`
  }
  return `${indent}${body.replace(/^(\d+)([.)])(\s+)/, '$1\\$2$3')}`
}

function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds || 0))
  const min = Math.floor(safe / 60)
  const sec = safe % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function appendQuestionList(lines: string[], questions: Question[]) {
  if (!questions.length) {
    lines.push('- 暂无题目')
    return
  }
  questions.slice(0, 8).forEach((question) => {
    const meta = [question.company, question.position, question.progressStatus ? progressText(question.progressStatus) : '']
      .filter(Boolean)
      .join(' / ')
    const suffix = meta ? `（${inlineText(meta)}）` : ''
    lines.push(`- ${inlineText(question.questionText, '待整理题目')}${suffix}`)
  })
}

function appendNameCountList(lines: string[], items: Array<{ name: string; count: number }>) {
  if (!items.length) {
    lines.push('- 暂无数据')
    return
  }
  items.slice(0, 8).forEach((item) => lines.push(`- ${inlineText(item.name, '未归类主题')}: ${item.count}`))
}
