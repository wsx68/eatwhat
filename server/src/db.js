/**
 * 轻量级 JSON 文件数据库
 * 数据常驻内存，写操作同步持久化到 JSON 文件
 * MVP 阶段足够，后续可无缝切换到 SQLite/PostgreSQL
 */
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data.json');

// 默认数据结构
const DEFAULT_DATA = {
  users: [],
  restaurants: [],
  foods: [],
  checkins: [],
  _counters: { users: 0, restaurants: 0, foods: 0, checkins: 0 }
};

let data = { ...DEFAULT_DATA };

// 加载数据
function load() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      data = JSON.parse(raw);
      // 确保所有字段存在
      for (const key of Object.keys(DEFAULT_DATA)) {
        if (!data[key]) data[key] = DEFAULT_DATA[key];
      }
    } else {
      data = JSON.parse(JSON.stringify(DEFAULT_DATA));
      save();
    }
  } catch (err) {
    console.error('加载数据库失败:', err.message);
    data = JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
}

// 持久化
function save() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('保存数据库失败:', err.message);
  }
}

// 获取自增 ID
function nextId(table) {
  const key = `_counters.${table}`;
  if (!data._counters) data._counters = {};
  if (!data._counters[table]) data._counters[table] = 0;
  data._counters[table]++;
  save();
  return data._counters[table];
}

// ===== 用户 =====
function findUserByOpenid(openid) {
  return data.users.find(u => u.openid === openid) || null;
}

function findUserById(id) {
  return data.users.find(u => u.id === id) || null;
}

function createUser(userData) {
  const id = nextId('users');
  const user = {
    id,
    openid: userData.openid,
    nickname: userData.nickname || '吃货',
    avatar_url: userData.avatar_url || '',
    created_at: new Date().toISOString()
  };
  data.users.push(user);
  save();
  return user;
}

// ===== 餐厅 =====
function getAllRestaurants() {
  return [...data.restaurants].sort((a, b) => a.id - b.id);
}

function getRestaurantById(id) {
  return data.restaurants.find(r => r.id === id) || null;
}

// ===== 食品 =====
function getFoods({ category, restaurant_id, page = 1, size = 20 } = {}) {
  let list = [...data.foods];

  if (category && category !== '全部') {
    list = list.filter(f => f.category === category);
  }
  if (restaurant_id) {
    list = list.filter(f => f.restaurant_id === parseInt(restaurant_id));
  }

  // 按打卡次数降序排列
  list.sort((a, b) => b.checkin_count - a.checkin_count || b.id - a.id);

  const total = list.length;
  const pageNum = Math.max(1, parseInt(page));
  const pageSize = Math.min(50, Math.max(1, parseInt(size) || 20));
  const offset = (pageNum - 1) * pageSize;
  const paged = list.slice(offset, offset + pageSize);

  return {
    list: paged,
    total,
    page: pageNum,
    size: pageSize,
    hasMore: offset + pageSize < total
  };
}

function getFoodById(id) {
  return data.foods.find(f => f.id === id) || null;
}

function searchFoods(query) {
  const q = query.toLowerCase();
  return data.foods
    .filter(f => {
      const restaurant = getRestaurantById(f.restaurant_id);
      return f.name.toLowerCase().includes(q) ||
        (restaurant && restaurant.name.toLowerCase().includes(q));
    })
    .sort((a, b) => b.checkin_count - a.checkin_count)
    .slice(0, 30);
}

function getCategories() {
  return [...new Set(data.foods.map(f => f.category))].sort();
}

function incrementCheckinCount(foodId) {
  const food = data.foods.find(f => f.id === foodId);
  if (food) {
    food.checkin_count = (food.checkin_count || 0) + 1;
    save();
  }
}

// ===== 打卡 =====
function createCheckin({ user_id, food_id, restaurant_id, comment }) {
  const id = nextId('checkins');
  const checkin = {
    id,
    user_id,
    food_id,
    restaurant_id,
    comment: (comment || '').slice(0, 140),
    created_at: new Date().toISOString()
  };
  data.checkins.push(checkin);
  incrementCheckinCount(food_id);
  save();
  return checkin;
}

function getRecentCheckins(limit = 50, category = '') {
  let list = [...data.checkins]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // 按分类筛选
  if (category && category !== '全部') {
    list = list.filter(c => {
      const food = getFoodById(c.food_id);
      return food && food.category === category;
    });
  }

  return list.slice(0, limit)
    .map(c => {
      const user = findUserById(c.user_id);
      const food = getFoodById(c.food_id);
      const restaurant = getRestaurantById(c.restaurant_id);
      return {
        id: c.id,
        nickname: user ? user.nickname : '未知用户',
        food_name: food ? food.name : '未知餐品',
        restaurant_name: restaurant ? restaurant.name : '未知餐厅',
        food_id: c.food_id,
        category: food ? food.category : '',
        checkin_count: food ? food.checkin_count : 0,
        created_at: c.created_at
      };
    });
}

function getCheckinById(id) {
  return data.checkins.find(c => c.id === id) || null;
}

function getUserCheckins(userId, { page = 1, size = 20 } = {}) {
  const list = data.checkins
    .filter(c => c.user_id === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const total = list.length;
  const pageNum = Math.max(1, parseInt(page));
  const pageSize = Math.min(50, parseInt(size) || 20);
  const offset = (pageNum - 1) * pageSize;

  return {
    list: list.slice(offset, offset + pageSize).map(c => {
      const food = getFoodById(c.food_id);
      const restaurant = getRestaurantById(c.restaurant_id);
      return {
        ...c,
        food_name: food ? food.name : '',
        food_image: food ? food.image_url : '',
        category: food ? food.category : '',
        restaurant_name: restaurant ? restaurant.name : ''
      };
    }),
    total,
    page: pageNum,
    hasMore: offset + pageSize < total
  };
}

// ===== 种子数据专用（直接操作） =====
function getData() { return data; }
function setData(newData) { data = newData; save(); }

// 初始化
load();

module.exports = {
  // 用户
  findUserByOpenid,
  findUserById,
  createUser,
  // 餐厅
  getAllRestaurants,
  getRestaurantById,
  // 食品
  getFoods,
  getFoodById,
  searchFoods,
  getCategories,
  incrementCheckinCount,
  // 打卡
  createCheckin,
  getRecentCheckins,
  getCheckinById,
  getUserCheckins,
  // 底层
  getData,
  setData,
  save,
  nextId
};
