# InkClash

Game gambar-tebak real-time untuk ruang rapat kantor. Satu orang menggambar, yang lain berebut menebak sebelum waktu habis. Semua berjalan di jaringan lokal (LAN), tanpa akun dan tanpa layanan cloud.

- Server: Node.js, Express, Socket.IO, MySQL 8 (opsional saat bermain).
- Klien: React, Vite, Tailwind, Radix UI.
- Bahasa UI: Indonesia.

## Prasyarat

- Node.js 20 atau lebih baru
- pnpm 10 (`corepack enable` lalu `corepack prepare pnpm@10.8.1 --activate`)
- MySQL 8, atau Docker untuk menjalankan MySQL dari `docker-compose.yml`

## Mulai dari nol

```bash
pnpm install
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
pnpm db:up                  # MySQL 8 lewat Docker (lewati jika sudah punya MySQL)
pnpm db:migrate
pnpm db:seed
pnpm dev
```

File `.env` di root dipakai oleh server, migrasi, dan Docker Compose. Jika nilai `DB_USER`, `DB_PASSWORD`, atau `DB_NAME` diubah setelah volume MySQL dibuat, MySQL tidak otomatis mengganti akun/database yang sudah ada; sesuaikan akun di MySQL yang sedang berjalan.

Buka `http://localhost:5173`. Server API berjalan di `http://localhost:3000` dan Vite mem-proxy `/api` serta `/socket.io`.

Ingin mencoba tanpa MySQL? Hasil game tidak akan tersimpan, tetapi permainan tetap berjalan dengan bank kata bawaan:

```bash
# macOS/Linux
DB_DISABLED=1 pnpm dev

# Windows PowerShell
$env:DB_DISABLED=1; pnpm dev
```

## Mode produksi (satu perintah)

```bash
pnpm build
pnpm start
```

Server menyajikan UI hasil build, API, dan Socket.IO dari satu port (default `3000`). Saat start, terminal menampilkan URL lokal, URL LAN, dan QR untuk HP.

Set `NODE_ENV=production` di `.env` agar aset statis di-cache.

## Bermain lewat LAN

1. Jalankan server di satu komputer (`pnpm build && pnpm start`).
2. Pastikan semua perangkat berada di Wi-Fi/VLAN yang sama.
3. Buka URL LAN yang tercetak di terminal, misalnya `http://192.168.1.20:3000`, atau pindai QR.
4. Host menekan **Buat room**, lalu membagikan kode 6 karakter atau tombol **Salin link**.

### Firewall

- **Windows:** saat pertama kali Node meminta akses jaringan, pilih **Allow**. Bila terlewat, buat inbound rule untuk TCP port 3000 (Windows Defender Firewall > Advanced settings > Inbound Rules > New Rule > Port).
- **macOS:** System Settings > Network > Firewall > Options, izinkan `node`. Atau sementara matikan firewall untuk pengujian.
- **Linux (ufw):** `sudo ufw allow 3000/tcp`.

Jika perangkat tidak bisa terhubung padahal satu jaringan, curigai **client isolation** pada Wi-Fi tamu/kantor. Gunakan jaringan yang sama tanpa isolasi, atau sambungkan lewat kabel.

## Menambah kata

Format CSV tanpa header, satu kata per baris: `teks,kategori`.

```csv
kucing,hewan
nasi goreng,makanan-indonesia
```

Kategori yang tersedia: `umum`, `hewan`, `makanan-indonesia`, `film`, `programming`.

```bash
pnpm words:import data-kata.csv
```

Impor menolak baris tidak valid dan kata duplikat, serta menampilkan alasannya. Bank kata dari MySQL dimuat otomatis saat server start; bila MySQL tidak aktif, bank kata bawaan di `apps/server/words/` tetap dipakai.

## Environment variables

| Variabel | Default | Keterangan |
|---|---|---|
| `HOST` | `0.0.0.0` | Alamat bind server |
| `PORT` | `3000` | Port HTTP/Socket.IO |
| `NODE_ENV` | `development` | `production` mengaktifkan cache aset |
| `DB_HOST` | `127.0.0.1` | Host MySQL |
| `DB_PORT` | `3306` | Port MySQL |
| `DB_USER` | `inkclash` | User MySQL |
| `DB_PASSWORD` | `inkclash` | Password MySQL |
| `DB_NAME` | `inkclash` | Nama database |
| `DB_DISABLED` | _(kosong)_ | `1` untuk bermain tanpa MySQL |

Jangan commit `.env`.

## Perintah

| Perintah | Fungsi |
|---|---|
| `pnpm dev` | Build shared, jalankan server dan Vite (hot reload) |
| `pnpm build` | Build shared, server, dan web ke `dist` |
| `pnpm start` | Jalankan server produksi |
| `pnpm lint` | ESLint seluruh workspace |
| `pnpm typecheck` | TypeScript seluruh workspace |
| `pnpm test` | Unit + integration test (Vitest) |
| `pnpm test:contrast` | Verifikasi kontras token tema Siang/Malam |
| `pnpm e2e` | Playwright: classic 3 pemain, tim 2 vs 2, tablet, HP, landing |
| `pnpm db:migrate` | Jalankan migrasi Drizzle |
| `pnpm db:seed` | Isi bank kata awal |
| `pnpm words:import <file>` | Impor kata dari CSV |

E2E memakai `DB_DISABLED=1` dan menjalankan server dari hasil build, jadi jalankan `pnpm build` sebelum `pnpm e2e`.

## Struktur singkat

```
apps/server   Express + Socket.IO + game engine + MySQL
apps/web      React + Vite + Tailwind
packages/shared  Tipe, skema Zod, aturan skor/hint
tests/e2e     Playwright multi-context
```

Halaman `/dev/design` (hanya saat `pnpm dev`) menampilkan semua komponen dasar dalam tema Siang dan Malam.

## Menjalankan sebagai service

Dengan pm2:

```bash
pnpm build
pm2 start "pnpm start" --name inkclash
pm2 save
```

`docker compose up -d mysql` hanya menjalankan database. Jalankan aplikasi dengan `pnpm start` (atau pm2) di host yang sama.

## Troubleshooting

- **"MySQL tidak aktif"**: permainan tetap berjalan, tetapi skor tidak tersimpan. Jalankan `pnpm db:up`, lalu `pnpm db:migrate` dan `pnpm db:seed`, kemudian restart server.
- **Pemain lain tidak bisa membuka URL LAN**: cek firewall, pastikan satu subnet, dan matikan client isolation/VPN.
- **IP server berubah**: minta reservasi DHCP atau set IP statis; URL dan QR selalu ditampilkan saat server start.
- **Room hilang setelah server restart**: room disimpan di memori. Hasil game yang sudah selesai tetap aman di MySQL.
- **Komputer server tidur**: nonaktifkan sleep saat jam kerja atau jalankan sebagai service.
- **Nama sudah dipakai**: setiap room memakai nama unik; gunakan nama lain.
- **Tidak bisa menebak di mode tim**: hanya tim yang sedang menggambar yang boleh menebak; tim lawan melihat banner **Menonton giliran Tim ...**.

## Lisensi

Internal kantor. Tidak untuk distribusi publik.
