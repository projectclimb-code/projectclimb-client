type MessageCallback = (data: any) => void

interface SocketConnection {
  socket: WebSocket
  listeners: Set<MessageCallback>
}

interface SessionCallbacks {
  onHolds?: (holds: any[]) => void
  onPose?: (landmarks: any[]) => void
}

export class WebSocketService {
  private sockets: Map<string, SocketConnection>
  private sessionReconnectAttempts: Map<string, number>
  private sessionReconnectTimeouts: Map<string, number>
  private sessionUrls: Map<string, string> // Store URLs for reconnection
  private readonly MAX_RECONNECT_ATTEMPTS = 5

  constructor() {
    this.sockets = new Map()
    this.sessionReconnectAttempts = new Map()
    this.sessionReconnectTimeouts = new Map()
    this.sessionUrls = new Map()
  }

  connect(url: string, connectionId: string = 'default'): void {
    if (this.sockets.has(connectionId)) return

    // Store URL for reconnection
    this.sessionUrls.set(connectionId, url)

    const socket = new WebSocket(url)
    const listeners = new Set<MessageCallback>()

    socket.onopen = () => {
      console.log(`[WS:${connectionId}] Connected to`, url)
      // Reset reconnect attempts on successful connection
      this.sessionReconnectAttempts.set(connectionId, 0)
    }

    socket.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        listeners.forEach((cb) => cb(data))
      } catch (err) {
        console.error(`[WS:${connectionId}] Invalid message`, err)
      }
    }

    socket.onclose = (event: CloseEvent) => {
      console.log(`[WS:${connectionId}] Disconnected`, event.code, event.reason)
      this.sockets.delete(connectionId)
      
      // Only attempt reconnection for session connections if it was an unexpected close
      if (connectionId === 'session' && event.code !== 1000 && event.code !== 1001) {
        const storedUrl = this.sessionUrls.get(connectionId)
        if (storedUrl) {
          this.attemptSessionReconnect(storedUrl, connectionId)
        }
      }
    }

    socket.onerror = (err) => {
      console.error(`[WS:${connectionId}] Error:`, err)
    }

    this.sockets.set(connectionId, { socket, listeners })
  }

  subscribe(callback: MessageCallback, connectionId = 'default') {
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

  send(data: unknown, connectionId = 'default') {
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
      // Clear any reconnect timeouts
      const timeout = this.sessionReconnectTimeouts.get(connectionId)
      if (timeout) {
        clearTimeout(timeout)
        this.sessionReconnectTimeouts.delete(connectionId)
      }
      connection.socket.close()
      this.sockets.delete(connectionId)
      this.sessionReconnectAttempts.delete(connectionId)
      this.sessionUrls.delete(connectionId)
    }
  }

  disconnectAll() {
    this.sockets.forEach((connection, connectionId) => {
      const timeout = this.sessionReconnectTimeouts.get(connectionId)
      if (timeout) {
        clearTimeout(timeout)
      }
      connection.socket.close()
    })
    this.sockets.clear()
    this.sessionReconnectAttempts.clear()
    this.sessionReconnectTimeouts.clear()
  }

  // Session-specific methods
  connectSession(callbacks: SessionCallbacks): () => void {
    const connectionId = 'session'
    const wsUrl = 'wss://climber.dev.maptnh.net/ws/holds/'

    // Clear any existing reconnect timeout
    const existingTimeout = this.sessionReconnectTimeouts.get(connectionId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
      this.sessionReconnectTimeouts.delete(connectionId)
    }

    this.sessionReconnectAttempts.set(connectionId, 0)

    // Connect to WebSocket
    this.connect(wsUrl, connectionId)

    // Subscribe to messages and handle session data
    const unsubscribe = this.subscribe((data: any) => {
      // Handle session holds data
      if (data?.session?.holds && callbacks.onHolds) {
        callbacks.onHolds(data.session.holds)
      }

      // Handle pose data
      let landmarks: any[] | null = null
      if (data?.pose && Array.isArray(data.pose)) {
        landmarks = data.pose
      } else if (Array.isArray(data)) {
        landmarks = data
      } else if (data?.landmarks) {
        landmarks = Array.isArray(data.landmarks) ? data.landmarks : null
      } else if (data?.pose_landmarks) {
        landmarks = Array.isArray(data.pose_landmarks) ? data.pose_landmarks : null
      }

      if (landmarks && landmarks.length > 0 && callbacks.onPose) {
        callbacks.onPose(landmarks)
      }
    }, connectionId)

    // Return unsubscribe function
    return () => {
      unsubscribe()
      this.disconnect(connectionId)
    }
  }

  private attemptSessionReconnect(url: string, connectionId: string) {
    const attempts = this.sessionReconnectAttempts.get(connectionId) || 0
    
    if (attempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error(`[WS:${connectionId}] Max reconnection attempts reached. Stopping reconnects.`)
      return
    }

    // Clear any existing reconnect timeout
    const existingTimeout = this.sessionReconnectTimeouts.get(connectionId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    const newAttempts = attempts + 1
    this.sessionReconnectAttempts.set(connectionId, newAttempts)
    const delay = Math.min(2000 * newAttempts, 10000) // Exponential backoff, max 10s

    console.log(`[WS:${connectionId}] Reconnecting attempt ${newAttempts}/${this.MAX_RECONNECT_ATTEMPTS} in ${delay}ms`)

    const timeout = window.setTimeout(() => {
      this.sessionReconnectTimeouts.delete(connectionId)
      try {
        this.connect(url, connectionId)
        // Reset attempts on successful connection (handled in onopen)
      } catch (error) {
        console.error(`[WS:${connectionId}] Reconnection failed:`, error)
      }
    }, delay)

    this.sessionReconnectTimeouts.set(connectionId, timeout)
  }

  sendSessionAction(action: 'restart' | 'relay' | 'pause') {
    this.send({
      type: 'action',
      action: action
    }, 'session')
  }

  sendPreview(route: any) {
    this.send({
      type: 'preview',
      route: route
    }, 'default')
  }
}

export const websocketService = new WebSocketService()
