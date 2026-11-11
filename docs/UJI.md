# Pengujian

## Pemulihan aset pada 11 November 2026

| Pemeriksaan | Hasil |
| --- | --- |
| Build dan paket Worker | Build Vite lulus. `wrangler deploy --dry-run` membaca 80 aset dan memvalidasi binding Worker secara lokal. |
| Pengujian server | 7 lulus. Mencakup 60 soal, dua koneksi pemain, jembatan Aceh, dan pemulihan checkpoint. |
| Sprite dan halaman potret | Chromium Headless 153 lulus 825 pemeriksaan pose dan pilihan karakter. Halaman potret dapat dimuat ulang saat luring. |
| Perjalanan dua pemain | Dua sesi browser berukuran ponsel menyelesaikan enam pulau dan 60 trivia hingga penutup Bali dalam 214,4 detik. Uji meliputi kontrol sentuh, pembatalan sentuhan, jembatan, dan sambung ulang. |
| Musik | Kedua sesi memuat kelima rekaman yang dipulihkan. Sumber audio berulang dimulai saat tema lokasi diputar. |

Uji browser memakai Chromium pada Linux. Safari di iPhone fisik masih perlu diuji. Cloudflare mencatat build gagal pada `main` dan preview PR. Pengecekan paket lokal lulus, sedangkan penyebab kegagalan cloud perlu dibaca di log akun Cloudflare.

## Pemeriksaan branch 10 November 2026

| Pemeriksaan akhir | Hasil |
| --- | --- |
| Build produksi | Lulus dengan Vite 7.3.7 pada Node.js 24.22.1. |
| `npm test` | 7 lulus, 0 gagal, 0 dilewati dalam 16,4 detik. |
| Renderer karakter pada Skia Canvas | 825 kasus lulus, termasuk pencerminan, frame aksi, dan pilihan kustomisasi. |
| Simulasi event kontrol pada Node VM | 15 pemeriksaan lulus pada enam skenario dengan elemen tiruan. |
| Enam pulau, 24 area, 60 soal | Lulus simulasi aturan dunia, dengan 30 giliran per pemain. |
| Dua sesi pemain | Dua koneksi WebSocket independen lulus sinkronisasi dan pemulihan. |
| Musik | 24 area memilih tema yang tersedia, termasuk Aceh, Toba, Minangkabau, dan penutup. |
| Browser end-to-end, Safari, dan iPhone fisik | Terkendala runtime browser. Pemeriksaan ini masih perlu dilakukan. |

Perbaikan karakter memakai dua lembar sprite yang sudah berada di arsip repository. Build dan empat pengujian server lulus pada Node.js 24.22.1. Renderer diuji terpisah dengan Skia Canvas sementara pada 825 kasus, termasuk seluruh frame berjalan dan berlari, setiap pose aksi, pencerminan arah, dan pilihan kustomisasi yang tersedia. Dua sprite hasil ekstraksi cocok byte demi byte dengan arsip.

Pengujian Chromium belum berjalan pada lingkungan ini. Chromium berhenti saat membuat socket profil, sedangkan unduhan Headless Shell gagal. Pengujian visual otomatis baru ditambahkan ke `tests/browser.test.mjs` dan masih harus dijalankan pada runtime browser yang berfungsi. Hasil Skia belum membuktikan gameplay di browser atau kontrol iPhone. Runner lokal membutuhkan penanganan sementara untuk `os.networkInterfaces()` yang dibatasi lingkungan, di luar berkas produksi dan pengujian repository.

Sprite ilustrasi tersedia untuk penampilan bawaan. Kustomisasi masih memakai rig modular dari arsip proyek. Frame ekspresi khusus berpikir dan salah belum tersedia. Tinjauan visual pemilik tetap diperlukan.

Perbaikan jembatan memulihkan papan dua bagian yang terlihat saat turun dan terangkat mengikuti meter server. Tuas dapat dioperasikan sebelum trivia pertama. Kedua pemain harus menahan tuas dan mengunci dari sisi berbeda. Jika koneksi terputus saat menyeberang, pemain kembali ke tepi yang aman. Jembatan yang telah terkunci dipertahankan saat pemulihan checkpoint.

Enam pengujian server lulus dalam 17,1 detik setelah perbaikan jembatan. Pengujian tambahan memakai dua koneksi WebSocket independen untuk memeriksa progres pengangkatan, penyeberangan, putus koneksi, sambung ulang, penguncian, dan penyeberangan pemain penahan tuas. Simulasi dunia menuntaskan seluruh 24 area, enam pulau dalam urutan yang diminta, 60 soal unik, serta pembagian giliran 30–30.

Kontrol melepas input dan indikator tombol yang tertahan ketika salah satu pemain terputus. Tombol Lari memiliki bidang sentuh minimal 44 × 44 piksel CSS, dan kontrol menonaktifkan menu tekan lama Safari. Enam skenario simulasi event dengan 15 pemeriksaan lulus pada Node VM dengan elemen kontrol tiruan. Skenario mencakup dua jari, pembatalan sentuhan, hilangnya pointer capture, putus koneksi lokal, putus koneksi teman, dan input netral setelah sambung ulang. Build dan enam pengujian server lulus kembali. Pengujian browser ditambah untuk kasus ini, tetapi interaksi sentuh pada browser dan iPhone fisik masih perlu dijalankan.

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

1. Gunakan Worker dan repository GitHub yang sudah terhubung di akun pemilik.
2. Buka alamat HTTPS di Safari pada iPhone dan Chrome pada Android. Gunakan dua jaringan berbeda.
3. Buat room, buka tautan dari aplikasi pesan, lakukan lompatan dan tahan Aksi bersamaan. Kunci layar selama satu menit, sambungkan kembali, lalu periksa progres dan suara.
4. Tambahkan game ke layar utama. Periksa kontrol dalam mode lanskap, perpindahan aplikasi, pemulihan suara, serta ukuran tombol pada kedua ponsel.
5. Amati grafik pemakaian Worker dan Durable Object setelah beberapa sesi undangan.

Pengujian browser di atas memakai ukuran layar ponsel pada Chromium. Safari dan Chrome pada perangkat fisik, latensi antarjaringan, pemasangan PWA di layar utama, serta pemakaian produksi memerlukan pengujian pada alamat publik.
