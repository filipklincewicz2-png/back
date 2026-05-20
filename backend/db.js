const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'work-hours.sqlite');
const db = new sqlite3.Database(dbPath);

function initDb() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nick TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        hourly_rate REAL NOT NULL DEFAULT 0
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        hours REAL DEFAULT 0,
        absence INTEGER DEFAULT 0,
        absence_note TEXT DEFAULT '',
        task_note TEXT DEFAULT '',
        FOREIGN KEY(user_id) REFERENCES users(id),
        UNIQUE(user_id, date)
      )
    `);
  });
}

function getUserByNick(nick) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE nick = ?', [nick], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function getUserById(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT id, nick, hourly_rate FROM users WHERE id = ?', [id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function createUser(nick, passwordHash) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO users (nick, password_hash) VALUES (?, ?)',
      [nick, passwordHash],
      function (err) {
        if (err) return reject(err);
        resolve({ id: this.lastID, nick, hourly_rate: 0 });
      }
    );
  });
}

function setHourlyRate(userId, hourlyRate) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET hourly_rate = ? WHERE id = ?',
      [hourlyRate, userId],
      function (err) {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

function upsertEntry(userId, date, entry) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO entries (user_id, date, hours, absence, absence_note, task_note)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, date)
       DO UPDATE SET hours = excluded.hours, absence = excluded.absence, absence_note = excluded.absence_note, task_note = excluded.task_note`,
      [userId, date, entry.hours || 0, entry.absence ? 1 : 0, entry.absence_note || '', entry.task_note || ''],
      function (err) {
        if (err) return reject(err);
        db.get('SELECT * FROM entries WHERE user_id = ? AND date = ?', [userId, date], (err2, row) => {
          if (err2) return reject(err2);
          resolve(row);
        });
      }
    );
  });
}

function getEntriesForMonth(userId, year, month) {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM entries WHERE user_id = ? AND date LIKE ? ORDER BY date',
      [userId, `${prefix}%`],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      }
    );
  });
}

function getEntryById(userId, id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM entries WHERE user_id = ? AND id = ?', [userId, id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function deleteEntry(userId, id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM entries WHERE user_id = ? AND id = ?', [userId, id], function (err) {
      if (err) return reject(err);
      resolve();
    });
  });
}

module.exports = {
  db,
  initDb,
  getUserByNick,
  getUserById,
  createUser,
  setHourlyRate,
  upsertEntry,
  getEntriesForMonth,
  getEntryById,
  deleteEntry,
};
