const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'chisha-dev-secret-key-2024';

// 模拟登录（MVP 阶段）
router.post('/login', (req, res) => {
  const { code } = req.body;

  const openid = code || `dev_openid_${uuidv4().slice(0, 8)}`;

  let user = db.findUserByOpenid(openid);

  if (!user) {
    const nicknames = ['吃货小王', '美食探索者', '干饭达人', '面食爱好者', '奶茶控',
      '麻辣星人', '小吃货', '大胃王', '美食家', '饭搭子'];
    const randomName = nicknames[Math.floor(Math.random() * nicknames.length)] + Math.floor(Math.random() * 100);

    user = db.createUser({ openid, nickname: randomName });
  }

  const token = jwt.sign(
    { userId: user.id, openid: user.openid },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({
    code: 0,
    data: {
      token,
      profile: {
        id: user.id,
        nickname: user.nickname,
        avatar_url: user.avatar_url
      }
    },
    message: 'ok'
  });
});

// 获取用户信息
router.get('/profile', authMiddleware, (req, res) => {
  const user = db.findUserById(req.userId);
  if (!user) {
    return res.json({ code: 401, data: null, message: '用户不存在' });
  }
  res.json({
    code: 0,
    data: {
      id: user.id,
      nickname: user.nickname,
      avatar_url: user.avatar_url,
      created_at: user.created_at
    },
    message: 'ok'
  });
});

// JWT 鉴权中间件
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({ code: 401, data: null, message: '未登录' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.openid = decoded.openid;
    next();
  } catch (err) {
    return res.json({ code: 401, data: null, message: 'Token 无效或已过期' });
  }
}

module.exports = { router, authMiddleware };
