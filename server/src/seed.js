const db = require('./db');

console.log('🌱 开始填充种子数据...');

// 获取数据引用
const data = db.getData();

// 清空
data.users = [];
data.restaurants = [];
data.foods = [];
data.checkins = [];
data._counters = { users: 0, restaurants: 0, foods: 0, checkins: 0 };

// ===== 用户 =====
const users = [
  { openid: 'dev_openid_001', nickname: '吃货小王', avatar_url: '' },
  { openid: 'dev_openid_002', nickname: '面食爱好者', avatar_url: '' },
  { openid: 'dev_openid_003', nickname: '干饭达人', avatar_url: '' },
  { openid: 'dev_openid_004', nickname: '奶茶控', avatar_url: '' },
  { openid: 'dev_openid_005', nickname: '麻辣星人', avatar_url: '' },
];
for (const u of users) {
  db.createUser(u);
}
console.log(`✅ 创建了 ${users.length} 个用户`);

// ===== 餐厅 =====
const restaurants = [
  // 商业街
  { name: '杨铭宇黄焖鸡', type: 'commercial', location: '商业街A区' },
  { name: '兰州拉面', type: 'commercial', location: '商业街A区' },
  { name: '正新鸡排', type: 'commercial', location: '商业街B区' },
  { name: '沙县小吃', type: 'commercial', location: '商业街B区' },
  { name: '蜜雪冰城', type: 'commercial', location: '商业街C区' },
  // 食堂档口
  { name: '一食堂-川味档口', type: 'cafeteria', location: '一食堂二楼' },
  { name: '一食堂-面食档口', type: 'cafeteria', location: '一食堂二楼' },
  { name: '二食堂-铁板烧', type: 'cafeteria', location: '二食堂一楼' },
  { name: '二食堂-麻辣烫', type: 'cafeteria', location: '二食堂一楼' },
  { name: '三食堂-煲仔饭', type: 'cafeteria', location: '三食堂一楼' },
];
for (const r of restaurants) {
  const id = db.nextId('restaurants');
  data.restaurants.push({
    id,
    name: r.name,
    type: r.type,
    location: r.location,
    cover_url: '',
    created_at: new Date().toISOString()
  });
}
db.save();
console.log(`✅ 创建了 ${restaurants.length} 家餐厅/档口`);

// ===== 餐品 =====
const foodsList = [
  // 1-杨铭宇黄焖鸡
  [1, '黄焖鸡米饭（小）', 15, '米饭'],
  [1, '黄焖鸡米饭（大）', 20, '米饭'],
  [1, '黄焖排骨饭', 22, '米饭'],
  [1, '黄焖茄子和饭', 13, '米饭'],
  // 2-兰州拉面
  [2, '牛肉拉面', 12, '面食'],
  [2, '牛肉刀削面', 14, '面食'],
  [2, '牛肉炒拉面', 16, '面食'],
  [2, '兰州凉皮', 10, '小吃'],
  [2, '肉夹馍', 8, '小吃'],
  // 3-正新鸡排
  [3, '招牌大鸡排', 12, '小吃'],
  [3, '香辣鸡排', 12, '小吃'],
  [3, '鸡排汉堡', 15, '小吃'],
  [3, '薯条', 8, '小吃'],
  // 4-沙县小吃
  [4, '蒸饺', 8, '小吃'],
  [4, '拌面', 8, '面食'],
  [4, '扁肉馄饨', 10, '小吃'],
  [4, '炒米粉', 12, '面食'],
  // 5-蜜雪冰城
  [5, '柠檬水', 4, '饮品'],
  [5, '珍珠奶茶', 8, '饮品'],
  [5, '草莓摇摇奶昔', 8, '饮品'],
  [5, '冰淇淋', 3, '饮品'],
  // 6-一食堂川味档口
  [6, '麻辣香锅', 18, '米饭'],
  [6, '水煮肉片', 16, '米饭'],
  [6, '宫保鸡丁盖饭', 14, '米饭'],
  [6, '麻婆豆腐盖饭', 12, '米饭'],
  [6, '回锅肉盖饭', 15, '米饭'],
  // 7-一食堂面食档口
  [7, '炸酱面', 12, '面食'],
  [7, '西红柿鸡蛋面', 10, '面食'],
  [7, '油泼面', 13, '面食'],
  [7, '酸汤水饺', 12, '面食'],
  // 8-二食堂铁板烧
  [8, '铁板牛肉饭', 20, '米饭'],
  [8, '铁板鸡肉饭', 16, '米饭'],
  [8, '铁板鱿鱼饭', 22, '米饭'],
  [8, '铁板豆腐饭', 12, '米饭'],
  // 9-二食堂麻辣烫
  [9, '麻辣烫（自选）', 15, '小吃'],
  [9, '麻辣拌', 15, '小吃'],
  [9, '冒菜', 18, '小吃'],
  // 10-三食堂煲仔饭
  [10, '腊味煲仔饭', 18, '米饭'],
  [10, '滑鸡煲仔饭', 16, '米饭'],
  [10, '排骨煲仔饭', 20, '米饭'],
  [10, '牛肉煲仔饭', 22, '米饭'],
];

for (const f of foodsList) {
  const id = db.nextId('foods');
  data.foods.push({
    id,
    restaurant_id: f[0],
    name: f[1],
    price: f[2],
    category: f[3],
    image_url: '',
    rating: 0,
    checkin_count: 0,
    created_at: new Date().toISOString()
  });
}
db.save();
console.log(`✅ 创建了 ${foodsList.length} 道餐品`);

// ===== 模拟打卡 =====
const now = new Date();
const checkinCount = 0;
for (let i = 0; i < 30; i++) {
  const userId = (i % 5) + 1;
  const foodIdx = i % foodsList.length;
  const foodId = foodIdx + 1; // DB auto-increment 从 1 开始，按插入顺序
  const food = foodsList[foodIdx];
  const time = new Date(now - (i * 5 + Math.random() * 30) * 60000);
  const comments = ['', '好吃！', '分量很足', '推荐', '今天又来吃了', '排队有点久'];
  const comment = comments[Math.floor(Math.random() * comments.length)];

  const id = db.nextId('checkins');
  data.checkins.push({
    id,
    user_id: userId,
    food_id: foodId,
    restaurant_id: food[0],
    comment,
    created_at: time.toISOString()
  });
}
db.save();
const checkinsTotal = data.checkins.length;
console.log(`✅ 创建了 ${checkinsTotal} 条打卡记录`);

// 更新打卡次数
for (const c of data.checkins) {
  const food = data.foods.find(f => f.id === c.food_id);
  if (food) food.checkin_count = (food.checkin_count || 0) + 1;
}
db.save();

console.log('🎉 种子数据填充完成！');
console.log('   默认用户 openid: dev_openid_001 ~ dev_openid_005');
console.log('   运行 npm run dev 启动服务');
