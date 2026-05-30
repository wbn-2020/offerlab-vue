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
  return [session.focusTag ? `专项:${session.focusTag}` : '', session.company, session.position, session.difficulty ? difficultyText(session.difficulty) : '综合场']
    .filter(Boolean)
    .join(' / ')
}

export const buildMockInterviewReviewSuggestions = (session: MockInterviewSession): MockInterviewReviewSuggestion[] => {
  const answers = session.answers || []
  if (!answers.length) {
    return [{
      title: '先完成一组题目',
      description: '当前场次还没有题目，先开始一场 3-5 题的小练习。',
      action: '选择目标公司、岗位或薄弱标签后开始模拟面试。',
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
      action: `把 Q${lowScore.slice(0, 3).map((answer) => answer.sequenceNo).join('、Q')} 加入下一轮专项练习。`,
    })
  }

  if (noReview.length) {
    suggestions.push({
      title: `补充 ${noReview.length} 条复盘备注`,
      description: '复盘备注能帮助你在下次面试前快速定位表达短板。',
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
      description: '本场完成度不错，可以把高频题答案沉淀到题库笔记。',
      action: '挑 1-2 道代表题补充 STAR 项目例子，并复制报告作为面试前速览。',
    })
  }

  return suggestions.slice(0, 4)
}