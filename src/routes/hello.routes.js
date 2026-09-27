const { Router } = require('express');

function createHelloRouter(authenticate) {
  const router = Router();
  router.get('/', authenticate, (req, res) => {
    res.type('text').send('Hello World!');
  });
  return router;
}

module.exports = { createHelloRouter };
