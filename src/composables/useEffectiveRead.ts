import { onBeforeUnmount, onMounted, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type {
  ApiId,
  EffectiveReadActivityState,
  EffectiveReadHeartbeatReq,
  EffectiveReadHeartbeatResult,
  EffectiveReadSession,
} from '@/api/types'
import { growthApi } from '@/api/growth'

type EffectiveReadOptions = {
  enabled?: MaybeRefOrGetter<boolean>
}

type EffectiveReadRun = {
  generation: number
  postId: ApiId
  session: EffectiveReadSession | null
  sessionController: AbortController | null
  heartbeatController: AbortController | null
  completeController: AbortController | null
  intervalId: ReturnType<typeof setInterval> | null
  retryTimerId: ReturnType<typeof setTimeout> | null
  sessionAttempts: number
  heartbeatAttempts: number
  completeAttempts: number
  sessionRefreshes: number
  nextHeartbeatSeq: number
  desiredActivity: EffectiveReadActivityState
  pendingHeartbeat: EffectiveReadHeartbeatReq | null
  scrollCheckpoint: number
  qualified: boolean
  completed: boolean
  completing: boolean
  closed: boolean
}

const ACTIVITY_ACTIVE: EffectiveReadActivityState = 'ACTIVE'
const ACTIVITY_PAUSED: EffectiveReadActivityState = 'PAUSED'
const MAX_REQUEST_ATTEMPTS = 3
const MAX_SESSION_REFRESHES = 1
const RETRY_DELAYS_MS = [1000, 2000]

export const useEffectiveRead = (
  postId: MaybeRefOrGetter<ApiId | null | undefined>,
  options: EffectiveReadOptions = {},
) => {
  const activeSeconds = ref(0)
  const scrollPercent = ref(0)
  const completed = ref(false)
  const session = ref<EffectiveReadSession | null>(null)
  let activeRun: EffectiveReadRun | null = null
  let mounted = false
  let windowFocused = true
  let generation = 0

  const isEnabled = () => options.enabled === undefined || Boolean(toValue(options.enabled))

  const currentPostId = () => {
    const value = toValue(postId)
    if (value === null || value === undefined || value === '') return null
    return value
  }

  const ownsRun = (run: EffectiveReadRun) =>
    activeRun === run && run.generation === generation

  const isActiveRun = (run: EffectiveReadRun) => {
    const value = currentPostId()
    return ownsRun(run)
      && mounted
      && isEnabled()
      && value !== null
      && String(value) === String(run.postId)
  }

  const isPageInteractive = () => (
    typeof document !== 'undefined'
    && document.visibilityState === 'visible'
    && windowFocused
  )

  const clearRunInterval = (run: EffectiveReadRun) => {
    if (!ownsRun(run) || run.intervalId === null) return
    clearInterval(run.intervalId)
    run.intervalId = null
  }

  const clearRunRetryTimer = (run: EffectiveReadRun) => {
    if (!ownsRun(run) || run.retryTimerId === null) return
    clearTimeout(run.retryTimerId)
    run.retryTimerId = null
  }

  const closeRun = (run: EffectiveReadRun) => {
    if (!ownsRun(run)) return
    run.closed = true
    run.pendingHeartbeat = null
    clearRunInterval(run)
    clearRunRetryTimer(run)
    run.heartbeatController?.abort()
    run.heartbeatController = null
  }

  const abandonServerSession = (run: EffectiveReadRun) => {
    const current = run.session
    if (!current || run.completed) return
    run.session = null
    if (ownsRun(run)) session.value = null
    void growthApi.abandonEffectiveRead({
      sessionToken: current.sessionToken,
    }, {
      keepalive: true,
    }).catch(() => undefined)
  }

  const cleanupRun = (run: EffectiveReadRun) => {
    if (!ownsRun(run)) return
    closeRun(run)
    run.sessionController?.abort()
    run.sessionController = null
    run.completeController?.abort()
    run.completeController = null
    run.completing = false
    abandonServerSession(run)
  }

  const updateScrollCheckpoint = (run: EffectiveReadRun) => {
    if (!isActiveRun(run)) return
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    const root = document.documentElement
    const scrollable = Math.max(0, root.scrollHeight - window.innerHeight)
    const next = scrollable <= 0 ? 100 : Math.round((window.scrollY / scrollable) * 100)
    if (!isActiveRun(run)) return
    run.scrollCheckpoint = Math.max(
      run.scrollCheckpoint,
      Math.max(0, Math.min(100, next)),
    )
  }

  const applyServerProgress = (
    run: EffectiveReadRun,
    progress: Pick<
      EffectiveReadHeartbeatResult,
      'activeSeconds' | 'maxScrollPercent' | 'qualified' | 'completed'
    >,
  ) => {
    if (!isActiveRun(run)) return
    activeSeconds.value = Math.max(0, Number(progress.activeSeconds || 0))
    scrollPercent.value = Math.max(
      0,
      Math.min(100, Number(progress.maxScrollPercent || 0)),
    )
    run.qualified = Boolean(progress.qualified)
    run.completed = Boolean(progress.completed)
    completed.value = run.completed
  }

  const errorDetails = (error: unknown) => {
    const candidate = error as {
      code?: number | string
      message?: string
      name?: string
      response?: { status?: number }
      status?: number
    } | null
    return {
      code: candidate?.code,
      message: String(candidate?.message ?? ''),
      name: String(candidate?.name ?? ''),
      status: candidate?.status ?? candidate?.response?.status,
    }
  }

  const isAbortError = (error: unknown, signal: AbortSignal) => {
    if (signal.aborted) return true
    const { code, message, name } = errorDetails(error)
    return name === 'AbortError'
      || code === 'ERR_CANCELED'
      || /\b(?:abort(?:ed)?|cancel(?:led|ed)?)\b/i.test(message)
  }

  const isInvalidSessionError = (error: unknown) => {
    const { code } = errorDetails(error)
    return Number(code) === 30002 || Number(code) === 10403
  }

  const isTransientError = (error: unknown) => {
    const { code, status } = errorDetails(error)
    if (status === 408 || status === 425 || status === 429 || (status !== undefined && status >= 500)) {
      return true
    }
    if (typeof code === 'number') {
      return code === 10429 || (code >= 20000 && code < 30000)
    }
    if (typeof code === 'string') {
      return ['ECONNABORTED', 'ERR_NETWORK', 'ETIMEDOUT'].includes(code)
    }
    return error instanceof Error && status === undefined
  }

  const scheduleRetry = (
    run: EffectiveReadRun,
    attempt: number,
    retry: () => void,
  ) => {
    if (!isActiveRun(run) || run.retryTimerId !== null || run.closed) return
    const delay = RETRY_DELAYS_MS[Math.min(Math.max(0, attempt - 1), RETRY_DELAYS_MS.length - 1)]
    const timerId = setTimeout(() => {
      if (!isActiveRun(run) || run.retryTimerId !== timerId || run.closed) return
      run.retryTimerId = null
      retry()
    }, delay)
    if (!isActiveRun(run)) {
      clearTimeout(timerId)
      return
    }
    run.retryTimerId = timerId
  }

  const stop = () => {
    const run = activeRun
    if (run && ownsRun(run)) cleanupRun(run)
    activeRun = null
    generation += 1
    session.value = null
  }

  const start = (sessionRefreshes = 0) => {
    stop()
    activeSeconds.value = 0
    scrollPercent.value = 0
    completed.value = false
    if (!mounted || !isEnabled()) return
    const targetPostId = currentPostId()
    if (targetPostId === null) return

    const run: EffectiveReadRun = {
      generation,
      postId: targetPostId,
      session: null,
      sessionController: null,
      heartbeatController: null,
      completeController: null,
      intervalId: null,
      retryTimerId: null,
      sessionAttempts: 0,
      heartbeatAttempts: 0,
      completeAttempts: 0,
      sessionRefreshes,
      nextHeartbeatSeq: 1,
      desiredActivity: ACTIVITY_PAUSED,
      pendingHeartbeat: null,
      scrollCheckpoint: 0,
      qualified: false,
      completed: false,
      completing: false,
      closed: false,
    }
    activeRun = run
    void requestSession(run)
  }

  const replaceInvalidSession = (run: EffectiveReadRun) => {
    if (!isActiveRun(run)) return
    if (run.sessionRefreshes >= MAX_SESSION_REFRESHES) {
      closeRun(run)
      run.session = null
      session.value = null
      return
    }
    start(run.sessionRefreshes + 1)
  }

  const ensureHeartbeatInterval = (run: EffectiveReadRun) => {
    if (
      !isActiveRun(run)
      || run.closed
      || run.completing
      || !run.session
      || !isPageInteractive()
      || run.intervalId !== null
    ) {
      return
    }
    const intervalMs = Math.max(
      1000,
      Number(run.session.heartbeatIntervalSeconds || 5) * 1000,
    )
    run.intervalId = setInterval(() => {
      if (!isActiveRun(run) || run.closed || run.completing || !isPageInteractive()) return
      updateScrollCheckpoint(run)
      run.desiredActivity = ACTIVITY_ACTIVE
      void requestHeartbeat(run)
    }, intervalMs)
  }

  const complete = async (run: EffectiveReadRun) => {
    if (
      !isActiveRun(run)
      || run.completing
      || run.closed
      || run.completeAttempts >= MAX_REQUEST_ATTEMPTS
      || !run.qualified
      || completed.value
    ) {
      return
    }
    const current = run.session
    if (!current) return

    clearRunInterval(run)
    clearRunRetryTimer(run)
    const controller = new AbortController()
    run.completeController = controller
    run.completing = true
    run.completeAttempts += 1

    try {
      const res = await growthApi.completeEffectiveRead({
        sessionToken: current.sessionToken,
      }, controller.signal)
      if (!isActiveRun(run) || controller.signal.aborted || run.completeController !== controller) return
      if (!res.data) throw new Error('effective read completion returned no data')
      activeSeconds.value = Math.max(0, Number(res.data.activeSeconds ?? activeSeconds.value))
      scrollPercent.value = Math.max(
        0,
        Math.min(100, Number(res.data.maxScrollPercent ?? scrollPercent.value)),
      )
      run.completed = Boolean(res.data.completed ?? res.data.recorded)
      completed.value = run.completed
      if (run.completed) {
        closeRun(run)
      }
    } catch (error) {
      if (!isActiveRun(run) || run.completeController !== controller || isAbortError(error, controller.signal)) {
        return
      }
      if (isInvalidSessionError(error)) {
        replaceInvalidSession(run)
        return
      }
      if (isTransientError(error) && run.completeAttempts < MAX_REQUEST_ATTEMPTS) {
        scheduleRetry(run, run.completeAttempts, () => {
          void complete(run)
        })
        return
      }
      closeRun(run)
    } finally {
      if (!ownsRun(run) || run.completeController !== controller) return
      run.completeController = null
      run.completing = false
    }
  }

  async function requestHeartbeat(run: EffectiveReadRun) {
    if (
      !isActiveRun(run)
      || run.closed
      || run.completing
      || !run.session
      || run.heartbeatController !== null
      || run.retryTimerId !== null
    ) {
      return
    }

    updateScrollCheckpoint(run)
    if (!run.pendingHeartbeat) {
      run.pendingHeartbeat = {
        sessionToken: run.session.sessionToken,
        heartbeatSeq: run.nextHeartbeatSeq,
        activityState: run.desiredActivity,
        scrollPercent: run.scrollCheckpoint,
      }
      run.heartbeatAttempts = 0
    }
    const payload = run.pendingHeartbeat
    const controller = new AbortController()
    run.heartbeatController = controller
    run.heartbeatAttempts += 1
    let flushDesiredState = false

    try {
      const res = await growthApi.heartbeatEffectiveRead(payload, controller.signal)
      if (!isActiveRun(run) || controller.signal.aborted || run.heartbeatController !== controller) return
      if (!res.data) throw new Error('effective read heartbeat returned no data')

      applyServerProgress(run, res.data)
      run.nextHeartbeatSeq = Math.max(payload.heartbeatSeq + 1, Number(res.data.nextHeartbeatSeq || 0))
      run.pendingHeartbeat = null
      run.heartbeatAttempts = 0
      if (res.data.completed) {
        closeRun(run)
        return
      }
      if (res.data.qualified) {
        void complete(run)
        return
      }

      const desiredCounting = run.desiredActivity === ACTIVITY_ACTIVE
      flushDesiredState = run.desiredActivity !== payload.activityState
        || (!res.data.accepted && desiredCounting !== Boolean(res.data.countingActive))
    } catch (error) {
      if (!isActiveRun(run) || run.heartbeatController !== controller || isAbortError(error, controller.signal)) {
        return
      }
      if (isInvalidSessionError(error)) {
        run.pendingHeartbeat = null
        replaceInvalidSession(run)
        return
      }
      if (isTransientError(error) && run.heartbeatAttempts < MAX_REQUEST_ATTEMPTS) {
        scheduleRetry(run, run.heartbeatAttempts, () => {
          void requestHeartbeat(run)
        })
        return
      }
      closeRun(run)
    } finally {
      if (!ownsRun(run) || run.heartbeatController !== controller) return
      run.heartbeatController = null
      if (flushDesiredState && isActiveRun(run) && !run.closed && !run.completing) {
        void requestHeartbeat(run)
      }
    }
  }

  async function requestSession(run: EffectiveReadRun) {
    if (!isActiveRun(run) || run.sessionController !== null || run.closed) return
    const controller = new AbortController()
    run.sessionController = controller
    run.sessionAttempts += 1
    try {
      const res = await growthApi.startEffectiveReadSession(run.postId, controller.signal)
      if (!isActiveRun(run) || controller.signal.aborted || run.sessionController !== controller || !res.data) {
        return
      }
      run.session = res.data
      session.value = res.data
      run.nextHeartbeatSeq = Math.max(1, Number(res.data.nextHeartbeatSeq || 1))
      run.qualified = Boolean(res.data.qualified)
      activeSeconds.value = Math.max(0, Number(res.data.activeSeconds || 0))
      scrollPercent.value = Math.max(
        0,
        Math.min(100, Number(res.data.maxScrollPercent || 0)),
      )
      run.completed = Boolean(res.data.completed)
      completed.value = run.completed
      run.scrollCheckpoint = scrollPercent.value
      updateScrollCheckpoint(run)

      if (run.completed) {
        closeRun(run)
        return
      }
      if (run.qualified) {
        void complete(run)
        return
      }
      if (isPageInteractive()) {
        run.desiredActivity = ACTIVITY_ACTIVE
        ensureHeartbeatInterval(run)
        void requestHeartbeat(run)
      } else {
        run.desiredActivity = ACTIVITY_PAUSED
      }
    } catch (error) {
      if (!isActiveRun(run) || run.sessionController !== controller || isAbortError(error, controller.signal)) {
        return
      }
      if (isTransientError(error) && run.sessionAttempts < MAX_REQUEST_ATTEMPTS) {
        scheduleRetry(run, run.sessionAttempts, () => {
          void requestSession(run)
        })
        return
      }
      closeRun(run)
      run.session = null
      session.value = null
    } finally {
      if (!ownsRun(run) || run.sessionController !== controller) return
      run.sessionController = null
    }
  }

  const setDesiredActivity = (
    run: EffectiveReadRun,
    activityState: EffectiveReadActivityState,
  ) => {
    if (!isActiveRun(run) || run.closed || run.completing) return
    run.desiredActivity = activityState
    updateScrollCheckpoint(run)
    if (activityState === ACTIVITY_ACTIVE) {
      ensureHeartbeatInterval(run)
    } else {
      clearRunInterval(run)
    }
    void requestHeartbeat(run)
  }

  const onFocus = () => {
    windowFocused = true
    const run = activeRun
    if (run && isPageInteractive()) {
      setDesiredActivity(run, ACTIVITY_ACTIVE)
    }
  }

  const onBlur = () => {
    windowFocused = false
    const run = activeRun
    if (run) {
      setDesiredActivity(run, ACTIVITY_PAUSED)
    }
  }

  const onScroll = () => {
    const run = activeRun
    if (run) updateScrollCheckpoint(run)
  }

  const onVisibilityChange = () => {
    const run = activeRun
    if (!run) return
    if (isPageInteractive()) {
      setDesiredActivity(run, ACTIVITY_ACTIVE)
    } else {
      setDesiredActivity(run, ACTIVITY_PAUSED)
    }
  }

  const onPageHide = () => {
    const run = activeRun
    if (run && ownsRun(run)) cleanupRun(run)
  }

  const onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted && mounted) start()
  }

  onMounted(() => {
    mounted = true
    windowFocused = typeof document.hasFocus === 'function' ? document.hasFocus() : true
    window.addEventListener('focus', onFocus)
    window.addEventListener('blur', onBlur)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('pageshow', onPageShow)
    document.addEventListener('visibilitychange', onVisibilityChange)
    start()
  })

  watch(
    [() => toValue(postId), () => isEnabled()],
    () => {
      if (mounted) start()
    },
  )

  onBeforeUnmount(() => {
    mounted = false
    window.removeEventListener('focus', onFocus)
    window.removeEventListener('blur', onBlur)
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('pagehide', onPageHide)
    window.removeEventListener('pageshow', onPageShow)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    stop()
  })

  return {
    activeSeconds,
    scrollPercent,
    completed,
  }
}
