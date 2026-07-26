import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { notificationApi } from '@/api/notification'
import { adaptNotification } from '@/api/adapters'
import { useAuthStore } from '@/stores/auth'
import { useRealtimeStore } from '@/stores/realtime'
import { encodePacket, decodePacket, Command } from '@/lib/packet-codec'

const MIN_POLL_INTERVAL_MS = 10000
const DEFAULT_POLL_INTERVAL_MS = 20000
const FALLBACK_POLL_INTERVAL_SECONDS = 60
const AUTH_TIMEOUT_MS = 10000
const POLL_ONLY_RECONNECT_CLOSE_CODES = new Set([4001, 4002, 4003])

export function useRealtime() {
  const authStore = useAuthStore()
  const realtimeStore = useRealtimeStore()
  const ws = ref<WebSocket | null>(null)
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let authTimer: ReturnType<typeof setTimeout> | null = null
  let pollTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempts = 0
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

  const stopAuthTimer = () => {
    if (authTimer) {
      clearTimeout(authTimer)
      authTimer = null
    }
  }

  const stopPolling = () => {
    if (pollTimer) {
      clearTimeout(pollTimer)
      pollTimer = null
    }
  }

  const stopReconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  // WebSocket 断开后按指数退避重连（1s→2s→…→最大 30s），避免断线后要等下一轮轮询才恢复，也避免服务异常时高频重连。
  const scheduleReconnect = (targetGeneration: number) => {
    stopReconnect()
    if (!isActiveGeneration(targetGeneration) || !realtimeStore.websocketEnabled) return
    const delay = Math.min(30000, 1000 * 2 ** reconnectAttempts)
    reconnectAttempts += 1
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      if (!isActiveGeneration(targetGeneration) || !realtimeStore.websocketEnabled || ws.value) return
      connectWebSocket(targetGeneration)
    }, delay)
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
    // 主动断开：取消挂起的重连并重置退避，避免断开后又被重连拉起。
    stopReconnect()
    reconnectAttempts = 0
    stopAuthTimer()
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

    // 轮询可能在退避计时期间确认服务已恢复；新连接接管后应取消旧计时器。
    stopReconnect()
    const socket = new WebSocket(wsUrl)
    ws.value = socket
    socket.binaryType = 'arraybuffer'

    socket.onopen = () => {
      if (!isActiveGeneration(targetGeneration) || ws.value !== socket) {
        socket.close()
        return
      }
      // TCP open 只代表链路建立；收到成功的 AUTH_RESP 后才算可用连接。
      realtimeStore.setConnected(false)
      socket.send(encodePacket(Command.AUTH_REQ, { token: authStore.token }))
      stopAuthTimer()
      authTimer = setTimeout(() => {
        authTimer = null
        if (isActiveGeneration(targetGeneration) && ws.value === socket) {
          socket.close(4001, 'Authentication timeout')
        }
      }, AUTH_TIMEOUT_MS)
    }

    socket.onmessage = (event) => {
      if (!isActiveGeneration(targetGeneration) || ws.value !== socket) return
      if (!(event.data instanceof ArrayBuffer)) return
      let packet
      try {
        packet = decodePacket(event.data)
      } catch {
        socket.close(4002, 'Invalid packet')
        return
      }
      if (packet.cmd === Command.AUTH_RESP) {
        const accepted = packet.body === true
          || packet.body?.success === true
          || packet.body?.authenticated === true
          || packet.body?.ok === true
          || packet.body?.code === 0
        if (!accepted) {
          socket.close(4003, 'Authentication rejected')
          return
        }
        stopAuthTimer()
        reconnectAttempts = 0
        realtimeStore.setConnected(true)
        stopHeartbeat()
        heartbeatTimer = setInterval(() => {
          if (!isActiveGeneration(targetGeneration) || ws.value !== socket) return
          socket.send(encodePacket(Command.PING))
        }, 30000)
        return
      }
      if (!realtimeStore.connected) return
      if (packet.cmd === Command.NOTIF_PUSH) {
        realtimeStore.pushNotification(adaptNotification(packet.body))
      } else if (packet.cmd === Command.UNREAD_COUNT) {
        realtimeStore.setUnreadCount(packet.body)
      }
    }

    socket.onclose = (event) => {
      if (ws.value !== socket) return
      ws.value = null
      stopAuthTimer()
      stopHeartbeat()
      realtimeStore.setConnected(false)
      // 鉴权超时、协议错误和鉴权拒绝使用下一轮状态轮询再尝试。
      // 立即退避重连只会用同一份凭据重复失败。
      if (POLL_ONLY_RECONNECT_CLOSE_CODES.has(event.code)) {
        stopReconnect()
        return
      }
      // 非主动断开且 WebSocket 仍启用时，按退避重连，不必等下一轮轮询。
      scheduleReconnect(targetGeneration)
    }

    socket.onerror = () => {
      if (!isActiveGeneration(targetGeneration) || ws.value !== socket) return
      realtimeStore.setConnected(false)
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close()
      }
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
    realtimeStore.reset()
    start()
  }

  onMounted(restart)
  onUnmounted(() => {
    disposed = true
    stop()
  })

  watch([() => authStore.token, () => authStore.sessionQueryScope], () => {
    restart()
  })

  return {
    connected: realtimeStore.connected,
    unreadCount: realtimeStore.unreadCount,
    lastSyncedAt: realtimeStore.lastSyncedAt,
    pollRealtimeStatus,
  }
}
