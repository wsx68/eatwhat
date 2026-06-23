const express = require('express');
const db = require('../db');

const router = express.Router();

// 食品列表
router.get('/list', (req, res) => {
  const { category, restaurant_id, page = 1, size = 20 } = req.query;
  const result = db.getFoods({ category, restaurant_id, page, size });

  res.json({
    code: 0,
    data: {
      list: result.list.map(formatFood),
      total: result.total,
      page: result.page,
      size: result.size,
      hasMore: result.hasMore
    },
    message: 'ok'
  });
});

// 食品详情
router.get('/detail/:id', (req, res) => {
  const food = db.getFoodById(parseInt(req.params.id));

  if (!food) {
    return res.json({ code: 404, data: null, message: '餐品不存在' });
  }

  // 该餐品的最近打卡
  const recentCheckins = db.getData().checkins
    .filter(c => c.food_id === food.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10)
    .map(c => {
      const user = db.findUserById(c.user_id);
      return {
        comment: c.comment,
        nickname: user ? user.nickname : '未知',
        created_at: c.created_at
      };
    });

  res.json({
    code: 0,
    data: {
      ...formatFood(food),
      recent_checkins: recentCheckins
    },
    message: 'ok'
  });
});

// 搜索
router.get('/search', (req, res) => {
  const { q } = req.query;
  if (!q || !q.trim()) {
    return res.json({ code: 0, data: [], message: 'ok' });
  }

  const foods = db.searchFoods(q.trim());
  res.json({
    code: 0,
    data: foods.map(formatFood),
    message: 'ok'
  });
});

// 分类列表
router.get('/categories', (req, res) => {
  const categories = db.getCategories();
  res.json({ code: 0, data: categories, message: 'ok' });
});

function formatFood(f) {
  const restaurant = db.getRestaurantById(f.restaurant_id);
  return {
    id: f.id,
    restaurant_id: f.restaurant_id,
    restaurant_name: restaurant ? restaurant.name : '',
    restaurant_type: restaurant ? restaurant.type : '',
    location: restaurant ? restaurant.location : '',
    name: f.name,
    price: f.price,
    image_url: f.image_url || getFoodPlaceholder(f.name),
    category: f.category,
    rating: f.rating || 0,
    checkin_count: f.checkin_count || 0,
    created_at: f.created_at
  };
}

function getFoodPlaceholder(name) {
  const colors = ['FF6B6B', '4ECDC4', '45B7D1', '96CEB4', 'FFEAA7',
    'DDA0DD', '98D8C8', 'F7DC6F', 'BB8FCE', '85C1E9', 'F0B27A', '82E0AA'];
  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const color = colors[hash % colors.length];
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23${color}' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' font-size='60' text-anchor='middle' dy='.3em' fill='white'%3E${encodeURIComponent(name.slice(0, 3))}%3C/text%3E%3C/svg%3E`;
}

module.exports = router;
