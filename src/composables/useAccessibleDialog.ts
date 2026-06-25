import { nextTick, onBeforeUnmount, unref, watch, type Ref, type WatchSource } from 'vue'

type DialogOpenSource = Ref<boolean> | WatchSource<boolean>

interface AccessibleDialogOptions {
  close: () => void
  initialFocus?: Ref<HTMLElement | null>
  dialogRef?: Ref<HTMLElement | null>
  closeOnEscape?: boolean | (() => boolean)
  restoreFocus?: boolean
}

const readOpen = (source: DialogOpenSource) => Boolean(typeof source === 'function' ? source() : unref(source))
const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export const useAccessibleDialog = (isOpen: DialogOpenSource, options: AccessibleDialogOptions) => {
  let previousActiveElement: HTMLElement | null = null

  const resolveDialogElement = () => {
    if (options.dialogRef?.value) return options.dialogRef.value
    const focusedDialog = options.initialFocus?.value?.closest('[role="dialog"]')
    if (focusedDialog instanceof HTMLElement) return focusedDialog
    const activeDialog = document.querySelector('[role="dialog"][aria-modal="true"]')
    return activeDialog instanceof HTMLElement ? activeDialog : null
  }

  const canCloseOnEscape = () => {
    if (typeof options.closeOnEscape === 'function') return options.closeOnEscape()
    return options.closeOnEscape !== false
  }

  const focusInitialElement = async () => {
    await nextTick()
    const target = options.initialFocus?.value || resolveDialogElement()
    target?.focus({ preventScroll: true })
  }

  const restorePreviousFocus = () => {
    if (options.restoreFocus === false) return
    if (previousActiveElement && document.contains(previousActiveElement)) {
      previousActiveElement.focus({ preventScroll: true })
    }
    previousActiveElement = null
  }

  const focusableElements = () => {
    const dialog = resolveDialogElement()
    if (!dialog) return []
    return Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
      .filter((element) => element.tabIndex >= 0 && element.getAttribute('aria-hidden') !== 'true')
  }

  const trapTabFocus = (event: KeyboardEvent) => {
    const dialog = resolveDialogElement()
    if (!dialog) return
    const elements = focusableElements()
    if (elements.length === 0) {
      event.preventDefault()
      dialog.focus({ preventScroll: true })
      return
    }
    const first = elements[0]
    const last = elements[elements.length - 1]
    const active = document.activeElement
    if (!dialog.contains(active)) {
      event.preventDefault()
      first.focus({ preventScroll: true })
      return
    }
    if (event.shiftKey && active === first) {
      event.preventDefault()
      last.focus({ preventScroll: true })
      return
    }
    if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus({ preventScroll: true })
    }
  }

  const handleKeydown = (event: KeyboardEvent) => {
    if (!readOpen(isOpen)) return
    if (event.key === 'Tab') {
      trapTabFocus(event)
      return
    }
    if (event.key !== 'Escape' || !canCloseOnEscape()) return
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
