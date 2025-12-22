# Monitoring Chat – Tutorial (Windows & Linux)

## 1. Persiapan lingkungan

- Pastikan Node.js minimal versi 18 terpasang.
- Pastikan akses ke database Postgres yang berisi tabel log chat.
- Kloning / copy repository ini ke mesin lokal.

## 2. Konfigurasi environment

1. Duplikasi file `.env.example` menjadi `.env`:

   ```bash
   cp .env.example .env
   ```

   Di Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Edit `.env` dan sesuaikan:

   - `AUTH_USERNAME`, `AUTH_PASSWORD`, `AUTH_SESSION_SECRET`
   - URL Postgres:
     - `DB_URL_AMG_SALES`
     - `DB_URL_AMG_CUSTOMER`
     - `DB_URL_LMP_SALES`
     - `DB_URL_LMP_CUSTOMER`
   - Opsional:
     - `PENDING_THRESHOLD_MINUTES` (default 2)
     - `DEFAULT_DATE_RANGE_DAYS` (default 7)

3. Tabel yang diharapkan (di setiap DB):

- Nama tabel: `n8n_chat_histories`
- Kolom:
     - `id` (serial / bigint, primary key)
     - `session_id` (text)
     - `message` (jsonb) – berisi `type`, `content`, dst.
     - `created_at` (timestamptz) – disimpan dalam waktu lokal Asia/Jakarta (+07).

## 3. Instalasi dependensi

Jalankan dari root project:

```bash
npm install
```

Di Windows PowerShell:

```powershell
npm install
```

## 4. Menjalankan aplikasi

- Mode pengembangan:

  ```bash
  npm run dev
  ```

  Buka `http://localhost:3000/monitorchat/login` di browser.

- Build & production lokal:

  ```bash
  npm run build
  npm start
  ```

## 5. Perilaku multi-DB (1–4 URL terkonfigurasi)

- Jika keempat URL DB terisi:
  - Filter Office: `AMG | LMP | All`
  - Filter Bot: `sales | customer | All`
  - Kombinasi `All` akan menggabungkan data dari keempat DB.

- Jika hanya sebagian URL di-set:
  - Context tanpa URL otomatis disembunyikan dari pilihan filter.
  - Di Dashboard dan Chat Viewer akan muncul catatan admin seperti
    “DB belum terkonfigurasi” untuk context yang kosong.
  - Aplikasi tetap berjalan dengan context yang tersedia saja.

- Jika hanya 1 DB terisi:
  - Filter akan efektif hanya pada office/bot tersebut.
  - Opsi `All` tetap ada, namun secara praktis hanya menarik data dari DB yang aktif.

## 6. Penggunaan dasar

1. Buka `/monitorchat/login`, masukkan `AUTH_USERNAME` dan `AUTH_PASSWORD`.
2. Setelah login:
   - `/monitorchat` menampilkan Dashboard (ringkasan sesi, response time, sesi pending).
   - `/monitorchat/chat` menampilkan Chat Viewer:
     - Sidebar: daftar sesi dengan filter dan pencarian `session_id`.
     - Panel kanan: tampilan chat mirip WhatsApp (human kiri, AI kanan).
3. Gunakan filter Office / Bot / Date range untuk membatasi data.
4. Klik sesi untuk melihat detail percakapan. Gunakan toggle “Raw JSON” untuk debug.

## 7. Troubleshooting dasar

- Tidak bisa login:
  - Pastikan `.env` sudah berisi `AUTH_USERNAME`, `AUTH_PASSWORD`, dan `AUTH_SESSION_SECRET`.
  - Pastikan tidak ada spasi ekstra di nilai environment.

- Dashboard kosong:
  - Cek koneksi ke DB (URL benar, host/port terbuka).
  - Pastikan tabel `n8n_chat_histories` berisi data dalam rentang tanggal terpilih.
  - Pastikan kolom `created_at` diisi dengan timezone Asia/Jakarta (+07).

- Chat Viewer tidak menampilkan pesan:
  - Pastikan ada baris dengan `session_id` yang sama pada tabel `n8n_chat_histories`.
  - Pastikan field `message` berformat JSON dengan `type` dan `content`.

- Sebagian filter Office/Bot hilang:
  - Itu berarti URL DB terkait belum dikonfigurasi. Cek kembali `.env`.

## 8. Catatan index database

Untuk kinerja lebih baik, disarankan menambahkan index (dikelola oleh admin DB):

- Index pada `created_at`
- Index gabungan pada `(session_id, created_at)`
