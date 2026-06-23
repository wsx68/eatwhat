import { defineStore } from 'pinia'
import { get } from '../utils/request'
import wsClient from '../utils/websocket'

export const useBubbleStore = defineStore('bubble', {
  state: () => ({
    bubbles: [],
    maxBubbles: 50,
    _bubblePool: [] // 缓存气泡数据用于回收
  }),
  actions: {
    connect() {
      this.fetchInitialBubbles()
      wsClient.connect()
      wsClient.on('bubble_init', (data) => { this.setBubbles(data || []) })
      wsClient.on('bubble_new', (data) => { if (data) this.addBubble(data) })
    },
    disconnect() { wsClient.disconnect() },
    async fetchInitialBubbles() {
      try {
        const data = await get('/checkin/recent')
        if (data && data.length) {
          this._bubblePool = [...data]
          this.setBubbles(data)
        }
      } catch (err) { console.error(err) }
    },
    setBubbles(data) {
      // 只保留最新的、去重的气泡
      const fresh = data.slice(0, this.maxBubbles)
      const existing = new Set(this.bubbles.map(b => b.id))
      const newBubbles = fresh.filter(b => !existing.has(b.id))

      // 新气泡加入，用大尺寸 + 随机位置
      const added = newBubbles.map((item) => ({
        ...item,
        x: 10 + Math.random() * 80,
        size: 90 + Math.random() * 60,   // 90-150px 更大的气泡
        duration: 45 + Math.random() * 25, // 45-70秒
        delay: -(Math.random() * 12)
      }))

      this.bubbles = [...this.bubbles, ...added].slice(-this.maxBubbles)
    },
    addBubble(bubble) {
      if (this.bubbles.some(b => b.id === bubble.id)) return
      this.bubbles.push({
        ...bubble,
        x: 10 + Math.random() * 80,
        size: 95 + Math.random() * 55,
        duration: 45 + Math.random() * 25,
        delay: 0
      })
      if (this.bubbles.length > this.maxBubbles) this.bubbles.shift()
    },
    removeBubble(id) {
      const idx = this.bubbles.findIndex(b => b.id === id)
      if (idx > -1) this.bubbles.splice(idx, 1)
    },
    recycleBubble(id) {
      // 气泡动画结束，从备选池中随机取一个重新生成
      this.removeBubble(id)
      if (this._bubblePool.length) {
        const src = this._bubblePool[Math.floor(Math.random() * this._bubblePool.length)]
        this.bubbles.push({
          ...src,
          x: 10 + Math.random() * 80,
          size: 90 + Math.random() * 60,
          duration: 45 + Math.random() * 25,
          delay: 0,
          id: src.id + '_' + Date.now() // 保证唯一 key
        })
      }
    }
  }
})
