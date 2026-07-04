import { buildCanonicalUrl, summarizeSeoText } from '@/utils/seo'

export interface PublicSharePayload {
  title?: string | null
  text?: string | null
  canonical?: string | null
}

export type PublicShareResult =
  | { status: 'shared'; url: string }
  | { status: 'copied'; url: string }
  | { status: 'cancelled'; url: string }
  | { status: 'failed'; url: string; error: unknown }

const isShareCancelled = (error: unknown) => {
  const name = String((error as { name?: string })?.name || '')
  const message = String((error as { message?: string })?.message || '')
  return /AbortError|cancel/i.test(name) || /AbortError|cancel|取消/i.test(message)
}

export const copyPublicLink = async (url: string) => {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    throw new Error('Clipboard unavailable')
  }
  await navigator.clipboard.writeText(url)
}

export const sharePublicLink = async (payload: PublicSharePayload): Promise<PublicShareResult> => {
  const url = buildCanonicalUrl(payload.canonical)
  const title = String(payload.title || '').trim()
  const text = summarizeSeoText(payload.text, '')

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        ...(title ? { title } : {}),
        ...(text ? { text } : {}),
        url,
      })
      return { status: 'shared', url }
    } catch (error) {
      if (isShareCancelled(error)) return { status: 'cancelled', url }
    }
  }

  try {
    await copyPublicLink(url)
    return { status: 'copied', url }
  } catch (error) {
    return { status: 'failed', url, error }
  }
}
