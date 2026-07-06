import type { EditorAssistAction, EditorAssistContext, EditorAssistContextType } from '@/api/types'
import type { ContentTypeCode } from '@/utils/contentTypes'

export type EditorAssistTemplateCode =
  | 'technical_review'
  | 'interview_experience_review'
  | 'project_summary'
  | 'knowledge_checklist'
  | 'topic_supplement'
  | 'discussion_prompt'
  | 'resource_note'
  | 'short_opinion'

export interface EditorAssistTemplate {
  code: EditorAssistTemplateCode
  name: string
  title: string
  description: string
  audience: 'public_content'
  bodyTemplate: string
  markdown: string
  recommendedTags: string[]
  recommendedTopics: string[]
  actions: EditorAssistAction[]
  contextTypes: EditorAssistContextType[]
  sourceHints: string[]
  boundaryNote: string
  editableMarkdown: true
}

export const EDITOR_ASSIST_TEMPLATE_BOUNDARY =
  '模板只提供公开内容结构，不生成完整正文，不承诺收录、精选、曝光或商业回报。'

type EditorAssistTemplateDefinition = Omit<
  EditorAssistTemplate,
  'name' | 'audience' | 'markdown' | 'sourceHints' | 'boundaryNote' | 'editableMarkdown'
>

const contextHintLabels: Record<EditorAssistContextType, string> = {
  post: '公开内容',
  reply: '公共讨论',
  idea: '选题灵感',
  series: '公开合集',
  topic: '公开话题',
  template: '模板入口',
}

const withTemplateMetadata = (template: EditorAssistTemplateDefinition): EditorAssistTemplate => ({
  ...template,
  name: template.title,
  description: /公开|公共/.test(template.description) ? template.description : `公开内容：${template.description}`,
  audience: 'public_content',
  markdown: template.bodyTemplate.trim(),
  sourceHints: template.contextTypes.map((item) => contextHintLabels[item]),
  boundaryNote: EDITOR_ASSIST_TEMPLATE_BOUNDARY,
  editableMarkdown: true,
})

const safeTemplateText = (value: unknown) => {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim()
}

const EDITOR_ASSIST_TEMPLATE_DEFINITIONS: EditorAssistTemplateDefinition[] = [
  {
    code: 'technical_review',
    title: '技术复盘',
    description: '整理一次技术问题、方案取舍、结果和可复用提醒。',
    recommendedTags: ['技术复盘', '实践总结', '问题排查'],
    recommendedTopics: ['稳定性与故障排查', '技术实践复盘'],
    actions: ['update', 'continue', 'series'],
    contextTypes: ['post', 'idea', 'series'],
    bodyTemplate: `## 背景

## 问题或目标

## 排查与取舍

## 方案与落地

## 结果与影响

## 可复用清单
`,
  },
  {
    code: 'interview_experience_review',
    title: '面经复盘',
    description: '记录可公开分享的流程、问题、表达取舍和复盘提醒。',
    recommendedTags: ['面经复盘', '表达复盘', '经验分享'],
    recommendedTopics: ['面试经验复盘', '职场表达'],
    actions: ['continue', 'update'],
    contextTypes: ['post', 'idea', 'template'],
    bodyTemplate: `## 背景与范围

## 流程与问题

## 当时的表达或判断

## 复盘后的提醒

## 可以继续讨论的点
`,
  },
  {
    code: 'project_summary',
    title: '项目总结',
    description: '复盘项目目标、过程、协作、结果和下一步补充。',
    recommendedTags: ['项目总结', '复盘记录', '协作经验'],
    recommendedTopics: ['项目复盘', '协作方法'],
    actions: ['update', 'continue', 'series'],
    contextTypes: ['post', 'idea', 'series'],
    bodyTemplate: `## 项目背景

## 目标与约束

## 关键过程

## 难点与取舍

## 结果与经验

## 下一步补充
`,
  },
  {
    code: 'knowledge_checklist',
    title: '知识清单',
    description: '把经验整理成步骤、清单、适用场景和注意事项。',
    recommendedTags: ['知识清单', '方法清单', '实践步骤'],
    recommendedTopics: ['方法论清单', '实践工具箱'],
    actions: ['continue', 'series', 'template'],
    contextTypes: ['idea', 'series', 'template'],
    bodyTemplate: `## 适用场景

## 准备事项

## 步骤清单

## 常见误区

## 参考或延伸
`,
  },
  {
    code: 'topic_supplement',
    title: '专题补充',
    description: '给已有内容、合集或话题补充一篇上下文明确的后续。',
    recommendedTags: ['专题补充', '后续更新', '公开合集'],
    recommendedTopics: ['专题更新', '同主题补充'],
    actions: ['update', 'continue', 'series', 'topic'],
    contextTypes: ['post', 'idea', 'series', 'topic'],
    bodyTemplate: `## 为什么补充

## 前文或话题背景

## 这次新增的信息

## 和原内容的关系

## 希望继续收集的讨论
`,
  },
  {
    code: 'discussion_prompt',
    title: '问题讨论',
    description: '把公共讨论或读者追问整理成可回答、可补充的问题。',
    recommendedTags: ['问题讨论', '经验请教', '公共讨论'],
    recommendedTopics: ['社区问答', '经验互助'],
    actions: ['reply', 'topic', 'continue'],
    contextTypes: ['reply', 'idea', 'topic'],
    bodyTemplate: `## 想讨论的问题

## 背景和限制

## 我已经尝试或观察到什么

## 希望大家补充什么

## 后续我会如何更新
`,
  },
  {
    code: 'resource_note',
    title: '资源推荐',
    description: '说明资源适合谁、怎么用、优缺点和公开使用提醒。',
    recommendedTags: ['资源推荐', '工具笔记', '使用体验'],
    recommendedTopics: ['资源清单', '工具实测'],
    actions: ['continue', 'series', 'template'],
    contextTypes: ['idea', 'series', 'template'],
    bodyTemplate: `## 资源简介

## 适用场景

## 使用方式

## 优点与限制

## 替代选择或延伸
`,
  },
  {
    code: 'short_opinion',
    title: '观点短评',
    description: '快速表达观察、判断依据、反例和邀请讨论的问题。',
    recommendedTags: ['观点短评', '观察记录', '讨论'],
    recommendedTopics: ['观点讨论', '公共观察'],
    actions: ['topic', 'template', 'continue'],
    contextTypes: ['topic', 'idea', 'template'],
    bodyTemplate: `## 我的观点

## 为什么会这么想

## 可能的反例

## 想听听大家怎么看
`,
  },
]

export const EDITOR_ASSIST_TEMPLATES: EditorAssistTemplate[] = EDITOR_ASSIST_TEMPLATE_DEFINITIONS.map(withTemplateMetadata)

export const PUBLIC_EDITOR_ASSIST_TEMPLATES = EDITOR_ASSIST_TEMPLATES

export const EDITOR_ASSIST_TEMPLATE_CODES = EDITOR_ASSIST_TEMPLATES.map((item) => item.code)

const templateMap = new Map(EDITOR_ASSIST_TEMPLATES.map((item) => [item.code, item]))

export const getEditorAssistTemplate = (code?: string | null) => (
  templateMap.get(code as EditorAssistTemplateCode) || null
)

export const isEditorAssistTemplateCode = (code: unknown): code is EditorAssistTemplateCode => (
  typeof code === 'string' && templateMap.has(code as EditorAssistTemplateCode)
)

export const listEditorAssistTemplates = () => [...PUBLIC_EDITOR_ASSIST_TEMPLATES]

export const createEditorAssistTemplateMarkdown = (code?: string | null) => (
  getEditorAssistTemplate(code)?.markdown || ''
)

type ApplyTemplateMode = 'append' | 'replace' | 'cancel' | 'clear'

export interface ApplyEditorAssistTemplateSelectionInput {
  currentContent?: string
  currentTemplateCode?: string | null
  nextTemplateCode?: string | null
  mode?: ApplyTemplateMode
}

export interface ApplyEditorAssistTemplateSelectionResult {
  status: 'inserted' | 'needs_confirmation' | 'cancelled' | 'cleared' | 'invalid_template'
  content: string
  selectedTemplateCode: EditorAssistTemplateCode | null
  confirmationOptions?: Array<Exclude<ApplyTemplateMode, 'clear'>>
}

export const applyEditorAssistTemplateSelection = (
  input: ApplyEditorAssistTemplateSelectionInput,
): ApplyEditorAssistTemplateSelectionResult => {
  const currentContent = input.currentContent || ''
  if (input.mode === 'clear') {
    return {
      status: 'cleared',
      content: '',
      selectedTemplateCode: null,
    }
  }

  const previousTemplateCode = isEditorAssistTemplateCode(input.currentTemplateCode)
    ? input.currentTemplateCode
    : null
  if (input.mode === 'cancel') {
    return {
      status: 'cancelled',
      content: currentContent,
      selectedTemplateCode: previousTemplateCode,
    }
  }

  if (!isEditorAssistTemplateCode(input.nextTemplateCode)) {
    return {
      status: 'invalid_template',
      content: currentContent,
      selectedTemplateCode: previousTemplateCode,
    }
  }

  const nextMarkdown = createEditorAssistTemplateMarkdown(input.nextTemplateCode)
  if (currentContent.trim() && input.mode !== 'append' && input.mode !== 'replace') {
    return {
      status: 'needs_confirmation',
      content: currentContent,
      selectedTemplateCode: previousTemplateCode,
      confirmationOptions: ['append', 'replace', 'cancel'],
    }
  }

  return {
    status: 'inserted',
    content: input.mode === 'append' && currentContent.trim()
      ? `${currentContent.trimEnd()}\n\n${nextMarkdown}`
      : nextMarkdown,
    selectedTemplateCode: input.nextTemplateCode,
  }
}

const contentTypeTemplateMap: Partial<Record<ContentTypeCode, EditorAssistTemplateCode>> = {
  TECH_ARTICLE: 'knowledge_checklist',
  PROJECT_REVIEW: 'project_summary',
  PITFALL: 'short_opinion',
  QUESTION: 'discussion_prompt',
  RESOURCE: 'resource_note',
  NOTE: 'short_opinion',
  SYSTEM_DESIGN: 'short_opinion',
  INTERVIEW_RECAP: 'interview_experience_review',
}

const contextTemplateMap: Partial<Record<EditorAssistContextType, EditorAssistTemplateCode>> = {
  reply: 'discussion_prompt',
  post: 'topic_supplement',
  idea: 'knowledge_checklist',
  series: 'topic_supplement',
  topic: 'discussion_prompt',
  template: 'short_opinion',
}

const actionTemplateMap: Partial<Record<EditorAssistAction, EditorAssistTemplateCode>> = {
  reply: 'discussion_prompt',
  update: 'topic_supplement',
  continue: 'topic_supplement',
  series: 'topic_supplement',
  topic: 'discussion_prompt',
  template: 'short_opinion',
}

export const recommendEditorAssistTemplate = (
  context: EditorAssistContext | null,
  contentType?: ContentTypeCode,
) => {
  const explicit = getEditorAssistTemplate(context?.templateCode)
  if (explicit) return explicit
  const byContext = context?.contextType ? getEditorAssistTemplate(contextTemplateMap[context.contextType]) : null
  if (byContext) return byContext
  const byAction = context?.action ? getEditorAssistTemplate(actionTemplateMap[context.action]) : null
  if (byAction) return byAction
  return getEditorAssistTemplate(contentTypeTemplateMap[contentType || 'NOTE']) || EDITOR_ASSIST_TEMPLATES[0]
}

export const buildEditorAssistTemplateMarkdown = (
  template: EditorAssistTemplate,
  context: EditorAssistContext | null,
) => {
  const title = safeTemplateText(context?.title)
  const topic = safeTemplateText(context?.topic)
  const header = [
    title ? `> 来源线索：${title}` : '',
    topic ? `> 话题线索：${topic}` : '',
    `> ${EDITOR_ASSIST_TEMPLATE_BOUNDARY}`,
  ].filter(Boolean)
  return `${header.join('\n')}\n\n${template.bodyTemplate}`.trimStart()
}
