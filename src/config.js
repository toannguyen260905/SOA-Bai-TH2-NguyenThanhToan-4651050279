const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });

function getConfig() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.startsWith('replace-with-') || Buffer.byteLength(secret) < 32) {
    throw new Error('JWT_SECRET phải là chuỗi ngẫu nhiên ít nhất 32 byte. Xem README.md.');
  }
  const port = Number(process.env.PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT phải là số nguyên từ 1 đến 65535.');
  }
  return {
    port,
    secret,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    dbPath: path.resolve(__dirname, '..', process.env.DB_PATH || 'data/lab2.sqlite'),
  };
}

module.exports = { getConfig };
