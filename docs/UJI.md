# Pengujian

## Pemeriksaan branch 10 November 2026

Perbaikan karakter memakai dua lembar sprite yang sudah berada di arsip repository. Build dan empat pengujian server lulus pada Node.js 24.22.1. Renderer diuji terpisah dengan Skia Canvas sementara pada 825 kasus, termasuk seluruh frame berjalan dan berlari, setiap pose aksi, pencerminan arah, dan pilihan kustomisasi yang tersedia. Dua sprite hasil ekstraksi cocok byte demi byte dengan arsip.

Pengujian Chromium belum berjalan pada lingkungan ini. Chromium berhenti saat membuat socket profil, sedangkan unduhan Headless Shell gagal. Pengujian visual otomatis baru ditambahkan ke `tests/browser.test.mjs` dan masih harus dijalankan pada runtime browser yang berfungsi. Hasil Skia belum membuktikan gameplay di browser atau kontrol iPhone. Runner lokal membutuhkan penanganan sementara untuk `os.networkInterfaces()` yang dibatasi lingkungan, di luar berkas produksi dan pengujian repository.

Sprite ilustrasi tersedia untuk penampilan bawaan. Kustomisasi masih memakai rig modular dari arsip proyek. Frame ekspresi khusus berpikir dan salah belum tersedia. Tinjauan visual pemilik tetap diperlukan.

Perbaikan jembatan memulihkan papan dua bagian yang terlihat saat turun dan terangkat mengikuti meter server. Tuas dapat dioperasikan sebelum trivia pertama. Kedua pemain harus menahan tuas dan mengunci dari sisi berbeda. Jika koneksi terputus saat menyeberang, pemain kembali ke tepi yang aman. Jembatan yang telah terkunci dipertahankan saat pemulihan checkpoint.

Enam pengujian server lulus dalam 17,1 detik setelah perbaikan jembatan. Pengujian tambahan memakai dua koneksi WebSocket independen untuk memeriksa progres pengangkatan, penyeberangan, putus koneksi, sambung ulang, penguncian, dan penyeberangan pemain penahan tuas. Simulasi dunia menuntaskan seluruh 24 area, enam pulau dalam urutan yang diminta, 60 soal unik, serta pembagian giliran 30–30.

## Cara mengulang

Siapkan Node.js 22 atau lebih baru. Dari folder proyek jalankan:

```sh
npm ci
npm run build
npm test
npx playwright install chromium
npm run test:browser
```

Pengujian browser standar memainkan seluruh Sumatra melalui dua sesi independen. Developer dapat menetapkan `NUSANTARA_FULL_BROWSER=1` untuk menjalankan alur sampai penutup Bali. `NUSANTARA_CHROMIUM` dapat menunjuk ke biner Chromium yang sudah tersedia. Wrangler memulai server uji lokal dengan penyimpanan sementara. Untuk menguji server yang sudah berjalan, tetapkan `NUSANTARA_URL` ke alamatnya.

## Hasil yang sudah dijalankan

Tanggal uji 8 November 2026. Runtime lokal menggunakan Node.js 24.22.1 dan Wrangler 4.158.0. Browser otomatis menggunakan Chromium 153 pada Linux.

| Pengujian | Hasil dan bukti |
| --- | --- |
| `npm run build` | Lulus. Vite menghasilkan paket klien dan service worker. |
| `npm test` | 4 lulus. Dua koneksi WebSocket independen, perebutan kursi kedua, penolakan token salah dan pemain ketiga, sinkronisasi avatar, gerak dan lompat, jeda ketika terputus, sambung ulang, dan pemulihan SQLite setelah proses Worker dimulai ulang. |
| Simulasi aturan di `tests/world.test.mjs` | Lulus seluruh 24 area dan 10 jenis mekanisme, memperoleh enam keping, menyelesaikan 60 soal unik, membagi giliran 30–30, dan mengocok ulang pada permainan baru. |
| Browser dengan dua sesi, 844 × 390 dan 915 × 412 | Lulus perjalanan enam pulau dalam 209,7 detik. Dua sesi menggunakan antarmuka pemain untuk menuntaskan 24 area, menjawab 60 lentera, mendapatkan keenam keping, melihat empat adegan penutup Bali, dan memulai permainan baru. Termasuk undangan, kustomisasi, lompat dan aksi angkat dengan input sentuh, jawaban salah dan percobaan ulang, pergantian musik Aceh–Toba–Minangkabau, dan sambung ulang setelah muat ulang. |
| Browser potret, 390 × 844 | Lulus pemeriksaan lebar, manifest, ikon, pemasangan service worker, dan pemuatan ulang menu saat luring. |
| `npx wrangler deploy --dry-run` | Lulus. Wrangler mengenali 44 berkas aset, binding Static Assets, Durable Object SQLite, dan rate limiter. |
| `npm audit --omit=dev` | Tidak ada kerentanan yang dilaporkan untuk paket produksi pada saat pengujian. Pemeriksaan paket klien juga tidak menemukan pola kredensial yang diuji atau bank jawaban. |

## Pemeriksaan setelah publikasi

1. Publikasikan Worker terpisah di akun Workers Free pemilik dan simpan salinan ke repositori GitHub privat.
2. Buka alamat HTTPS di Safari pada iPhone dan Chrome pada Android. Gunakan dua jaringan berbeda.
3. Buat room, buka tautan dari aplikasi pesan, lakukan lompatan dan tahan Aksi bersamaan. Kunci layar selama satu menit, sambungkan kembali, lalu periksa progres dan suara.
4. Tambahkan game ke layar utama. Periksa kontrol dalam mode lanskap, perpindahan aplikasi, pemulihan suara, serta ukuran tombol pada kedua ponsel.
5. Amati grafik pemakaian Worker dan Durable Object setelah beberapa sesi undangan.

Pengujian browser di atas memakai ukuran layar ponsel pada Chromium. Safari dan Chrome pada perangkat fisik, latensi antarjaringan, pemasangan PWA di layar utama, serta pemakaian produksi memerlukan pengujian pada alamat publik.
