import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})

md.validateLink = (url: string) => /^(https?:|mailto:)/i.test(url.trim())

export const renderMarkdown = (value: string) => md.render(value || '')
