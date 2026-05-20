# Aplikacja Godzin Pracy i Przewidywanej Wypłaty

## Opis
Aplikacja webowa do rejestracji, logowania oraz zarządzania godzinami pracy, nieobecnościami i planowanymi obowiązkami.

## Struktura projektu
- `frontend/` – statyczna część aplikacji (HTML, CSS, JavaScript + React)
- `backend/` – serwer Node.js + Express + SQLite
- `package.json` – konfiguracja zależności i skrypt uruchomienia

## Instalacja
1. Otwórz terminal w katalogu `C:\Users\Szefitek\work-hours-app`
2. Uruchom:
   ```bash
   npm install
   ```

## Uruchomienie lokalne
W folderze projektu uruchom:
```bash
npm start
```

Następnie otwórz w przeglądarce:

- `http://localhost:3000`

## Wdrożenie frontend LH KIWI i backend Render
Ta aplikacja może działać jako:
- frontend statyczny na `LH KIWI` (hosting plików `workhours.bielawa.info`),
- backend Node.js na `Render.com`.

### Co powinieneś mieć
- frontend: pliki `frontend/index.html`, `frontend/app.js`, `frontend/styles.css` na `LH KIWI`
- backend: całą aplikację Node.js (`package.json`, `backend/`, `frontend/` nie jest konieczne na Render, ale może pozostać) na Render

### Krok 1: przygotuj backend na Render
1. Wgraj projekt na Render (nowa usługa typu Web Service).
2. W Render ustaw katalog startowy jako katalog główny projektu.
3. W `package.json` pozostaw skrypt:
   ```bash
   npm start
   ```
4. W ustawieniach Render złóż zmienne środowiskowe:
   - `PORT` – nie jest konieczne, Render ustawi domyślnie.
   - `NODE_ENV=production`
   - `JWT_SECRET` – dowolny silny sekret, np. losowy ciąg znaków.
   - `FRONTEND_URL=https://workhours.bielawa.info`

5. Backend Render musi obsługiwać CORS i nagłówki `Authorization`.

### Krok 2: skonfiguruj frontend LH KIWI
1. W `frontend/index.html` ustaw adres backendu Render:
   ```html
   <script>
     window.API_BASE_URL = 'https://YOUR_RENDER_SERVICE.onrender.com/api';
   </script>
   ```
2. Wgraj pliki:
   - `frontend/index.html`
   - `frontend/app.js`
   - `frontend/styles.css`
   na katalog `bielawa.info` hostowany przez LH KIWI.
3. Upewnij się, że strona otwiera się jako `https://workhours.bielawa.info`.

### Krok 3: działanie aplikacji
- logowanie i rejestracja będą wykonywane do backendu Render,
- dane użytkownika i wpisy będą przechowywane w bazie SQLite na Render,
- po wejściu na `workhours.bielawa.info` możesz logować się z dowolnego urządzenia i zobaczyć wspólne dane.

### Uwagi
- Z `LH KIWI` frontend działa tylko jako statyczny UI.
- Backend na Render musi być publicznie dostępny pod adresem, który wpiszesz w `window.API_BASE_URL`.
- Jeżeli chcesz przetestować lokalnie, ustaw w `window.API_BASE_URL` adres `http://localhost:3000/api`.

## Wdrożenie na serwer i domenę
Aby serwer był dostępny z dowolnego miejsca przez domenę, wykonaj:

1. Skopiuj cały katalog `work-hours-app` na swój serwer.
2. Zainstaluj Node.js (wersja 18+).
3. Uruchom w katalogu projektu:
   ```bash
   npm install
   ```
4. Ustaw zmienne środowiskowe:
   - `PORT` – numer portu, np. `3000`
   - `HOST` – opcjonalnie `0.0.0.0` (domyślnie)
   - `JWT_SECRET` – silny sekret do tokenów JWT
   - `NODE_ENV=production` dla produkcji

5. Uruchom aplikację:
   ```bash
   npm start
   ```

6. Skonfiguruj serwer WWW / reverse proxy (np. Nginx lub Apache) na swojej domenie tak, aby przekazywał ruch do `http://127.0.0.1:3000`.

Przykład prostego konfiguracji Nginx:

```nginx
server {
  listen 80;
  server_name twojadomena.pl www.twojadomena.pl;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

Po poprawnym wdrożeniu aplikacja będzie dostępna pod Twoją domeną z każdego miejsca.

## Funkcje
- rejestracja i logowanie użytkownika
- unikalny nick
- autoryzacja JWT w ciasteczkach
- prywatne dane użytkownika
- miesięczny kalendarz godziny pracy
- automatyczne obliczanie wypłaty
- notatki czerwone (nieobecności) i żółte (obowiązki)
- responsywny, nowoczesny interfejs

## Backend
- `backend/server.js` – główny serwer
- `backend/db.js` – baza danych SQLite
- `backend/auth.js` – autoryzacja i tokeny JWT

## Zmienne środowiskowe
Aby aplikacja działała poprawnie na produkcji, możesz ustawić:
- `PORT` – port serwera
- `HOST` – host nasłuchu, np. `0.0.0.0`
- `JWT_SECRET` – sekret JWT
- `NODE_ENV=production` – włącz tryb produkcyjny

## Uwaga
Jeśli chcesz rozwijać aplikację, możesz dodać nowe kolumny lub endpointy w `backend/db.js` oraz nowe komponenty w `frontend/app.js`.
