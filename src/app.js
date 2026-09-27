const express = require('express');
const { createUserRepository } = require('./repositories/user.repository');
const { createAuthController } = require('./controllers/auth.controller');
const { createAuthMiddleware } = require('./middleware/auth.middleware');
const { createAuthRouter } = require('./routes/auth.routes');
const { createHelloRouter } = require('./routes/hello.routes');

function createApp(db, config) {
  const app = express();
  const users = createUserRepository(db);
  const authenticate = createAuthMiddleware(users, config);
  const authController = createAuthController(users, config);

  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));

  app.use(createAuthRouter(authController, authenticate));
  app.use(createHelloRouter(authenticate));

  app.use((req, res) => {
    res.status(404).json({ message: 'API không tồn tại.' });
  });

  // Middleware xử lý lỗi đặt sau các route.
  app.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ message: 'JSON không hợp lệ.' });
    }
    if (error.status >= 400 && error.status < 500) {
      return res.status(error.status).json({ message: 'Nội dung yêu cầu không hợp lệ.' });
    }

    console.error(error);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  });

  return app;
}

module.exports = { createApp };
