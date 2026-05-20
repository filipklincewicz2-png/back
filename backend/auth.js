const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secret-work-hours-token';
const TOKEN_EXPIRY = '7d';

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) return reject(err);
      resolve(hash);
    });
  });
}

function comparePassword(password, hash) {
  return new Promise((resolve, reject) => {
    bcrypt.compare(password, hash, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

function createToken(user) {
  return jwt.sign({ id: user.id, nick: user.nick }, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });
}

function getTokenFromRequest(req) {
  const authHeader = req.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return req.cookies?.token || null;
}

function authenticateToken(req, res, next) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ message: 'Brak tokena autoryzacji.' });
  }

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) {
      return res.status(401).json({ message: 'Nieudana autoryzacja.' });
    }
    req.user = payload;
    next();
  });
}

module.exports = {
  hashPassword,
  comparePassword,
  createToken,
  authenticateToken,
};
