type MessageCallback = (data: any) => void

interface SocketConnection {
  socket: WebSocket
  listeners: Set<MessageCallback>
}

export class WebSocketService {
  private sockets: Map<string, SocketConnection>

  constructor() {
    this.sockets = new Map()
  }

  connect(url: string, connectionId: string = 'default'): void {
    if (this.sockets.has(connectionId)) return

    const socket = new WebSocket(url)
    const listeners = new Set<MessageCallback>()

    socket.onopen = () => {
      console.log(`[WS:${connectionId}] Connected to`, url)
    }

    socket.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        listeners.forEach((cb) => cb(data))
      } catch (err) {
        console.error(`[WS:${connectionId}] Invalid message`, err)
      }
    }

    socket.onclose = () => {
      console.log(`[WS:${connectionId}] Disconnected`)
      this.sockets.delete(connectionId)
    }

    socket.onerror = (err) => {
      console.error(`[WS:${connectionId}] Error:`, err)
    }

    this.sockets.set(connectionId, { socket, listeners })
  }

  subscribe(callback, connectionId = 'default') {
    const connection = this.sockets.get(connectionId)
    if (!connection) {
      console.warn(`[WS] Connection ${connectionId} not found`)
      return () => {}
    }

    connection.listeners.add(callback)

    return () => {
      connection.listeners.delete(callback)
    }
  }

  send(data, connectionId = 'default') {
    const connection = this.sockets.get(connectionId)
    if (connection?.socket?.readyState === WebSocket.OPEN) {
      connection.socket.send(JSON.stringify(data))
    } else {
      console.warn(`[WS:${connectionId}] Tried to send message but socket not open`)
    }
  }

  disconnect(connectionId = 'default') {
    const connection = this.sockets.get(connectionId)
    if (connection) {
      connection.socket.close()
      this.sockets.delete(connectionId)
    }
  }

  disconnectAll() {
    this.sockets.forEach((connection) => connection.socket.close())
    this.sockets.clear()
  }
}

export const websocketService = new WebSocketService()
