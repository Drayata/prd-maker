# PRDForge

Aplikasi web untuk menyusun dan menghasilkan Product Requirements Document (PRD) dengan bantuan penyedia AI.

## Prasyarat

- Node.js 20 atau lebih baru
- npm
- Docker dan Docker Compose (untuk MySQL atau menjalankan seluruh aplikasi)

## Setup lokal

1. Salin konfigurasi environment:

   ```bash
   cp .env.example .env
   ```

2. Instal dependency:

   ```bash
   npm ci
   ```

3. Buat secret development:

   ```bash
   npm run gen:secrets
   ```

   Salin nilai `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, dan `ENCRYPTION_KEY` dari output ke `.env`.

4. Jalankan MySQL:

   ```bash
   docker compose up -d mysql
   ```

5. Build package bersama, jalankan migrasi, lalu isi data development:

   ```bash
   npm run build -w @prdforge/shared
   npm run db:migrate -w @prdforge/api
   npm run db:seed -w @prdforge/api
   ```

6. Jalankan API dan web:

   ```bash
   npm run dev
   ```

Web tersedia di <http://localhost:5173> dan API di <http://localhost:4000/api/v1>. Akun development hasil seed:

- Email: `demo@prdforge.local`
- Password: nilai `DEMO_PASSWORD` di `.env` (default `demo-prdforge-123`)

## Setup dengan Docker Compose

1. Salin dan isi konfigurasi environment seperti langkah 1–3 di atas.
2. Build dan jalankan seluruh service:

   ```bash
   docker compose up --build
   ```

Migrasi dan seed development berjalan otomatis saat container API dimulai. Buka <http://localhost:5173> setelah seluruh service sehat.

Untuk menghentikan service:

```bash
docker compose down
```

Tambahkan `-v` hanya jika ingin menghapus seluruh data MySQL:

```bash
docker compose down -v
```

## Perintah penting

```bash
npm run build         # build seluruh workspace
npm run lint          # periksa lint
npm run typecheck     # periksa tipe TypeScript
npm test              # jalankan test
npm run format:check  # periksa format
```
