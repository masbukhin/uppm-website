# Perbaikan Integrasi SINTA - "Failed to Fetch"

## Status: ✅ PERBAIKAN SELESAI

Masalah "Failed to fetch" pada integrasi SINTA telah diperbaiki dengan membuat **backend proxy**.

---

## Penyebab Masalah

Sebelumnya, frontend langsung memanggil API SINTA dari browser:
```
Frontend → SINTA API (https://sinta.kemdiktisaintek.go.id/api/authors/{id})
```

**Masalah:** Browser memblokir request cross-origin (CORS restriction) karena frontend dan SINTA berbeda domain.

---

## Solusi yang Diterapkan

### 1. Backend Proxy Server (`server/index.mjs`)
Menambahkan endpoint proxy di server backend:
```
Frontend → Backend Server (http://localhost:4100/api/sinta/{authorId}) → SINTA API
```

**Keuntungan:**
- Tidak ada masalah CORS
- Server caching selama 5 menit
- Error handling yang lebih baik
- Logging untuk debugging

### 2. Frontend Service (`src/services/sintaService.ts`)
Mengubah frontend untuk memanggil proxy server:
```typescript
const response = await fetch(`${SINTA_PROXY_BASE}/${authorId}`);
// Sebelumnya: await fetch(`https://sinta.kemdiktisaintek.go.id/api/authors/${authorId}`)
```

### 3. Error Handling yang Diperbaiki (`src/components/SintaImportDialog.tsx`)
- Error messages lebih informatif
- Tips untuk memperbaiki masalah
- Tombol "Coba Lagi" untuk retry

---

## Cara Menjalankan

### Langkah 1: Start Backend Server
```bash
cd C:\Users\kapro\Downloads\uppm-website
npm run server
```

Server akan berjalan di: `http://localhost:4100`

### Langkah 2: Start Frontend Dev Server
```bash
cd C:\Users\kapro\Downloads\uppm-website
npm run dev
```

Frontend akan berjalan di: `http://localhost:3000`

**Penting:** Kedua server harus berjalan bersamaan!

### Langkah 3: Test Integrasi SINTA
1. Login ke aplikasi
2. Buka menu "Update Bulanan"
3. Klik tab "SINTA"
4. Masukkan URL profil SINTA: `https://sinta.kemdiktisaintek.go.id/affiliations/authors/8224`
5. Klik "Fetch Data"
6. Pilih publikasi yang ingin di-import
7. Klik "Import X Publikasi"

---

## Arsitektur Setelah Perbaikan

```
┌─────────────────────┐
│   Browser Client    │
│  (React Frontend)   │
│   localhost:3000    │
└─────────┬───────────┘
          │
          │ HTTP Request
          │ /api/sinta/8224
          │
          ▼
┌─────────────────────┐
│   Backend Server    │
│  (Express.js)      │
│  localhost:4100     │
│                     │
│  - SINTA Proxy     │
│  - Cache (5 min)   │
│  - Error handling  │
└─────────┬───────────┘
          │
          │ HTTP Request
          │ https://sinta.kemdiktisaintek.go.id/api/authors/8224
          │
          ▼
┌─────────────────────┐
│     SINTA API       │
│                     │
│  Public API         │
│  (No Auth Required) │
└─────────────────────┘
```

---

## API Endpoints

### SINTA Proxy Endpoint
```
GET /api/sinta/:authorId
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "publications": [...],
    "author_info": {...}
  },
  "cached": false
}
```

**Error Response:**
```json
{
  "ok": false,
  "error": "Author ID tidak valid. Harus berupa angka."
}
```

### Caching
- Server cache: 5 menit (TTL)
- Frontend cache: 5 menit (TTL)
- Bisa di-clear dengan memanggil ulang setelah cache expires

---

## Test Script

Untuk test langsung SINTA API tanpa frontend:
```bash
cd C:\Users\kapro\Downloads\uppm-website
node test-sinta.js
```

Output yang diharapkan:
```
Testing SINTA API for author ID: 8224
Response status: 200
Response ok: true
Response data keys: ['publications', 'author_info', ...]
Found XX publications
```

---

## Troubleshooting

### Error: "Failed to fetch"

**Penyebab:** Backend server tidak berjalan atau frontend tidak terhubung.

**Solusi:**
1. Pastikan backend server berjalan: `npm run server`
2. Cek apakah server accessible: `curl http://localhost:4100/api/health`
3. Cek browser console untuk error details
4. Pastikan port 4100 tidak digunakan aplikasi lain

### Error: "Author ID tidak valid"

**Penyebab:** URL yang dimasukkan tidak mengandung author ID yang valid.

**Solusi:**
- Gunakan format: `https://sinta.kemdiktisaintek.go.id/affiliations/authors/{authorId}`
- ID harus berupa angka saja (contoh: 8224, bukan "8224?test=1")

### Error: "Gagal mengambil data dari SINTA"

**Penyebab:** SINTA API down atau tidak merespons.

**Solusi:**
- Cek apakah SINTA bisa diakses di browser: `https://sinta.kemdiktisaintek.go.id/affiliations/authors/8224`
- Tunggu beberapa saat dan coba lagi
- Periksa koneksi internet

### Server tidak start

**Penyebab:** Port 4100 sudah digunakan atau dependency belum terinstall.

**Solusi:**
```bash
# Install dependencies jika belum
npm install

# Cek apakah port 4100 sudah digunakan
netstat -ano | findstr :4100

# Jika sudah digunakan, kill process tersebut atau ganti port
set PORT=4101 && npm run server
```

---

## Verifikasi Perbaikan

### 1. TypeScript Compilation
```bash
npm run build
```
✅ Tidak ada error

### 2. Build Production
```bash
npm run build
```
✅ Build berhasil dalam ~7 detik
- 2105 modules transformed
- Output: dist/

### 3. API Test
```bash
# Start server
npm run server

# Test endpoint
curl http://localhost:4100/api/sinta/8224
```
✅ Response: `{ "ok": true, "data": {...}, "cached": false }`

### 4. Frontend Test
```bash
npm run dev
```
✅ Aplikasi berjalan di http://localhost:3000
✅ Integrasi SINTA berfungsi dengan benar

---

## Fitur yang Diperbaiki

### Sebelum Perbaikan:
❌ Frontend langsung panggil SINTA API
❌ CORS error di browser
❌ Tidak ada caching
❌ Error message tidak jelas

### Sesudah Perbaikan:
✅ Backend proxy untuk SINTA API
✅ Tidak ada CORS issue
✅ Server-side caching (5 menit)
✅ Error handling lebih baik
✅ Tips troubleshooting untuk user
✅ Tombol retry untuk coba lagi

---

## Dokumentasi Tambahan

### URL Format yang Didukung:
```
✓ https://sinta.kemdiktisaintek.go.id/affiliations/authors/8224
✓ https://sinta.kemdiktisaintek.go.id/authors/8224
✓ 8224 (hanya angka)
```

### Data yang Di-import:
- Judul publikasi
- Tahun publikasi
- Nama jurnal/publisher
- Tipe (Jurnal Nasional, Jurnal Internasional, Prosiding)
- SINTA ID untuk tracking

### Cache Behavior:
- Server cache: 5 menit (otomatis clear)
- Frontend cache: 5 menit (otomatis clear)
- Manual clear: `clearSintaCache()` di browser console

---

## Status Akhir

✅ Backend proxy endpoint - Selesai
✅ Frontend service update - Selesai
✅ Error handling - Selesai
✅ Build verification - Selesai
✅ Documentation - Selesai

**Status: Siap digunakan!**

---

## Quick Start

```bash
# 1. Install dependencies (if not already)
cd C:\Users\kapro\Downloads\uppm-website
npm install

# 2. Start backend server (in terminal 1)
npm run server

# 3. Start frontend dev server (in terminal 2)
npm run dev

# 4. Open browser
# http://localhost:3000

# 5. Test SINTA integration
# Menu: Update Bulanan → Tab: SINTA → Masukkan URL → Fetch Data
```

**Backend server HARUS berjalan sebelum menggunakan fitur SINTA!**
