const { useEffect, useMemo, useState } = React;

const API_PREFIX = window.API_BASE_URL || '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('workhours_token');
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonthDays(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getWeekdayNames() {
  return ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];
}

function buildCalendar(year, month) {
  const days = [];
  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const totalDays = getMonthDays(year, month);

  for (let i = 0; i < offset; i += 1) {
    days.push(null);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    days.push(new Date(year, month, day));
  }

  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function App() {
  const today = new Date();
  const [user, setUser] = useState(null);
  const [authFeedback, setAuthFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [entries, setEntries] = useState([]);
  const [selectedDate, setSelectedDate] = useState(formatDate(today));
  const [rateInput, setRateInput] = useState('0');
  const [dayData, setDayData] = useState({ hours: '', absence: false, absence_note: '', task_note: '' });
  const [saveMessage, setSaveMessage] = useState('');
  const [tooltipDate, setTooltipDate] = useState(null);

  useEffect(() => {
    fetch(`${API_PREFIX}/me`, {
      credentials: 'include',
      headers: getAuthHeaders(),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Brak aktywnej sesji');
        return res.json();
      })
      .then((data) => {
        setUser(data);
        setRateInput(data.hourly_rate.toString());
      })
      .catch(() => {
        localStorage.removeItem('workhours_token');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    loadEntries();
  }, [user, year, month]);

  useEffect(() => {
    if (!user) return;
    const entry = entries.find((item) => item.date === selectedDate);
    setDayData({
      hours: entry?.hours?.toString() || '',
      absence: Boolean(entry?.absence),
      absence_note: entry?.absence_note || '',
      task_note: entry?.task_note || '',
    });
  }, [selectedDate, entries]);

  const monthName = useMemo(() => {
    return new Date(year, month, 1).toLocaleString('pl-PL', { month: 'long', year: 'numeric' });
  }, [month, year]);

  const notes = useMemo(() => {
    return entries
      .flatMap((entry) => {
        const items = [];
        if (entry.absence && entry.absence_note) {
          items.push({ ...entry, type: 'absence', content: entry.absence_note });
        }
        if (entry.task_note) {
          items.push({ ...entry, type: 'task', content: entry.task_note });
        }
        return items;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [entries]);

  const totalHours = useMemo(() => entries.reduce((sum, item) => sum + Number(item.hours || 0), 0), [entries]);
  const predictedPay = useMemo(() => totalHours * Number(user?.hourly_rate || 0), [totalHours, user]);

  function loadEntries() {
    fetch(`${API_PREFIX}/entries?year=${year}&month=${month + 1}`, {
      credentials: 'include',
      headers: getAuthHeaders(),
    })
      .then((res) => res.json())
      .then(setEntries)
      .catch(console.error);
  }

  function handleRegister(event) {
    event.preventDefault();
    const form = event.target;
    const nick = form.nick.value.trim();
    const password = form.password.value;
    setAuthFeedback('');
    fetch(`${API_PREFIX}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ nick, password }),
      credentials: 'include',
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setAuthFeedback(data.message || 'Błąd rejestracji.');
          return;
        }
        if (data.token) {
          localStorage.setItem('workhours_token', data.token);
        }
        setUser(data);
        setRateInput(data.hourly_rate.toString());
      })
      .catch(() => setAuthFeedback('Problem z serwerem.'));
  }

  function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const nick = form.nick.value.trim();
    const password = form.password.value;
    setAuthFeedback('');
    fetch(`${API_PREFIX}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ nick, password }),
      credentials: 'include',
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setAuthFeedback(data.message || 'Błąd logowania.');
          return;
        }
        if (data.token) {
          localStorage.setItem('workhours_token', data.token);
        }
        setUser(data);
        setRateInput(data.hourly_rate.toString());
      })
      .catch(() => setAuthFeedback('Problem z serwerem.'));
  }

  function handleLogout() {
    localStorage.removeItem('workhours_token');
    fetch(`${API_PREFIX}/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(),
    })
      .finally(() => {
        setUser(null);
        setEntries([]);
      });
  }

  function handleRateSave() {
    const hourly_rate = Number(rateInput);
    if (Number.isNaN(hourly_rate) || hourly_rate < 0) return;
    fetch(`${API_PREFIX}/rate`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ hourly_rate }),
    })
      .then((res) => res.json())
      .then((data) => {
        setUser((prev) => ({ ...prev, hourly_rate: data.hourly_rate }));
      });
  }

  function saveDayEntry(overwrite = false) {
    const entry = {
      date: selectedDate,
      hours: Number(dayData.hours) || 0,
      absence: dayData.absence,
      absence_note: dayData.absence ? dayData.absence_note : '',
      task_note: dayData.task_note,
    };
    fetch(`${API_PREFIX}/entry`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(entry),
    })
      .then((res) => res.json())
      .then((updated) => {
        setEntries((prev) => {
          const filtered = prev.filter((item) => item.date !== updated.date);
          return [...filtered, updated];
        });
        setSaveMessage('Zapisano');
        setTimeout(() => setSaveMessage(''), 1800);
      })
      .catch(console.error);
  }

  function handleDeleteEntry() {
    const entry = entries.find((item) => item.date === selectedDate);
    if (!entry) {
      setDayData({ hours: '', absence: false, absence_note: '', task_note: '' });
      return;
    }
    fetch(`${API_PREFIX}/entry/${entry.id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: getAuthHeaders(),
    })
      .then(() => {
        setEntries((prev) => prev.filter((item) => item.id !== entry.id));
        setDayData({ hours: '', absence: false, absence_note: '', task_note: '' });
      })
      .catch(console.error);
  }

  if (loading) {
    return <div className="page"><p>Ładowanie...</p></div>;
  }

  if (!user) {
    return (
      <div className="auth-screen">
        <section className="auth-panel card">
          <h2>Rejestracja</h2>
          <form onSubmit={handleRegister}>
            <div className="field">
              <label>Nick użytkownika</label>
              <input name="nick" type="text" required placeholder="Twój nick" />
            </div>
            <div className="field">
              <label>Hasło</label>
              <input name="password" type="password" required placeholder="Hasło" />
            </div>
            <button className="primary" type="submit">Zarejestruj się</button>
          </form>
        </section>

        <section className="auth-panel card">
          <h2>Logowanie</h2>
          <form onSubmit={handleLogin}>
            <div className="field">
              <label>Nick</label>
              <input name="nick" type="text" required placeholder="Twój nick" />
            </div>
            <div className="field">
              <label>Hasło</label>
              <input name="password" type="password" required placeholder="Hasło" />
            </div>
            <button className="primary" type="submit">Zaloguj się</button>
          </form>
          <p className="login-info">Zarejestruj nowe konto lub zaloguj się, aby zarządzać godzinami pracy i notatkami.</p>
          {authFeedback && <p style={{ color: '#ff7c7c', marginTop: '16px' }}>{authFeedback}</p>}
        </section>
      </div>
    );
  }

  const calendarDays = buildCalendar(year, month);

  return (
    <div className="page app-shell">
      <div className="topbar">
        <div className="card topbar-card">
          <h1>Witaj, {user.nick}</h1>
          <p>Aktualna data: {new Date().toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="card topbar-card rate-card">
          <h3>Stawka godzinowa</h3>
          <div className="rate-input">
            <input
              type="number"
              min="0"
              step="0.1"
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              onBlur={handleRateSave}
            />
            <span>PLN/h</span>
          </div>
          <button className="primary" type="button" onClick={handleRateSave}>Zapisz stawkę</button>
        </div>
        <div className="card topbar-card">
          <h3>Twoje obliczenia</h3>
          <p>Sumaryczne godziny: {totalHours.toFixed(1)}</p>
          <p>Przewidywana wypłata: {predictedPay.toFixed(2)} PLN</p>
          <button className="primary" type="button" onClick={handleLogout}>Wyloguj</button>
        </div>
      </div>

      <div className="calendar-panel">
        <section className="card calendar-card">
          <div className="calendar-header">
            <button type="button" onClick={() => {
              setMonth((prev) => {
                if (prev === 0) {
                  setYear((yearPrev) => yearPrev - 1);
                  return 11;
                }
                return prev - 1;
              });
            }}>&larr; Poprzedni</button>
            <h2>{monthName}</h2>
            <button type="button" onClick={() => {
              setMonth((prev) => {
                if (prev === 11) {
                  setYear((yearPrev) => yearPrev + 1);
                  return 0;
                }
                return prev + 1;
              });
            }}>Następny &rarr;</button>
          </div>
          <div className="day-grid">
            {getWeekdayNames().map((label) => (
              <div key={label} className="day-label">{label}</div>
            ))}
            {calendarDays.map((date, index) => {
              if (!date) return <div key={`${index}-empty`} className="day-cell" style={{ opacity: 0 }} />;

              const iso = formatDate(date);
              const entry = entries.find((item) => item.date === iso);
              const isActive = selectedDate === iso;
              return (
                <div
                  key={iso}
                  className={`day-cell${isActive ? ' active' : ''}`}
                  onClick={() => {
                    setSelectedDate(iso);
                    const dayNotes = notes.filter((n) => n.date === iso);
                    if (dayNotes.length > 0) {
                      setTooltipDate(iso);
                    }
                  }}
                >
                  <div className="day-number">{date.getDate()}</div>
                  <div className="day-content">
                    <div className="hours-row">
                      {entry?.hours > 0 && <span className="badge hour">{entry.hours.toFixed(1)}h</span>}
                      {entry?.absence && <div className="note-bar absence"></div>}
                      {entry?.task_note && <div className="note-bar task"></div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="summary-card card">
            <h3>Podsumowanie miesiąca</h3>
            <div className="summary-line">
              <span>Łącznie godzin</span>
              <strong>{totalHours.toFixed(1)}</strong>
            </div>
            <div className="summary-line">
              <span>Przewidywana wypłata</span>
              <strong>{predictedPay.toFixed(2)} PLN</strong>
            </div>
          </div>
        </section>

        <aside>
          <section className="card day-editor">
            <h3>Edytuj dzień</h3>
            <p style={{ marginBottom: '12px' }}>Wybrana data: <strong>{selectedDate}</strong></p>
            <div className="field">
              <label>Ilość przepracowanych godzin</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={dayData.hours}
                onChange={(e) => setDayData((prev) => ({ ...prev, hours: e.target.value }))}
                onBlur={saveDayEntry}
              />
            </div>
            <div className="field">
              <label className="checkbox-label">
                Oznacz jako nieobecność
                <input
                  type="checkbox"
                  checked={dayData.absence}
                  onChange={(e) => setDayData((prev) => ({ ...prev, absence: e.target.checked }))}
                />
              </label>
            </div>
            {dayData.absence && (
              <div className="field">
                <label>Notatka nieobecności</label>
                <textarea
                  value={dayData.absence_note}
                  onChange={(e) => setDayData((prev) => ({ ...prev, absence_note: e.target.value }))}
                  onBlur={saveDayEntry}
                />
              </div>
            )}
            <div className="field">
              <label>Planowane obowiązki / zadanie</label>
              <textarea
                value={dayData.task_note}
                onChange={(e) => setDayData((prev) => ({ ...prev, task_note: e.target.value }))}
                onBlur={saveDayEntry}
              />
            </div>
            <div className="button-row">
              <button className="save" type="button" onClick={() => saveDayEntry(true)}>Zapisz dzień</button>
              <button className="danger" type="button" onClick={handleDeleteEntry}>Usuń wpis</button>
            </div>
            {saveMessage && <p style={{ marginTop: '14px', color: '#7ef6ff' }}>{saveMessage}</p>}
          </section>

          <section className="card notes-card">
            <h3>Notatki miesiąca</h3>
            {notes.length === 0 && <p style={{ color: 'var(--muted)' }}>Brak aktualnych notatek.</p>}
            {notes.map((note) => (
              <div key={`${note.type}-${note.id}-${note.date}`} className={`note-item ${note.type}`}>
                <h4>
                  <span>{new Date(note.date).toLocaleDateString('pl-PL')}</span>
                  <span className={`note-type ${note.type}`}>{note.type === 'absence' ? 'Nieobecność' : 'Obowiązek'}</span>
                </h4>
                <p>{note.content}</p>
              </div>
            ))}
          </section>
        </aside>
      </div>

      {tooltipDate && (
        <div className="tooltip-modal-overlay" onClick={() => setTooltipDate(null)}>
          <div className="tooltip-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tooltip-modal-header">
              <span>{new Date(tooltipDate).toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              <button type="button" onClick={() => setTooltipDate(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '20px', padding: '0', cursor: 'pointer' }}>×</button>
            </div>
            <div className="tooltip-modal-notes">
              {notes
                .filter((n) => n.date === tooltipDate)
                .map((note) => (
                  <div key={`${note.type}-${note.id}`} className={`tooltip-note ${note.type}`}>
                    <span className="note-label">{note.type === 'absence' ? 'Nieobecność' : 'Obowiązek'}</span>
                    <p>{note.content}</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
