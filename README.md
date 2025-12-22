Internal Monitoring Chat app built with [Next.js](https://nextjs.org) and Postgres.

## Monitoring Chat overview

- Semua halaman internal ada di bawah path `/monitorchat/*`.
- Data bersumber dari tabel Postgres (per office+bot) dengan struktur:
  - `id` (serial / bigint)
  - `session_id` (text)
  - `message` (json / jsonb) – payload chat (human/ai)
  - `created_at` (timestamptz) – waktu lokal Asia/Jakarta (+07)
- Dashboard dan Chat Viewer hanya menggunakan kolom-kolom di atas.

## Environment

Lihat contoh lengkap di `.env.example`. Variabel penting:

- `AUTH_USERNAME`, `AUTH_PASSWORD`, `AUTH_SESSION_SECRET` – login internal dan penandatanganan cookie session.
- `DB_URL_AMG_SALES`, `DB_URL_AMG_CUSTOMER`, `DB_URL_LMP_SALES`, `DB_URL_LMP_CUSTOMER` – URL Postgres untuk masing-masing office dan bot.
- Opsional: `PENDING_THRESHOLD_MINUTES`, `DEFAULT_DATE_RANGE_DAYS`.

Jika salah satu URL DB tidak di-set, context tersebut akan disembunyikan dari filter, dan ada catatan admin di UI.

## Menjalankan secara lokal

1. Salin `.env.example` ke `.env` dan sesuaikan nilainya.
2. Instal dependensi:

   ```bash
   npm install
   ```

3. Jalankan dev server:

   ```bash
   npm run dev
   ```

4. Buka `http://localhost:3000/monitorchat/login` lalu login dengan credential sesuai `.env`.

- `/monitorchat` → Dashboard (ringkasan sesi, response time, sesi pending, kata terbanyak).
- `/monitorchat/chat` → Chat Viewer (daftar sesi + tampilan chat mirip WhatsApp, auto-refresh).

## Database indexes (disarankan)

Untuk performa query yang lebih baik, administrator DB disarankan menambahkan index berikut di tabel log chat:

- Index pada `created_at`
- Index gabungan pada `(session_id, created_at)`
