const { WebSocketServer } = require('ws');
const db = require('./db');

let wss = null;
const clients = new Set();

/**
 * 初始化 WebSocket 服务
 */
function initWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log(`🔗 WebSocket 客户端已连接 (当前 ${clients.size} 个)`);

    // 发送初始气泡数据
    try {
      const recentCheckins = db.getRecentCheckins(50);
      ws.send(JSON.stringify({
        type: 'bubble_init',
        data: recentCheckins.reverse() // 正序排列
      }));
    } catch (err) {
      console.error('发送初始气泡失败:', err.message);
    }

    // 处理心跳
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (e) {
        // 忽略无效消息
      }
    });

    // 断开
    ws.on('close', () => {
      clients.delete(ws);
      console.log(`🔌 WebSocket 断开 (当前 ${clients.size} 个)`);
    });

    ws.on('error', () => {
      clients.delete(ws);
    });
  });

  // 心跳检测
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        clients.delete(ws);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));

  console.log('✅ WebSocket 已启动 (path: /ws)');
  return wss;
}

/**
 * 广播新气泡
 */
function broadcastBubble(checkinData) {
  if (!wss) return;

  const message = JSON.stringify({
    type: 'bubble_new',
    data: checkinData
  });

  clients.forEach((ws) => {
    if (ws.readyState === 1) {
      try { ws.send(message); } catch (e) { /* 忽略 */ }
    }
  });

  console.log(`📡 广播: ${checkinData.nickname} @ ${checkinData.restaurant_name} → ${checkinData.food_name}`);
}

module.exports = { initWebSocket, broadcastBubble };
