import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { notificationApi } from '@/api/notification'
import { useAuthStore } from '@/stores/auth'
import { useRealtimeStore } from '@/stores/realtime'
import { encodePacket, decodePacket, Command } from '@/lib/packet-codec'

const MIN_POLL_INTERVAL_MS = 10000
const DEFAULT_POLL_INTERVAL_MS = 20000

export function useRealtime() {
  const authStore = useAuthStore()
  const realtimeStore = useRealtimeStore()
  const ws = ref<WebSocket | null>(null)
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let pollTimer: ReturnType<typeof setTimeout> | null = null
  let pollInFlight = false

  const hasToken = computed(() => Boolean(authStore.token))
  const effectivePollInterval = computed(() => Math.max(MIN_POLL_INTERVAL_MS, realtimeStore.pollIntervalSeconds * 1000 || DEFAULT_POLL_INTERVAL_MS))

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

  const schedulePolling = () => {
    stopPolling()
    if (!hasToken.value) return
    pollTimer = setTimeout(() => {
      void pollRealtimeStatus()
    }, effectivePollInterval.value)
  }

  const pollRealtimeStatus = async () => {
    if (!hasToken.value || pollInFlight) return
    pollInFlight = true
    try {
      const res = await notificationApi.getRealtimeStatus()
      if (res.code === 0 && res.data) {
        realtimeStore.setRealtimeStatus(res.data)
      }
    } catch {
      realtimeStore.setConnected(false)
    } finally {
      pollInFlight = false
      schedulePolling()
    }
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

  const connectWebSocket = () => {
    const wsUrl = resolveWebSocketUrl(import.meta.env.VITE_WS_URL)
    if (!hasToken.value || !wsUrl || ws.value) return

    ws.value = new WebSocket(wsUrl)
    ws.value.binaryType = 'arraybuffer'

    ws.value.onopen = () => {
      realtimeStore.setConnected(true)
      ws.value?.send(encodePacket(Command.AUTH_REQ, { token: authStore.token }))
      stopHeartbeat()
      heartbeatTimer = setInterval(() => {
        ws.value?.send(encodePacket(Command.PING))
      }, 30000)
    }

    ws.value.onmessage = (event) => {
      if (!(event.data instanceof ArrayBuffer)) return
      const packet = decodePacket(event.data)
      if (packet.cmd === Command.NOTIF_PUSH) {
        realtimeStore.pushNotification(packet.body)
      } else if (packet.cmd === Command.UNREAD_COUNT) {
        realtimeStore.setUnreadCount(packet.body)
      }
    }

    ws.value.onclose = () => {
      realtimeStore.setConnected(false)
      ws.value = null
      stopHeartbeat()
    }

    ws.value.onerror = () => {
      realtimeStore.setConnected(false)
    }
  }

  const disconnectWebSocket = () => {
    stopHeartbeat()
    if (ws.value) {
      ws.value.close()
      ws.value = null
    }
    realtimeStore.setConnected(false)
  }

  const start = () => {
    if (!hasToken.value) {
      stopPolling()
      disconnectWebSocket()
      realtimeStore.reset()
      return
    }
    void pollRealtimeStatus()
    connectWebSocket()
  }

  const stop = () => {
    stopPolling()
    disconnectWebSocket()
  }

  onMounted(start)
  onUnmounted(stop)

  watch(() => authStore.token, () => {
    stop()
    start()
  })

  return {
    connected: realtimeStore.connected,
    unreadCount: realtimeStore.unreadCount,
    lastSyncedAt: realtimeStore.lastSyncedAt,
    pollRealtimeStatus,
  }
}
