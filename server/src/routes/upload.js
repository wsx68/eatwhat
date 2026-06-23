const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('./user');

const router = express.Router();

// 配置 multer
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型，请上传 JPG/PNG/GIF/WEBP 图片'));
    }
  }
});

// 上传图片
router.post('/', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.json({ code: 400, data: null, message: '请选择图片文件' });
  }

  const url = `/uploads/${req.file.filename}`;

  res.json({
    code: 0,
    data: { url, filename: req.file.filename },
    message: '上传成功'
  });
});

module.exports = router;
