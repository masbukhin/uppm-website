# Deploy ke VPS (Docker + auto-deploy dari GitHub)

Alur: `git push origin main` → GitHub Actions menjalankan typecheck + test + build di dalam Docker
→ image dikirim ke GHCR (`ghcr.io/masbukhin/uppm-website`) → Actions SSH ke VPS → `docker compose pull && up -d`.
Tidak perlu login ke VPS untuk setiap update.

## Isi stack

| Service | Image | Keterangan |
|---------|-------|------------|
| `app` | `ghcr.io/masbukhin/uppm-website` | Express: API `/api/*` + frontend hasil build (`dist/`), port 4100 di container |
| `db` | `mysql:8.4` | Data di volume `mysql-data`, tidak dibuka ke internet |

Tabel dibuat otomatis dari `server/schema.sql` saat `app` start. Jika MySQL masih kosong,
snapshot lama di `data/uppm.sqlite` diimpor satu kali.

## 1. Setup VPS (sekali saja)

Di VPS (Ubuntu/Debian):

```bash
curl -fsSL https://raw.githubusercontent.com/masbukhin/uppm-website/main/deploy/setup-vps.sh | bash
# logout lalu login lagi
nano /opt/uppm/.env   # isi APP_ORIGIN, APP_PORT, TURNSTILE_SECRET_KEY
```

Buat SSH key khusus deploy (di komputer lokal):

```bash
ssh-keygen -t ed25519 -f uppm_deploy -N ""
ssh-copy-id -i uppm_deploy.pub USER@VPS_IP
```

## 2. Setting GitHub (sekali saja)

Repo → Settings → Secrets and variables → Actions:

- **Secrets**: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` (isi file `uppm_deploy`), opsional `VPS_PORT`, `VPS_APP_DIR`.
- **Variables**: `VITE_TURNSTILE_SITE_KEY`, `VITE_APP_URL`, opsional `VITE_GEMINI_API_KEY`.

Repo → Settings → Environments → buat environment `production` (bisa ditambah approval manual).

## 3. Deploy

```bash
git push origin main
```

Pantau di tab **Actions**. Deploy gagal otomatis jika typecheck/test/build gagal atau container tidak `healthy`.

## Perintah berguna di VPS

```bash
cd /opt/uppm
docker compose ps
docker compose logs -f app
curl http://127.0.0.1:8080/api/health

# Backup database
docker compose exec db sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction uppm' > backup-$(date +%F).sql
# Restore
docker compose exec -T db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" uppm' < backup-YYYY-MM-DD.sql

# Rollback ke commit tertentu
APP_IMAGE=ghcr.io/masbukhin/uppm-website:<commit-sha> docker compose up -d app
```

## HTTPS

Pasang Caddy/Nginx di depan port `APP_PORT`, contoh Caddy (`/etc/caddy/Caddyfile`):

```
uppm.example.ac.id {
  reverse_proxy 127.0.0.1:8080
}
```

Lalu set `APP_BIND=127.0.0.1` di `.env` agar port 8080 tidak terbuka langsung.

## Jalankan lokal dengan Docker

```bash
cp .env.docker.example .env   # isi password
docker compose up -d --build
# buka http://localhost:8080
```

## Keamanan login (wajib dibaca)

- Login diperiksa di server. Password disimpan sebagai hash `scrypt`, tidak pernah dikirim ke browser.
- Sesi memakai cookie `HttpOnly` yang ditandatangani `SESSION_SECRET`. Mengganti `SESSION_SECRET` = semua user logout.
- Semua `/api/snapshot`, `/api/accounts`, dan `/api/sinta` wajib login. Dosen hanya bisa membaca/mengubah data miliknya sendiri.
  Status persetujuan dan dokumen final (QR) hanya bisa diubah admin.
- Publik tanpa login: `/api/health`, `/api/verify` (cek QR), `/api/auth/*`.
- Saat start, password plaintext lama otomatis di-hash. Akun dengan kredensial demo lama dinonaktifkan.
- Setelah HTTPS aktif, set `COOKIE_SECURE=true` di `.env`.

## Database baru vs pindah data

- **Database kosong**: buka situs, halaman login menampilkan "Setup Admin Awal". Buat admin pertama, lalu buat akun dosen di Panel Admin.
- **Pindah dari TiDB/Vercel atau MySQL lain**:

  ```bash
  mysqldump -h HOST_LAMA -P PORT -u USER -p --single-transaction --no-tablespaces NAMA_DB > lama.sql
  scp lama.sql USER@VPS_IP:/opt/uppm/
  # di VPS:
  cd /opt/uppm && docker compose exec -T db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" uppm' < lama.sql
  docker compose restart app   # password lama otomatis di-hash saat start
  ```

  Setelah itu minta semua user mengganti password lewat menu **Akun Saya**, atau reset dari Panel Admin.

## Versi backup & kembali ke versi sebelumnya

Setiap deploy otomatis membuat backup `pre-deploy` dulu. Setiap backup menyimpan:
- `backups/uppm-<tanggal>-<label>.sql.gz`: seluruh database (data, dokumen final, lampiran)
- `backups/uppm-<tanggal>-<label>.meta`: image aplikasi yang sedang jalan dan revision database

Backup disimpan 30 hari (`KEEP_DAYS`). Untuk backup harian jam 02:30, pasang cron sekali:

```bash
echo "30 2 * * * root /opt/uppm/backup.sh daily >> /var/log/uppm-backup.log 2>&1" | sudo tee /etc/cron.d/uppm-backup
```

Di VPS (`cd /opt/uppm`):

```bash
./backup.sh manual                          # buat backup sekarang
./restore.sh list                           # lihat semua versi
./restore.sh <nama-backup>                  # kembalikan database saja
./restore.sh <nama-backup> --with-app       # kembalikan database + versi aplikasi saat itu
./restore.sh latest --with-app              # versi terakhir sebelum deploy/restore
```

Sebelum restore, kondisi sekarang otomatis disimpan sebagai backup `pre-restore`,
jadi restore yang salah bisa dibatalkan dengan me-restore backup `pre-restore` tersebut.
Push berikutnya ke `main` akan kembali men-deploy versi terbaru.
