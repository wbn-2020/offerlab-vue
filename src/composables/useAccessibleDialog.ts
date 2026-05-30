import { nextTick, onBeforeUnmount, unref, watch, type Ref, type WatchSource } from 'vue'

type DialogOpenSource = Ref<boolean> | WatchSource<boolean>

interface AccessibleDialogOptions {
  close: () => void
  initialFocus?: Ref<HTMLElement | null>
  closeOnEscape?: boolean | (() => boolean)
  restoreFocus?: boolean
}

const readOpen = (source: DialogOpenSource) => Boolean(typeof source === 'function' ? source() : unref(source))

export const useAccessibleDialog = (isOpen: DialogOpenSource, options: AccessibleDialogOptions) => {
  let previousActiveElement: HTMLElement | null = null

  const canCloseOnEscape = () => {
    if (typeof options.closeOnEscape === 'function') return options.closeOnEscape()
    return options.closeOnEscape !== false
  }

  const focusInitialElement = async () => {
    await nextTick()
    options.initialFocus?.value?.focus({ preventScroll: true })
  }

  const restorePreviousFocus = () => {
    if (options.restoreFocus === false) return
    if (previousActiveElement && document.contains(previousActiveElement)) {
      previousActiveElement.focus({ preventScroll: true })
    }
    previousActiveElement = null
  }

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !readOpen(isOpen) || !canCloseOnEscape()) return
    event.preventDefault()
    options.close()
  }

  watch(isOpen, (open) => {
    if (open) {
      previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null
      window.addEventListener('keydown', handleKeydown)
      void focusInitialElement()
      return
    }
    window.removeEventListener('keydown', handleKeydown)
    restorePreviousFocus()
  })

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeydown)
  })
}
