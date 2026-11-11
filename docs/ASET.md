# Inventaris aset

| Aset | Lokasi | Sumber atau lisensi |
| --- | --- | --- |
| Cuplikan papan cerita Sumatra | `public/art/referensi-sumatra.webp` | Dipotong dari gambar referensi yang disediakan pemilik proyek. Hak pada gambar tetap mengikuti kepemilikannya. |
| Ilustrasi Iren dan Adit pada penampilan bawaan | `public/art/iren-sprites.webp`, `public/art/adit-sprites.webp`, `src/client/avatar-sprites.js` | Dua lembar 12 frame dari `Iren-Adit-Approved-Art-Source.zip` yang sudah tersedia di repository. Berkas gambar disalin tanpa perubahan. Meliputi diam, berjalan, berlari, melompat, mendarat, mendorong, mengangkat, berinteraksi, dan merayakan. |
| Variasi penampilan dan karakter penutup | `public/art/*-sprites.webp`, `public/art/ending-companions.webp`, `src/client/avatar-sprites.js` | Lembar ilustrasi dipulihkan dari paket uji kostum proyek. Renderer menggunakan gambar per pose untuk rambut, pakaian, aksesori, dan kombinasi warna. Pilihan tersimpan memakai indeks semula. |
| Latar, peta ilustratif, dan ikon | `public/art/`, `scripts/draw-landscapes.py` | Ilustrasi asli untuk proyek ini. Peta digunakan sebagai ilustrasi rute permainan. |
| Musik dan efek | `public/audio/`, `src/client/audio.js` | Tiga aransemen instrumental, rekaman gamelan, tema sintetis proyek, dan efek Web Audio. [Kredit musik](../public/audio/kredit.txt) |
| Phaser 3.90.0 | `package.json`, `package-lock.json` | [MIT](licenses/phaser-MIT.md) |
| Fraunces | `@fontsource-variable/fraunces` | [SIL Open Font License 1.1](licenses/fraunces-OFL.txt) |
| Plus Jakarta Sans | `@fontsource-variable/plus-jakarta-sans` | [SIL Open Font License 1.1](licenses/plus-jakarta-sans-OFL.txt) |

## Karakter

Paket uji kostum melengkapi dua lembar bawaan dengan 26 lembar variasi dan satu lembar untuk dua pendamping di penutup Bali. Saat beberapa pilihan dipakai bersama, renderer memadukan bagian gambar pada pose yang sama. Frame khusus berpikir dan ekspresi salah masih memakai pose diam.

## Musik

Aceh, Kalimantan, dan Papua memakai aransemen instrumental dari melodi yang sudah digunakan. Jawa memakai rekaman gamelan Keraton Yogyakarta. Toba, Minangkabau, Sulawesi, Bali, dan penutup memakai tema instrumental sintetis proyek. Jika MP3 gagal dimuat, game memakai tema sintetis wilayah yang sama. Sumber dan lisensi tercantum dalam [kredit musik](../public/audio/kredit.txt).

| Lokasi | Judul dalam game | Aransemen dan referensi awal |
| --- | --- | --- |
| Aceh | Bungong Jeumpa · instrumental | Melodi Bungong Jeumpa dengan nada tiup dan petikan sintetis. [Referensi arsip](https://www.youtube.com/watch?v=96VSf0gyt5A) |
| Danau Toba | Riak Danau | Nada petik lembut dan ritme berjalan. Arah suasana dari Sinanggar Tulo. [Referensi arsip](https://www.youtube.com/watch?v=Sn-sql3k4Bo) |
| Minangkabau | Langkah di Lumbung | Bunyi kayu ringan. Arah suasana dari Ayam Den Lapeh. [Referensi arsip](https://www.youtube.com/watch?v=vmrJtvj-Geo) |
| Jawa | Gamelan Keraton Yogyakarta | Lonceng dan nada rendah dengan gema panjang, terinspirasi warna bunyi gamelan. [Referensi arsip](https://www.youtube.com/watch?v=BOhLsPZeozw) |
| Kalimantan | Ampar-Ampar Pisang · instrumental | Melodi Ampar-Ampar Pisang dengan bunyi petikan sintetis. [Referensi arsip](https://www.youtube.com/watch?v=r9MwAD5-4VQ) |
| Sulawesi | Pagi di Lembah | Nada kayu dengan warna kolintang. O Ina Ni Keke sebagai acuan suasana. [Referensi arsip](https://www.youtube.com/watch?v=gOMbSd1R9uY) |
| Papua | Yamko Rambe Yamko · instrumental | Melodi Yamko Rambe Yamko dengan nada kayu dan perkusi sintetis. Asal lagu masih diperdebatkan. [Referensi arsip](https://www.youtube.com/watch?v=ovbrbW51Wmc) [Liputan mengenai penelusuran asal lagu](https://news.detik.com/berita/d-5070674/bpnb-papua-belum-ada-literatur-yamko-rambe-yamko-dari-bahasa-mana). |
| Bali | Senja Saling Menjawab | Motif berbalas yang terinspirasi struktur ritmis Kecak, dengan bunyi instrumental sintetis. [Referensi arsip](https://www.youtube.com/watch?v=pOFDAcboxtU) |
| Penutup | Keping Terakhir | Melodi perayaan orisinal untuk adegan senja. |

Tema sintetis memakai motif asli proyek. Efek pendek dihasilkan untuk jawaban benar dan salah, petunjuk, perubahan lokasi, bahaya, lompatan, dan kemenangan. Pemain dapat mengatur musik dan efek secara terpisah atau membisukan keduanya.

Bank soal menyertakan tautan sumber untuk kutipan, konteks meme, dan fakta publik. Kutipan Prabowo memakai frasa yang terdokumentasi di video pidato 2019. Sapaan yang terdengar pada bagian lain dijelaskan di dalam bank soal.
