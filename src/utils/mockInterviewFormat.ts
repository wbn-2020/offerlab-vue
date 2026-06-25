import type { MockInterviewSession } from '@/api/question'

export interface MockInterviewReviewSuggestion {
  title: string
  description: string
  action: string
}

export const difficultyText = (value?: string) => {
  const map: Record<string, string> = {
    easy: '简单',
    medium: '中等',
    hard: '困难',
  }
  return map[value || ''] || value || '不限'
}

export const formatDuration = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds || 0))
  const min = Math.floor(safe / 60)
  const sec = safe % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

const normalizeAiReviewProvider = (provider?: string) => String(provider || '').trim().toLowerCase()

export const aiReviewProviderText = (provider?: string, fallbackUsed?: boolean | null) => {
  const normalized = normalizeAiReviewProvider(provider)
  if (normalized === 'deepseek') return fallbackUsed ? 'DeepSeek + 规则兜底' : 'DeepSeek 模型'
  if (normalized === 'rules') return fallbackUsed ? '规则兜底（模型失败后）' : '规则评价（未调用外部模型）'
  if (normalized === 'none') return '未执行'
  return normalized || 'Provider 未返回'
}

export const aiReviewModeText = (answer: MockInterviewSession['answers'][number]) => {
  const provider = normalizeAiReviewProvider(answer.aiReviewProvider)
  const fallbackKnown = answer.aiReviewFallbackUsed !== undefined && answer.aiReviewFallbackUsed !== null
  if (provider === 'rules') {
    return answer.aiReviewFallbackUsed ? '模型失败后规则兜底' : '规则评价（未调用外部模型）'
  }
  if (provider === 'deepseek') {
    return answer.aiReviewFallbackUsed ? '模型失败后规则兜底' : '模型直评'
  }
  if (provider === 'none') return '未执行'
  return fallbackKnown ? answer.aiReviewFallbackUsed ? '规则兜底' : '模型直评' : '未返回'
}

export const aiReviewTitle = (answer: MockInterviewSession['answers'][number]) => {
  const provider = normalizeAiReviewProvider(answer.aiReviewProvider)
  if (provider === 'rules') return answer.aiReviewFallbackUsed ? '规则兜底评价' : '规则评价'
  if (provider === 'deepseek') return answer.aiReviewFallbackUsed ? 'AI 兜底评价' : 'AI 评价'
  if (provider === 'none') return '评价未执行'
  return 'AI/规则评价'
}

export const aiReviewPendingTitle = (answer: MockInterviewSession['answers'][number]) => `${aiReviewTitle(answer)}生成中`

export const aiReviewFailedTitle = (answer: MockInterviewSession['answers'][number]) => `${aiReviewTitle(answer)}失败`

export const aiReviewRetryText = (count: number) => `重试 AI/规则评价 ${count}`

export const aiReviewUnavailableText = (answer: MockInterviewSession['answers'][number]) => `${aiReviewTitle(answer)}暂时不可用，可以稍后重试。`

export const aiReviewTransparencyItems = (answer: MockInterviewSession['answers'][number]) => {
  const durationKnown = answer.aiReviewDurationMs !== undefined && answer.aiReviewDurationMs !== null
  const promptTokensKnown = answer.aiReviewPromptTokens !== undefined && answer.aiReviewPromptTokens !== null
  const completionTokensKnown = answer.aiReviewCompletionTokens !== undefined && answer.aiReviewCompletionTokens !== null
  const costKnown = answer.aiReviewEstimatedCostMicros !== undefined && answer.aiReviewEstimatedCostMicros !== null
  const tokens = promptTokensKnown || completionTokensKnown
    ? Math.max(0, Math.round(answer.aiReviewPromptTokens || 0)) + Math.max(0, Math.round(answer.aiReviewCompletionTokens || 0))
    : undefined
  const items = [
    `状态: ${answer.aiReviewStatus || (answer.aiReviewed ? 'SUCCEEDED' : 'NOT_REQUESTED')}`,
    `Provider: ${aiReviewProviderText(answer.aiReviewProvider, answer.aiReviewFallbackUsed)}`,
    `模式: ${aiReviewModeText(answer)}`,
    `耗时: ${durationKnown ? `${Math.max(0, Math.round(answer.aiReviewDurationMs || 0))}ms` : '未返回'}`,
    `Tokens: ${tokens === undefined ? '未返回' : tokens}`,
    `成本: ${costKnown ? (Math.max(0, answer.aiReviewEstimatedCostMicros || 0) / 1_000_000).toFixed(6) : '未返回'}`,
    `任务: ${answer.aiReviewTaskId || '未返回'}`,
  ]
  if (answer.aiReviewErrorCode) items.push(`错误码: ${answer.aiReviewErrorCode}`)
  if (answer.aiReviewError) items.push(`错误详情: ${answer.aiReviewError}`)
  return items
}

export const hasAiReviewTrace = (answer: MockInterviewSession['answers'][number]) => {
  const status = String(answer.aiReviewStatus || (answer.aiReviewed ? 'SUCCEEDED' : '')).trim()
  return Boolean(
    answer.aiReviewed
    || (status && status !== 'NOT_REQUESTED')
    || answer.aiReviewProvider
    || answer.aiReviewTaskId
    || answer.aiReviewErrorCode
    || answer.aiReviewError
    || answer.aiScore !== undefined
    || answer.aiCompleteness
    || answer.aiProjectExpression
    || answer.aiFollowUpSuggestion
  )
}

export const scorePercent = (session: MockInterviewSession) => {
  return Math.min(100, Math.round((session.totalScore * 100) / Math.max(1, session.questionCount * 5)))
}

export const trendHeight = (session: MockInterviewSession) => Math.max(12, scorePercent(session))

export const isWeakMockInterviewAnswer = (answer: MockInterviewSession['answers'][number]) => {
  return (answer.answerText || '').trim() && Number(answer.score || 0) <= 2
}

export const answerQuestionText = (answer: MockInterviewSession['answers'][number]) => {
  return answer.question?.questionText || answer.questionTextSnapshot || '\u9898\u76ee\u4e0d\u53ef\u89c1'
}

export const answerHintText = (answer: MockInterviewSession['answers'][number]) => {
  return answer.question?.answerHint || answer.answerHintSnapshot || ''
}

export const answerMetaParts = (answer: MockInterviewSession['answers'][number]) => {
  return [
    answer.question?.company || answer.companySnapshot,
    answer.question?.position || answer.positionSnapshot,
    answer.question?.interviewRound || answer.roundSnapshot,
    answer.question?.difficulty || answer.difficultySnapshot,
  ].filter(Boolean) as string[]
}

export const sessionTitle = (session: MockInterviewSession) => {
  return [session.focusTag ? `主题:${session.focusTag}` : '', session.company, session.position, session.difficulty ? difficultyText(session.difficulty) : '综合知识复盘']
    .filter(Boolean)
    .join(' / ')
}

export const buildMockInterviewReviewSuggestions = (session: MockInterviewSession): MockInterviewReviewSuggestion[] => {
  const answers = session.answers || []
  if (!answers.length) {
    return [{
      title: '先完成一组题目',
      description: '当前场次还没有题目，先开始一场 3-5 题的小练习。',
      action: '选择目标方向、应用场景或薄弱标签后开始知识复盘。',
    }]
  }

  const unanswered = answers.filter((answer) => !(answer.answerText || '').trim())
  const lowScore = answers.filter(isWeakMockInterviewAnswer)
  const noReview = answers.filter((answer) => (answer.answerText || '').trim() && !(answer.selfReview || '').trim())
  const percent = scorePercent(session)
  const suggestions: MockInterviewReviewSuggestion[] = []

  if (unanswered.length) {
    suggestions.push({
      title: `补齐 ${unanswered.length} 道未答题`,
      description: '未答题会拉低本场复盘质量，也会影响后续针对性练习。',
      action: `优先补 Q${unanswered.slice(0, 3).map((answer) => answer.sequenceNo).join('、Q')}，先用 3-5 句话说清楚核心思路。`,
    })
  }

  if (lowScore.length) {
    suggestions.push({
      title: `重练 ${lowScore.length} 道低分题`,
      description: '低分题适合沉淀成错因、项目例子或 STAR 素材。',
      action: `把 Q${lowScore.slice(0, 3).map((answer) => answer.sequenceNo).join('、Q')} 加入下一轮知识复盘。`,
    })
  }

  if (noReview.length) {
    suggestions.push({
      title: `补充 ${noReview.length} 条复盘备注`,
      description: '复盘备注能帮助你在下次练习前快速定位表达短板。',
      action: '每题至少写一句：哪里没说清、缺哪个项目例子、下次怎么开头。',
    })
  }

  if (percent < 60) {
    suggestions.push({
      title: '先做低压复述',
      description: `当前得分约 ${percent}%，适合先降低题量，把答案讲顺。`,
      action: '下一场先抽 3 题，只练定义、场景、取舍三段式。',
    })
  } else if (percent >= 80 && unanswered.length === 0) {
    suggestions.push({
      title: '提高追问强度',
      description: `当前得分约 ${percent}%，基础表达已经比较稳定。`,
      action: '下一场切到困难题或指定薄弱标签，重点练边界条件和方案权衡。',
    })
  }

  if (!suggestions.length) {
    suggestions.push({
      title: '形成可复用答案卡',
      description: '本场完成度不错，可以把高频题答案沉淀到知识卡笔记。',
      action: '挑 1-2 道代表题补充 STAR 项目例子，并复制报告作为阶段复盘速览。',
    })
  }

  return suggestions.slice(0, 4)
}
