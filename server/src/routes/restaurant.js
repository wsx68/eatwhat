const express = require('express');
const db = require('../db');

const router = express.Router();

// 获取所有餐厅（按类型分组）
router.get('/list', (req, res) => {
  const restaurants = db.getAllRestaurants();

  const commercial = restaurants.filter(r => r.type === 'commercial');
  const cafeteria = restaurants.filter(r => r.type === 'cafeteria');

  res.json({
    code: 0,
    data: {
      commercial: commercial.map(r => formatRestaurant(r)),
      cafeteria: cafeteria.map(r => formatRestaurant(r))
    },
    message: 'ok'
  });
});

function formatRestaurant(r) {
  const allFoods = db.getData().foods;
  const foodCount = allFoods.filter(f => f.restaurant_id === r.id).length;

  return {
    id: r.id,
    name: r.name,
    type: r.type,
    location: r.location,
    cover_url: r.cover_url || getPlaceholder(r.name),
    food_count: foodCount
  };
}

function getPlaceholder(name) {
  const colors = ['FF6B6B', '4ECDC4', '45B7D1', '96CEB4', 'FFEAA7',
    'DDA0DD', '98D8C8', 'F7DC6F', 'BB8FCE', '85C1E9'];
  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const color = colors[hash % colors.length];
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23${color}' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' font-size='40' text-anchor='middle' dy='.3em' fill='white'%3E${encodeURIComponent(name.slice(0, 2))}%3C/text%3E%3C/svg%3E`;
}

module.exports = router;
