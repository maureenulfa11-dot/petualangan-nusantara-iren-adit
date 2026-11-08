# Petualangan Nusantara · Iren & Adit

Petualangan 2D berbahasa Indonesia untuk dua pemain. Temukan enam keping Kompas Nusantara dengan saling membantu dari Sumatra sampai Bali.

| Bab | Tempat dan tantangan |
| --- | --- |
| 1. Sumatra | Jembatan Aceh, rakit Danau Toba, dua jalur Minangkabau, dan pengangkatan balok |
| 2. Jawa | Batu besar, lorong candi, sakelar serempak, dan jembatan sawah |
| 3. Kalimantan | Rakit sungai, pohon tumbang, jembatan rumah panjang, dan gerbang rimba |
| 4. Sulawesi | Gondola katrol, ukiran Tongkonan, beban bertali, dan sakelar pesisir |
| 5. Papua | Pijakan pegunungan, petunjuk terpisah, karang Raja Ampat, dan gerbang batu |
| 6. Bali | Jalan tersembunyi, beban terakhir, jembatan kebun, dan gerbang kompas diikuti adegan penutup |

Ada 24 area dan 60 lentera trivia. Server mengocok satu bank bersama untuk setiap petualangan. Tiap bab mendapat tepat 10 soal, dan masing-masing pemain mendapat 30 giliran menjawab selama satu petualangan.

## Bermain setelah game diterbitkan

1. Buka alamat game di Safari atau Chrome. Putar ponsel ke posisi mendatar.
2. Tekan **Buat Room**. Salin tautan undangan atau tekan **WhatsApp** untuk memilih teman yang ingin diundang.
3. Teman membuka tautan dan menekan **Gabung Room**. Kalian bisa mengatur penampilan sebelum menekan **Saya Siap**.
4. Pembuat room menekan **Mulai Game**. Gunakan tombol **Kiri**, **Kanan**, **Lari**, **Lompat**, dan **Aksi**. Ikuti petunjuk di bagian atas.
5. Jika koneksi salah satu pemain terputus, buka kembali room dari browser yang sama. Keping, jawaban, dan mekanisme yang selesai tersimpan di server. Simpan kode room jika perlu kembali lewat tautan.

Untuk menambahkan ikon game ke layar utama, gunakan **Add to Home Screen** dari menu berbagi di Safari atau **Install app** / **Add to Home screen** dari menu Chrome jika tersedia. Saat luring, menu yang sudah diunduh dapat terbuka. Room dan permainan bersama memerlukan internet.

## Menjalankan di komputer

Gunakan Node.js 22 atau lebih baru di Windows, macOS, atau Linux. Buka terminal di folder proyek dan jalankan:

```sh
npm ci
npm run dev
```

Buka alamat yang ditampilkan Wrangler, biasanya `http://localhost:8787`. Gunakan dua profil browser, satu jendela biasa dan satu jendela privat, atau dua perangkat. Gunakan alamat yang sama saat membuka undangan. Untuk ponsel di jaringan lokal yang sama, gunakan alamat IP komputer yang ditampilkan Wrangler. Pemasangan PWA di ponsel membutuhkan situs HTTPS.

## Menyimpan di GitHub dan menerbitkan ke Cloudflare

1. Buat repositori GitHub privat bernama `petualangan-nusantara-iren-adit`. Aktifkan **Add a README file** agar repositori memiliki cabang `main`. Jika ingin Codex mengunggah proyek, beri integrasi GitHub akses ke repositori ini dan bagikan tautannya.
2. Di akun Cloudflare dengan **Workers Free**, buka **Workers & Pages** → **Create application** → **GitHub**. Berikan akses hanya ke repositori game ini dan pilih repositori tersebut.
3. Pilih cabang `main`, gunakan perintah build `npm run build` dan perintah deploy `npx wrangler deploy`. Biarkan direktori akar pada repositori. Konfigurasi membuat Worker `petualangan-nusantara-iren-adit` dengan Static Assets dan Durable Object SQLite sendiri. Pilih **Save and Deploy**.
4. Buka alamat `workers.dev` yang muncul. Uji satu room pada dua ponsel menggunakan dua jaringan, misalnya Wi-Fi dan data seluler. Setelah ini, pembaruan yang digabung ke `main` dapat dibangun otomatis oleh integrasi Cloudflare.

Panduan resmi [Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/).

Developer dengan sesi Wrangler yang sudah terotorisasi bisa menjalankan `npm ci` dan `npm run deploy` dari repositori. Untuk memeriksa paket tanpa publikasi, jalankan `npm run build` dan `npx wrangler deploy --dry-run`.

## Memperbarui game

- **Soal** ada di `src/server/questions.js`. Pertahankan 60 ID unik dan empat pilihan tiap soal. Pertahankan ID dan urutan opsi saat room aktif agar checkpoint lama dapat dilanjutkan.
- **Bab dan teka-teki** ada di `src/shared/chapters.js` dan `src/server/world.js`. Setiap bab berisi 10 lentera. Data bab adalah konfigurasi bersama untuk server dan renderer.
- **Kostum** ada di `src/shared/avatar-options.js` dan `src/client/avatar.js`. Tambahkan pilihan di akhir daftar agar nomor kostum yang sudah tersimpan tetap menunjuk penampilan yang sama.
- **Latar** ada di `public/art/`. Jalankan `python3 scripts/draw-landscapes.py` untuk menggambar ulang lapisan latar vektor. Musik dan efek asli ada di `src/client/audio.js`.
- **Pengujian** dijelaskan di [docs/UJI.md](docs/UJI.md). Inventaris karya dan lisensi ada di [docs/ASET.md](docs/ASET.md).

Jika arsip menyertakan `backup/petualangan-nusantara.bundle`, berkas itu bisa diklon oleh Git untuk memulihkan riwayat proyek. Contoh perintah untuk developer:

```sh
git clone backup/petualangan-nusantara.bundle nusantara-restored
```
