const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { TextDecoder } = require('node:util');

function decodePassword(encoded) {
  // Bcrypt nhận tối đa 72 byte, tương ứng 96 ký tự Base64.
  if (typeof encoded !== 'string' || !encoded || encoded.length > 96 || encoded.length % 4 !== 0) {
    return null;
  }

  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.toString('base64') !== encoded || bytes.length > 72) {
    return null;
  }

  try {
    const password = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return password.length ? password : null;
  } catch {
    return null;
  }
}

function createAuthController(users, config) {
  return {
    async login(req, res) {
      // Nhận mật khẩu Base64 từ client và giải mã trước khi so sánh.
      const { userName, password: encoded } = req.body || {};
      const password = decodePassword(encoded);
      if (
        typeof userName !== 'string' ||
        !userName.trim() ||
        userName.length > 255 ||
        password === null
      ) {
        return res
          .status(400)
          .json({
            message:
              'userName và password Base64 UTF-8 hợp lệ là bắt buộc (mật khẩu tối đa 72 byte).',
          });
      }
      const user = users.findByName(userName);
      if (!user) {
        return res.status(401).json({ message: 'Sai tên đăng nhập hoặc mật khẩu.' });
      }

      const isCorrectPassword = await bcrypt.compare(password, user.Password);
      if (!isCorrectPassword) {
        return res.status(401).json({ message: 'Sai tên đăng nhập hoặc mật khẩu.' });
      }

      // Chỉ lưu ID trong JWT để token không vượt quá VARCHAR(255).
      const token = jwt.sign({}, config.secret, {
        algorithm: 'HS256',
        subject: String(user.IdUser),
        expiresIn: config.expiresIn,
      });
      if (token.length > 255) {
        throw new Error('Token vượt quá 255 ký tự.');
      }

      users.saveToken(user.IdUser, token);
      res.set('Cache-Control', 'no-store').json({
        token,
        tokenType: 'Bearer',
        expiresIn: config.expiresIn,
        user: { id: user.IdUser, userName: user.UserName },
      });
    },
    authenticate(req, res) {
      // req.user được gán ở middleware sau khi token hợp lệ.
      res.set('Cache-Control', 'no-store').json({ message: 'Token hợp lệ.', user: req.user });
    },
  };
}

module.exports = { createAuthController };
