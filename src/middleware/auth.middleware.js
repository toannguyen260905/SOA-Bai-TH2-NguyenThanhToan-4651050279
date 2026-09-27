const jwt = require('jsonwebtoken');

function createAuthMiddleware(users, config) {
  return (req, res, next) => {
    // Header cần có dạng: Authorization: Bearer <token>.
    const match = /^Bearer ([^\s]+)$/i.exec(req.get('Authorization') || '');
    if (!match) {
      return res.status(401).json({ message: 'Thiếu hoặc sai định dạng Bearer token.' });
    }

    const token = match[1];
    let payload;
    try {
      payload = jwt.verify(token, config.secret, { algorithms: ['HS256'] });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token đã hết hạn.' });
      }
      return res.status(401).json({ message: 'Token không hợp lệ.' });
    }

    if (
      typeof payload !== 'object' ||
      !/^\d+$/.test(payload.sub || '') ||
      !Number.isInteger(payload.exp)
    ) {
      return res.status(401).json({ message: 'Token không hợp lệ.' });
    }
    const id = Number(payload.sub);
    if (!Number.isSafeInteger(id)) {
      return res.status(401).json({ message: 'Token không hợp lệ.' });
    }

    const user = users.findById(id);
    if (!user) {
      return res.status(401).json({ message: 'Người dùng không tồn tại.' });
    }

    req.user = { id: user.IdUser, userName: user.UserName };
    next();
  };
}

module.exports = { createAuthMiddleware };
