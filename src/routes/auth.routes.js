const { Router } = require('express');

function createAuthRouter(controller, authenticate) {
  const router = Router();
  router.post('/', controller.login);
  router.get('/auth', authenticate, controller.authenticate);
  return router;
}

module.exports = { createAuthRouter };
