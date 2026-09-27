const { DatabaseSync } = require('node:sqlite');
const { mkdirSync } = require('node:fs');
const path = require('node:path');

function openDatabase(filename) {
  if (filename !== ':memory:') {
    mkdirSync(path.dirname(filename), { recursive: true });
  }
  const db = new DatabaseSync(filename);
  db.exec(`CREATE TABLE IF NOT EXISTS User (
    IdUser INTEGER PRIMARY KEY AUTOINCREMENT,
    UserName VARCHAR(255) NOT NULL UNIQUE CHECK(length(UserName) BETWEEN 1 AND 255),
    Password VARCHAR(255) NOT NULL CHECK(length(Password) <= 255),
    Token VARCHAR(255) CHECK(Token IS NULL OR length(Token) <= 255)
  )`);
  return db;
}

module.exports = { openDatabase };
