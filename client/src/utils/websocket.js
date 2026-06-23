const WS_URL = `ws://${window.location.hostname}:3000/ws`

class WebSocketClient {
  constructor() {
    this.socket = null
    this.listeners = new Map()
    this.reconnectTimer = null
    this.pingTimer = null
    this.isManualClose = false
  }

  connect() {
    if (this.socket && (this.socket.readyState === 0 || this.socket.readyState === 1)) {
      return
    }

    this.isManualClose = false

    try {
      this.socket = new WebSocket(WS_URL)

      this.socket.onopen = () => {
        console.log('🔗 WebSocket 已连接')
        this._startPing()
      }

      this.socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          this._emit(msg.type, msg.data)
        } catch (e) { /* ignore */ }
      }

      this.socket.onclose = () => {
        console.log('🔌 WebSocket 断开')
        this._stopPing()
        if (!this.isManualClose) this._scheduleReconnect()
      }

      this.socket.onerror = () => {
        // Will also trigger onclose
      }
    } catch (e) {
      console.error('WebSocket 连接失败:', e)
    }
  }

  disconnect() {
    this.isManualClose = true
    this._stopPing()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, [])
    this.listeners.get(event).push(callback)
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.set(event, this.listeners.get(event).filter(cb => cb !== callback))
    }
  }

  send(data) {
    if (this.socket && this.socket.readyState === 1) {
      this.socket.send(JSON.stringify(data))
    }
  }

  _emit(event, data) {
    const cbs = this.listeners.get(event)
    if (cbs) cbs.forEach(cb => { try { cb(data) } catch (e) {} })
  }

  _startPing() {
    this._stopPing()
    this.pingTimer = setInterval(() => this.send({ type: 'ping' }), 30000)
  }

  _stopPing() {
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null }
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      console.log('🔄 尝试重连...')
      this.connect()
    }, 3000)
  }
}

export const wsClient = new WebSocketClient()
export default wsClient
