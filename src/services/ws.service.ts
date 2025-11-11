/* eslint-disable @typescript-eslint/no-explicit-any */

export type MessageHandler<T = any> = (data: T) => void

export class WebSocketService {
  private socket: WebSocket | null = null
  private listeners: Set<MessageHandler> = new Set()

  connect(url: string): void {
    if (this.socket) return // already connected

    this.socket = new WebSocket(url)

    this.socket.onopen = () => {
      console.log('[WS] Connected to', url)
    }

    this.socket.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        this.listeners.forEach((cb) => cb(data))
      } catch (err) {
        console.error('[WS] Invalid message', err)
      }
    }

    this.socket.onclose = () => {
      console.log('[WS] Disconnected')
      this.socket = null
    }

    this.socket.onerror = (err) => {
      console.error('[WS] Error:', err)
    }
  }

  subscribe<T = any>(callback: MessageHandler<T>): () => void {
    this.listeners.add(callback as MessageHandler)

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback as MessageHandler)
    }
  }

  // { type: "video", action: "replay", videoid: "67"}

  send(data: unknown): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data))
    } else {
      console.warn('[WS] Tried to send message but socket not open')
    }
  }

  /**
   * Close the connection
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
  }
}

// Export a shared instance for use across the app
export const websocketService = new WebSocketService()
