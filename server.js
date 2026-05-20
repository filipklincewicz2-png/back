const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { initDb, getUserByNick, createUser, getUserById, setHourlyRate, upsertEntry, getEntriesForMonth, getEntryById, deleteEntry } = require('./db');
const { hashPassword, comparePassword, createToken, authenticateToken } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://bielawa.info';
const frontendPath = path.join(__dirname, '..', 'frontend');

const corsOptions = {
  origin: FRONTEND_URL,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(frontendPath));

const sendTokenCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dni
  });
};

app.post('/api/register', async (req, res) => {
  const { nick, password } = req.body;
  if (!nick || !password) {
    return res.status(400).json({ message: 'Nick i hasło są wymagane.' });
  }

  const existing = await getUserByNick(nick).catch(() => null);
  if (existing) {
    return res.status(409).json({ message: 'Nick jest już zajęty.' });
  }

  const passwordHash = await hashPassword(password);
  const user = await createUser(nick, passwordHash);
  const token = createToken(user);
  sendTokenCookie(res, token);
  res.json({ token, id: user.id, nick: user.nick, hourly_rate: user.hourly_rate });
});

app.post('/api/login', async (req, res) => {
  const { nick, password } = req.body;
  if (!nick || !password) {
    return res.status(400).json({ message: 'Nick i hasło są wymagane.' });
  }

  const user = await getUserByNick(nick);
  if (!user) {
    return res.status(401).json({ message: 'Nieprawidłowy nick lub hasło.' });
  }

  const isValid = await comparePassword(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ message: 'Nieprawidłowy nick lub hasło.' });
  }

  const token = createToken(user);
  sendTokenCookie(res, token);
  res.json({ token, id: user.id, nick: user.nick, hourly_rate: user.hourly_rate });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Wylogowano pomyślnie.' });
});

app.get('/api/me', authenticateToken, async (req, res) => {
  const user = await getUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'Użytkownik nie znaleziony.' });
  }
  res.json(user);
});

app.patch('/api/rate', authenticateToken, async (req, res) => {
  const { hourly_rate } = req.body;
  if (typeof hourly_rate !== 'number' || hourly_rate < 0) {
    return res.status(400).json({ message: 'Nieprawidłowa stawka godzinowa.' });
  }
  await setHourlyRate(req.user.id, hourly_rate);
  res.json({ hourly_rate });
});

app.get('/api/entries', authenticateToken, async (req, res) => {
  const year = Number(req.query.year);
  const month = Number(req.query.month);
  if (!year || month < 1 || month > 12) {
    return res.status(400).json({ message: 'Nieprawidłowy rok lub miesiąc.' });
  }
  const entries = await getEntriesForMonth(req.user.id, year, month);
  res.json(entries);
});

app.post('/api/entry', authenticateToken, async (req, res) => {
  const { date, hours, absence, absence_note, task_note } = req.body;
  if (!date) {
    return res.status(400).json({ message: 'Data jest wymagana.' });
  }

  const parsedHours = Number(hours || 0);
  const record = await upsertEntry(req.user.id, date, {
    hours: Number.isFinite(parsedHours) ? parsedHours : 0,
    absence: Boolean(absence),
    absence_note: absence_note || '',
    task_note: task_note || '',
  });

  res.json(record);
});

app.delete('/api/entry/:id', authenticateToken, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ message: 'Nieprawidłowy identyfikator wpisu.' });
  }
  const entry = await getEntryById(req.user.id, id);
  if (!entry) {
    return res.status(404).json({ message: 'Wpis nie znaleziony.' });
  }
  await deleteEntry(req.user.id, id);
  res.json({ message: 'Wpis usunięty.' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

initDb();

app.listen(PORT, HOST, () => {
  console.log(`Serwer działa na http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`Dostępny na wszystkich interfejsach pod portem ${PORT}`);
});
