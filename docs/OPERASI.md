# Operasi room

- Server menerima maksud gerak dan aksi melalui WebSocket. Posisi, lompatan, jarak dari tuas, waktu sakelar, giliran trivia, keping kompas, dan pembukaan bab dihitung oleh Durable Object.
- Kode undangan terdiri dari delapan karakter acak. Setiap kursi memiliki token acak 256 bit terpisah yang dikirim lewat subprotokol WebSocket, disimpan sebagai hash di server, dan tidak ikut dalam tautan undangan. Kursi penuh tetap dicadangkan untuk sambung ulang.
- Durable Object menyimpan checkpoint saat puzzle atau soal selesai dan saat pemain terputus. Saat sambung ulang, tombol yang sebelumnya ditahan dilepas. Room baru yang ditinggal dapat kedaluwarsa setelah sekitar 24 jam, sedangkan room dengan petualangan tersimpan setelah sekitar tujuh hari. Browser harus masih memiliki token untuk melanjutkan.
- Paket posisi ringkas dikirim saat pemain bergerak atau memegang aksi. Pesan ping memakai tanggapan otomatis WebSocket Hibernation. Penyimpanan tidak ditulis setiap frame. Endpoint masuk dan sambung ulang dibatasi menurut IP.
- Satu pemain yang terputus menjeda aksi bersama. Kegagalan jaringan dapat memicu percobaan ulang bertahap. Jika kapasitas layanan tercapai, menu menampilkan pesan coba lagi dan progres yang sudah disimpan tetap menjadi checkpoint.

## Pemakaian paket Free

Mulai dengan sejumlah kecil room undangan. Di dashboard **Workers & Pages**, buka Worker proyek ini dan periksa **Metrics** untuk request, error, dan CPU. Periksa juga **Durable Objects** untuk request, durasi, dan penulisan SQLite. Data pemakaian cloud baru tersedia setelah deploy ke akun pemilik.

Cloudflare menetapkan batas harian gratis untuk Workers dan Durable Objects. Periksa [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) dan [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) sebelum memperluas jumlah pemain. Batas yang tercapai dapat menolak operasi baru. Gunakan pengaturan Workers Free di akun saat menerbitkan dan tinjau grafik setelah uji awal.
