function createUserRepository(db) {
  return {
    findByName(name) {
      const sql = 'SELECT * FROM User WHERE UserName = ?';
      return db.prepare(sql).get(name);
    },

    findById(id) {
      const sql = 'SELECT IdUser, UserName FROM User WHERE IdUser = ?';
      return db.prepare(sql).get(id);
    },

    create(name, passwordHash) {
      const sql = 'INSERT INTO User (UserName, Password) VALUES (?, ?)';
      return db.prepare(sql).run(name, passwordHash);
    },

    saveToken(id, token) {
      const sql = 'UPDATE User SET Token = ? WHERE IdUser = ?';
      return db.prepare(sql).run(token, id);
    },
  };
}

module.exports = { createUserRepository };
