# Inventaris aset

| Aset | Lokasi | Sumber atau lisensi |
| --- | --- | --- |
| Cuplikan papan cerita Sumatra | `public/art/referensi-sumatra.webp` | Dipotong dari gambar referensi yang disediakan pemilik proyek. Hak pada gambar tetap mengikuti kepemilikannya. |
| Ilustrasi Iren dan Adit pada penampilan bawaan | `public/art/iren-sprites.webp`, `public/art/adit-sprites.webp`, `src/client/avatar-sprites.js` | Dua lembar 12 frame dari `Iren-Adit-Approved-Art-Source.zip` yang sudah tersedia di repository. Berkas gambar disalin tanpa perubahan. Meliputi diam, berjalan, berlari, melompat, mendarat, mendorong, mengangkat, berinteraksi, dan merayakan. |
| Penampilan modular dan karakter penutup | `src/client/avatar.js`, `src/shared/avatar-options.js` | Rig vektor berarsir dari arsip proyek yang sama, dirender pada resolusi 2×. Penampilan yang disimpan sebelumnya tetap memakai indeks pilihan semula. |
| Latar, peta ilustratif, dan ikon | `public/art/`, `scripts/draw-landscapes.py` | Ilustrasi asli untuk proyek ini. Peta digunakan sebagai ilustrasi rute permainan. |
| Musik dan efek | `src/client/audio.js` | Melodi, harmoni, ritme, dan efek asli yang disintesis oleh Web Audio. |
| Phaser 3.90.0 | `package.json`, `package-lock.json` | [MIT](licenses/phaser-MIT.md) |
| Fraunces | `@fontsource-variable/fraunces` | [SIL Open Font License 1.1](licenses/fraunces-OFL.txt) |
| Plus Jakarta Sans | `@fontsource-variable/plus-jakarta-sans` | [SIL Open Font License 1.1](licenses/plus-jakarta-sans-OFL.txt) |

## Karakter

Pemeriksaan 10 November 2026 menemukan dua sprite bawaan di arsip repository. Arsip ini belum menyediakan sprite untuk setiap kombinasi rambut, hijab, warna kulit, pakaian, dan aksesori. Kombinasi tersebut masih memakai rig modular proyek dan memerlukan tinjauan kesesuaian dengan ilustrasi yang disetujui. Frame khusus berpikir dan ekspresi salah belum tersedia pada lembar sprite bawaan.

## Musik

Musik aktif masih berasal dari `src/client/audio.js`. Arsip menyertakan referensi YouTube dan komposisi sintetis yang berbeda di `src/client/score.js`. Pemeriksaan berkas aktif dan isi arsip belum menemukan rekaman MP3, OGG, WAV, AAC, M4A, atau FLAC untuk lagu referensi. Penggantian musik memerlukan persetujuan pemilik.

| Lokasi | Judul dalam game | Arah musikal dan referensi pemilik |
| --- | --- | --- |
| Aceh | Angin Seulanga | Nada tiup sintetis dan motif pendek. Arah suasana dari Bungong Jeumpa. [Referensi arsip](https://www.youtube.com/watch?v=96VSf0gyt5A) |
| Danau Toba | Riak Danau | Nada petik lembut dan ritme berjalan. Arah suasana dari Sinanggar Tulo. [Referensi arsip](https://www.youtube.com/watch?v=Sn-sql3k4Bo) |
| Minangkabau | Langkah di Lumbung | Bunyi kayu ringan. Arah suasana dari Ayam Den Lapeh. [Referensi arsip](https://www.youtube.com/watch?v=vmrJtvj-Geo) |
| Jawa | Gema Teras Candi | Lonceng dan nada rendah dengan gema panjang, terinspirasi warna bunyi gamelan. [Referensi arsip](https://www.youtube.com/watch?v=BOhLsPZeozw) |
| Kalimantan | Arus Kayu Rimba | Petikan sintetis bernuansa sape. Ampar-Ampar Pisang sebagai acuan suasana. [Referensi arsip](https://www.youtube.com/watch?v=r9MwAD5-4VQ) |
| Sulawesi | Pagi di Lembah | Nada kayu dengan warna kolintang. O Ina Ni Keke sebagai acuan suasana. [Referensi arsip](https://www.youtube.com/watch?v=gOMbSd1R9uY) |
| Papua | Jejak di Awan | Perkusi sintetis dengan inspirasi warna bunyi tifa. Asal Yamko Rambe Yamko masih diperdebatkan. [Referensi arsip](https://www.youtube.com/watch?v=ovbrbW51Wmc) [Liputan mengenai penelusuran asal lagu](https://news.detik.com/berita/d-5070674/bpnb-papua-belum-ada-literatur-yamko-rambe-yamko-dari-bahasa-mana). |
| Bali | Senja Saling Menjawab | Motif berbalas yang terinspirasi struktur ritmis Kecak, dengan bunyi instrumental sintetis. [Referensi arsip](https://www.youtube.com/watch?v=pOFDAcboxtU) |
| Penutup | Keping Terakhir | Melodi perayaan orisinal untuk adegan senja. |

Komposisi memakai motif baru dan tidak mengambil melodi, rekaman, lirik, atau suara tokoh publik dari sumber eksternal. Efek pendek dihasilkan untuk jawaban benar dan salah, petunjuk, perubahan lokasi, bahaya, lompatan, dan kemenangan. Pemain dapat mengatur musik dan efek secara terpisah atau membisukan keduanya.

Bank soal menyertakan tautan sumber untuk kutipan, konteks meme, dan fakta publik. Kutipan Prabowo memakai frasa yang terdokumentasi di video pidato 2019. Sapaan yang terdengar pada bagian lain dijelaskan di dalam bank soal.
