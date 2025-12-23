2025-12-22:
- Tambahan kebutuhan dari user: data pada Chat Viewer harus ter-update hampir realtime.
- Implementasi: Chat Viewer akan menggunakan polling via endpoint `/api/chat` setiap beberapa detik (tanpa WebSocket) untuk memuat pesan sesi terbaru.

2025-12-22 (update):
- Ditemukan error Postgres `could not determine data type of parameter $3` saat melakukan pencarian `session_id` dengan `ILIKE`.
- Penyesuaian: filter pencarian `session_id` sekarang dilakukan di memory (JavaScript) setelah data sesi diambil dari database, sehingga query SQL tetap aman (parameterized) tanpa tipe parameter ambigu.
