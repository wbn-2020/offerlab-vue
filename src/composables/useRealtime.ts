import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { notificationApi } from '@/api/notification'
import { adaptNotification } from '@/api/adapters'
import { useAuthStore } from '@/stores/auth'
import { useRealtimeStore } from '@/stores/realtime'
import { encodePacket, decodePacket, Command } from '@/lib/packet-codec'

const MIN_POLL_INTERVAL_MS = 10000
const DEFAULT_POLL_INTERVAL_MS = 20000
const FALLBACK_POLL_INTERVAL_SECONDS = 60

export function useRealtime() {
  const authStore = useAuthStore()
  const realtimeStore = useRealtimeStore()
  const ws = ref<WebSocket | null>(null)
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let pollTimer: ReturnType<typeof setTimeout> | null = null
  let pollInFlightGeneration: number | null = null
  let activePollController: AbortController | null = null
  let generation = 0
  let disposed = false

  const hasToken = computed(() => Boolean(authStore.token))
  const effectivePollInterval = computed(() => Math.max(MIN_POLL_INTERVAL_MS, realtimeStore.pollIntervalSeconds * 1000 || DEFAULT_POLL_INTERVAL_MS))
  const isActiveGeneration = (targetGeneration: number) =>
    !disposed && targetGeneration === generation && hasToken.value

  const stopHeartbeat = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  const stopPolling = () => {
    if (pollTimer) {
      clearTimeout(pollTimer)
      pollTimer = null
    }
  }

  const schedulePolling = (targetGeneration: number) => {
    stopPolling()
    if (!isActiveGeneration(targetGeneration)) return
    pollTimer = setTimeout(() => {
      pollTimer = null
      if (!isActiveGeneration(targetGeneration)) return
      void pollRealtimeStatusForGeneration(targetGeneration)
    }, effectivePollInterval.value)
  }

  const resolveWebSocketUrl = (rawUrl: string | undefined) => {
    const raw = rawUrl?.trim()
    if (!raw) return ''
    try {
      const baseProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const base = `${baseProtocol}//${window.location.host}`
      const url = new URL(raw, base)
      if (window.location.protocol === 'https:' && url.protocol !== 'wss:') return ''
      if (url.protocol !== 'ws:' && url.protocol !== 'wss:') return ''
      return url.toString()
    } catch {
      return ''
    }
  }

  const disconnectWebSocket = () => {
    stopHeartbeat()
    const socket = ws.value
    ws.value = null
    if (socket) {
      socket.close()
    }
    realtimeStore.setConnected(false)
  }

  const connectWebSocket = (targetGeneration: number) => {
    const wsUrl = resolveWebSocketUrl(import.meta.env.VITE_WS_URL)
    if (!isActiveGeneration(targetGeneration) || !realtimeStore.websocketEnabled || !wsUrl || ws.value) return

    const socket = new WebSocket(wsUrl)
    ws.value = socket
    socket.binaryType = 'arraybuffer'

    socket.onopen = () => {
      if (!isActiveGeneration(targetGeneration) || ws.value !== socket) {
        socket.close()
        return
      }
      realtimeStore.setConnected(true)
      socket.send(encodePacket(Command.AUTH_REQ, { token: authStore.token }))
      stopHeartbeat()
      heartbeatTimer = setInterval(() => {
        if (!isActiveGeneration(targetGeneration) || ws.value !== socket) return
        socket.send(encodePacket(Command.PING))
      }, 30000)
    }

    socket.onmessage = (event) => {
      if (!isActiveGeneration(targetGeneration) || ws.value !== socket) return
      if (!(event.data instanceof ArrayBuffer)) return
      const packet = decodePacket(event.data)
      if (packet.cmd === Command.NOTIF_PUSH) {
        realtimeStore.pushNotification(adaptNotification(packet.body))
      } else if (packet.cmd === Command.UNREAD_COUNT) {
        realtimeStore.setUnreadCount(packet.body)
      }
    }

    socket.onclose = () => {
      if (ws.value !== socket) return
      ws.value = null
      stopHeartbeat()
      realtimeStore.setConnected(false)
    }

    socket.onerror = () => {
      if (!isActiveGeneration(targetGeneration) || ws.value !== socket) return
      realtimeStore.setConnected(false)
    }
  }

  const pollRealtimeStatusForGeneration = async (targetGeneration: number) => {
    if (!isActiveGeneration(targetGeneration) || pollInFlightGeneration !== null) return
    const controller = new AbortController()
    activePollController = controller
    pollInFlightGeneration = targetGeneration
    try {
      const res = await notificationApi.getRealtimeStatus({ signal: controller.signal })
      if (!isActiveGeneration(targetGeneration) || controller.signal.aborted) return
      if (res.code === 0 && res.data) {
        realtimeStore.setRealtimeStatus(res.data)
        if (realtimeStore.websocketEnabled) {
          connectWebSocket(targetGeneration)
        } else {
          disconnectWebSocket()
        }
      }
    } catch {
      if (!isActiveGeneration(targetGeneration) || controller.signal.aborted) return
      try {
        const fallback = await notificationApi.getUnreadCount({
          signal: controller.signal,
          skipAuthRedirect: true,
        })
        if (!isActiveGeneration(targetGeneration) || controller.signal.aborted) return
        if (fallback.code === 0 && fallback.data) {
          realtimeStore.setRealtimeStatus({
            unread: fallback.data,
            serverTime: Date.now(),
            pollIntervalSeconds: FALLBACK_POLL_INTERVAL_SECONDS,
            websocketEnabled: false,
          })
        }
      } catch {
        if (isActiveGeneration(targetGeneration) && !controller.signal.aborted) {
          realtimeStore.setConnected(false)
        }
      }
      if (isActiveGeneration(targetGeneration) && !controller.signal.aborted) {
        disconnectWebSocket()
      }
    } finally {
      if (activePollController === controller) {
        activePollController = null
      }
      if (pollInFlightGeneration === targetGeneration) {
        pollInFlightGeneration = null
      }
      if (isActiveGeneration(targetGeneration) && !controller.signal.aborted) {
        schedulePolling(targetGeneration)
      }
    }
  }

  const pollRealtimeStatus = () => {
    return pollRealtimeStatusForGeneration(generation)
  }

  const start = () => {
    if (disposed) return
    if (!hasToken.value) {
      stopPolling()
      disconnectWebSocket()
      realtimeStore.reset()
      return
    }
    void pollRealtimeStatusForGeneration(generation)
  }

  const stop = () => {
    generation += 1
    stopPolling()
    activePollController?.abort()
    activePollController = null
    pollInFlightGeneration = null
    disconnectWebSocket()
  }

  const restart = () => {
    stop()
    start()
  }

  onMounted(restart)
  onUnmounted(() => {
    disposed = true
    stop()
  })

  watch(() => authStore.token, () => {
    restart()
  })

  return {
    connected: realtimeStore.connected,
    unreadCount: realtimeStore.unreadCount,
    lastSyncedAt: realtimeStore.lastSyncedAt,
    pollRealtimeStatus,
  }
}
