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

## Menerbitkan lewat Worker yang sudah terhubung

1. Di Cloudflare, buka **Workers & Pages** → **petualangan-nusantara-iren-adit** → **Settings** → **Build**.
2. Pastikan repository terhubung ke `maureenulfa11-dot/petualangan-nusantara-iren-adit`. Pilih `main` sebagai branch produksi. Isi **Build command** dengan `npm run build` dan **Deploy command** dengan `npx wrangler deploy`. Gunakan `/` untuk **Root directory**.
3. Saat perubahan masih ditinjau, di **Settings** → **Builds** pilih **Previews Base** dan matikan **Builds for Preview branches**. Pengaturan itu mengendalikan publikasi preview otomatis dari branch perbaikan.
4. Setelah pengujian lulus dan pemilik menyetujui PR, gabungkan PR ke `main`. Cloudflare menjalankan build dan deploy dari branch produksi. Setelah berhasil, buka alamat game di **Overview**.
5. Jika build gagal, pilih build tersebut di Cloudflare dan periksa pesan error pada log. Setelah game terbit, uji satu room pada dua ponsel melalui Wi-Fi dan data seluler.

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
