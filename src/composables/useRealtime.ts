import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRealtimeStore } from '@/stores/realtime'
import { encodePacket, decodePacket, Command } from '@/lib/packet-codec'

export function useRealtime() {
  const authStore = useAuthStore()
  const realtimeStore = useRealtimeStore()
  const ws = ref<WebSocket | null>(null)
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null

  const connect = () => {
    if (!authStore.token) return

    const wsUrl = import.meta.env.VITE_WS_URL
    ws.value = new WebSocket(wsUrl)

    ws.value.onopen = () => {
      realtimeStore.setConnected(true)
      const packet = encodePacket(Command.AUTH_REQ, { token: authStore.token })
      ws.value?.send(packet)

      heartbeatTimer = setInterval(() => {
        const pingPacket = encodePacket(Command.PING)
        ws.value?.send(pingPacket)
      }, 30000)
    }

    ws.value.onmessage = (event) => {
      const packet = decodePacket(event.data)

      if (packet.cmd === Command.NOTIF_PUSH) {
        realtimeStore.pushNotification(packet.body)
      } else if (packet.cmd === Command.UNREAD_COUNT) {
        realtimeStore.setUnreadCount(packet.body)
      }
    }

    ws.value.onclose = () => {
      realtimeStore.setConnected(false)
      if (heartbeatTimer) clearInterval(heartbeatTimer)
    }

    ws.value.onerror = () => {
      realtimeStore.setConnected(false)
    }
  }

  const disconnect = () => {
    if (ws.value) {
      ws.value.close()
      ws.value = null
    }
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  onMounted(() => {
    connect()
  })

  onUnmounted(() => {
    disconnect()
  })

  return {
    connected: realtimeStore.connected,
    unreadCount: realtimeStore.unreadCount,
  }
}
