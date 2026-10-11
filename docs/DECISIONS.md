# Keputusan Arsitektur

## 2026-10-11 - npm workspaces

Dipilih npm workspaces karena tersedia bersama Node.js 20, mengurangi alat bootstrap, dan cukup untuk tiga workspace proyek.

## 2026-10-11 - Drizzle ORM

Dipilih Drizzle dibanding Prisma karena runtime dan image lebih kecil, migrasi SQL transparan, serta tipe skema tetap dekat dengan SQL MySQL. Skema dan migrasi dibuat pada Fase 1.

## 2026-10-11 - UUID CHAR(36)

Semua entitas domain akan memakai UUID `CHAR(36)`. ID bisa dibuat di aplikasi tanpa round-trip database dan aman dipaparkan pada URL. Overhead indeks diterima untuk skala target tim kecil.

## 2026-10-11 - Tailwind CSS v4

Dipakai melalui plugin resmi Vite. Konfigurasi CSS-first menghapus file konfigurasi tambahan dan mempertahankan build cepat.

## 2026-10-11 - React 19

Memenuhi syarat React 18+ dan memberi runtime React terbaru. API aplikasi tetap memakai pola stabil.

## 2026-10-11 - PDF

PDF akan dirender dengan Playwright di backend pada Fase 5. Hasil HTML server-side konsisten untuk tabel, heading, dan page break; konsekuensinya image API lebih besar.

## 2026-10-11 - Refresh token opaque dan rotasi

Access token memakai JWT berumur pendek dan hanya disimpan di memori browser. Refresh token berupa nilai acak opaque, disimpan sebagai hash SHA-256 di database dan cookie httpOnly. Token dirotasi setiap refresh sehingga sesi bisa dicabut dan kebocoran database tidak langsung menghasilkan credential aktif.

## 2026-10-11 - Penghapusan akun

Akun memakai soft delete agar audit metadata tetap konsisten, tetapi email, nama, dan password langsung dianonimkan. Semua data anak dengan foreign key cascade terhapus, termasuk provider dan dokumen. Email lama dapat didaftarkan kembali.

## 2026-10-11 - Migrasi SQL eksplisit

Schema tetap didefinisikan dengan Drizzle. Migrasi berupa SQL eksplisit dan runner mysql2 berjurnal checksum. Drizzle Kit 0.31.11 dihapus karena keliru meminta versi ORM lebih baru meski 0.45.4 merupakan versi registry terbaru dan membawa advisory transitif pada esbuild. Runner menolak migrasi yang berubah setelah diterapkan.

## 2026-10-11 - Transport provider native

Adapter LLM memakai `fetch`, `AbortSignal`, Web Streams, DNS, dan crypto bawaan Node.js 20. Tidak ada dependency HTTP tambahan. Redirect dimatikan, DNS divalidasi ulang sebelum setiap request, retry hanya untuk error sementara, dan timeout diteruskan melalui AbortSignal.

## 2026-10-11 - Dependensi besar

TanStack Query menangani cache server; Zustand khusus preferensi UI; Drizzle menangani SQL bertipe; CodeMirror dipilih pada Fase 4 karena lebih ringan dari Monaco; Playwright dan docx baru dipasang saat Fase 5 agar fondasi tidak membawa dependensi belum terpakai.
