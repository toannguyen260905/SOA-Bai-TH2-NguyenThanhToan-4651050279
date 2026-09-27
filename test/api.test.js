const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { openDatabase } = require('../src/db');
const { createApp } = require('../src/app');
const { createUserRepository } = require('../src/repositories/user.repository');

test('Complete login and JWT authentication flow', async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'lab2-test-'));
  const filename = path.join(dir, 'test.sqlite');
  const db = openDatabase(filename);
  const config = { secret: 'test-only-secret-with-at-least-32-bytes', expiresIn: '1h' };
  const users = createUserRepository(db);
  users.create('student', await bcrypt.hash('Student@123', 4));
  const server = createApp(db, config).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const login = (body) =>
    fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  const get = (route, token) =>
    fetch(base + route, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  let token;

  await t.test(
    'login returns compact JWT and persists it without storing plaintext password',
    async () => {
      const response = await login({
        userName: 'student',
        password: Buffer.from('Student@123').toString('base64'),
      });
      assert.equal(response.status, 200);
      const body = await response.json();
      token = body.token;
      assert.ok(token.length <= 255);
      const decoded = jwt.verify(token, config.secret, { algorithms: ['HS256'] });
      assert.equal(decoded.sub, '1');
      assert.equal(decoded.exp - decoded.iat, 3600);
      assert.equal(decoded.password, undefined);
      const saved = users.findByName('student');
      assert.equal(saved.Token, token);
      assert.ok(await bcrypt.compare('Student@123', saved.Password));
      assert.notEqual(saved.Password, 'Student@123');
      assert.equal(body.user.Password, undefined);
    }
  );
  await t.test('valid token accesses auth and Hello World', async () => {
    const response = await get('/auth', token);
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).user, { id: 1, userName: 'student' });
    const hello = await get('/', token);
    assert.equal(hello.status, 200);
    assert.equal(await hello.text(), 'Hello World!');
  });
  await t.test('wrong credentials and SQL injection fail', async () => {
    for (const userName of ['student', 'missing', "student' OR 1=1 --"]) {
      const response = await login({ userName, password: Buffer.from('wrong').toString('base64') });
      assert.equal(response.status, 401);
    }
  });
  await t.test('invalid inputs and malformed JSON return 400', async () => {
    for (const body of [
      {},
      { userName: 3, password: 'YWJj' },
      { userName: 'student', password: '%%%=' },
      { userName: 'student', password: '/w==' },
      { userName: 'student', password: '' },
    ]) {
      assert.equal((await login(body)).status, 400);
    }
    assert.equal(
      (
        await fetch(base, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{bad',
        })
      ).status,
      400
    );
  });
  await t.test(
    'both protected routes reject missing, expired, forged, malformed and wrong-algorithm tokens',
    async () => {
      const sign = (payload, options = {}, secret = config.secret) =>
        jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: '1h', ...options });
      const tokens = [
        undefined,
        'not-a-jwt',
        sign({ sub: '1' }, { expiresIn: -1 }),
        sign({ sub: '1' }, {}, 'another-secret'),
        sign({ sub: '1' }, { algorithm: 'HS384' }),
        sign({ sub: '999' }),
        sign({ sub: 'invalid' }),
        jwt.sign({ sub: '1' }, config.secret),
      ];
      for (const route of ['/', '/auth']) {
        for (const invalid of tokens) assert.equal((await get(route, invalid)).status, 401);
        assert.equal(
          (await fetch(base + route, { headers: { Authorization: `Basic ${token}` } })).status,
          401
        );
      }
    }
  );
  await t.test('unknown route returns 404', async () => {
    assert.equal((await get('/missing')).status, 404);
  });
  await t.test('user and token survive reopening the database', () => {
    const reopened = openDatabase(filename);
    try {
      const saved = createUserRepository(reopened).findByName('student');
      assert.equal(saved.Token, token);
      assert.equal(saved.IdUser, 1);
    } finally {
      reopened.close();
    }
  });
});
