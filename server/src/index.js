const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');

const { initWebSocket } = require('./ws');
const userRoutes = require('./routes/user');
const restaurantRoutes = require('./routes/restaurant');
const foodRoutes = require('./routes/food');
const checkinRoutes = require('./routes/checkin');
const uploadRoutes = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件（上传的图片）
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API 路由
app.use('/api/user', userRoutes.router);
app.use('/api/restaurant', restaurantRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/upload', uploadRoutes);

// 根路由
app.get('/', (req, res) => {
  res.json({ name: '吃啥 API', version: '1.0.0', status: 'running' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('❌ 服务器错误:', err.message);
  res.status(500).json({ code: 500, message: '服务器内部错误' });
});

// 创建 HTTP 服务并挂载 WebSocket
const server = http.createServer(app);
initWebSocket(server);

server.listen(PORT, () => {
  console.log(`🍔 吃啥服务已启动: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`📋 API 文档: http://localhost:${PORT}/api`);
});
