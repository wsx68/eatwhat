const express = require('express');
const db = require('../db');
const { authMiddleware } = require('./user');
const { broadcastBubble } = require('../ws');

const router = express.Router();

// 创建打卡
router.post('/', authMiddleware, (req, res) => {
  const { food_id, restaurant_id, comment = '' } = req.body;

  if (!food_id || !restaurant_id) {
    return res.json({ code: 400, data: null, message: '请选择餐品和餐厅' });
  }

  const food = db.getFoodById(parseInt(food_id));
  if (!food) {
    return res.json({ code: 404, data: null, message: '餐品不存在' });
  }

  // 时段防重复：同一用户同一餐品在同一时段只能打卡一次
  const now = new Date();
  const hour = now.getHours();
  let periodStart, periodEnd, periodName;
  if (hour >= 5 && hour < 10) {
    periodStart = new Date(now); periodStart.setHours(5, 0, 0, 0);
    periodEnd = new Date(now); periodEnd.setHours(9, 59, 59, 999);
    periodName = '早上';
  } else if (hour >= 10 && hour < 14) {
    periodStart = new Date(now); periodStart.setHours(10, 0, 0, 0);
    periodEnd = new Date(now); periodEnd.setHours(13, 59, 59, 999);
    periodName = '中午';
  } else {
    if (hour >= 14) {
      periodStart = new Date(now); periodStart.setHours(14, 0, 0, 0);
      periodEnd = new Date(now); periodEnd.setHours(23, 59, 59, 999);
    } else {
      periodStart = new Date(now); periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date(now); periodEnd.setHours(4, 59, 59, 999);
    }
    periodName = '晚上';
  }

  const duplicate = db.getData().checkins.find(c =>
    c.user_id === req.userId &&
    c.food_id === parseInt(food_id) &&
    c.created_at >= periodStart.toISOString() &&
    c.created_at <= periodEnd.toISOString()
  );

  if (duplicate) {
    return res.json({ code: 409, data: null, message: `${periodName}已经打过卡了，换个时段再来吧~` });
  }

  // 创建打卡
  const checkin = db.createCheckin({
    user_id: req.userId,
    food_id: parseInt(food_id),
    restaurant_id: parseInt(restaurant_id),
    comment
  });

  // 获取完整信息用于广播
  const user = db.findUserById(req.userId);
  const restaurant = db.getRestaurantById(parseInt(restaurant_id));
  const bubbleData = {
    id: checkin.id,
    user_id: req.userId,
    nickname: user ? user.nickname : '未知',
    food_name: food.name,
    restaurant_name: restaurant ? restaurant.name : '未知',
    food_id: food.id,
    category: food.category,
    checkin_count: food.checkin_count,
    created_at: checkin.created_at
  };

  // WebSocket 广播
  broadcastBubble(bubbleData);

  res.json({
    code: 0,
    data: bubbleData,
    message: '打卡成功！'
  });
});

// 最近打卡（支持分类筛选）
router.get('/recent', (req, res) => {
  const { category } = req.query;
  const checkins = db.getRecentCheckins(60, category || '');
  res.json({ code: 0, data: checkins, message: 'ok' });
});

// 用户打卡历史
router.get('/history', authMiddleware, (req, res) => {
  const { page = 1, size = 20 } = req.query;
  const result = db.getUserCheckins(req.userId, { page, size });
  res.json({ code: 0, data: result, message: 'ok' });
});

module.exports = router;
