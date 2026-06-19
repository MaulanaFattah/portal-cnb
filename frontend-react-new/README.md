# Frontend Portal CNB

Aplikasi frontend React + Vite untuk portal sekolah Cipta Nusa Bakti. Frontend ini menangani halaman publik, halaman masuk, dasbor administrator, portal guru, portal siswa, portal orang tua, dan portal kepala sekolah.

## Perintah Utama

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Konfigurasi API

Gunakan environment variable `VITE_API_URL` untuk mengatur alamat backend. Jika tidak diisi, aplikasi memakai default `http://localhost:4000/api`.

Contoh `.env`:

```env
VITE_API_URL=http://localhost:4000/api
```

## Catatan Pengembangan

- Gunakan bahasa Indonesia yang konsisten untuk teks yang tampil ke pengguna.
- Pertahankan nama route, kontrak API, dan identifier sistem agar tetap kompatibel dengan backend.
- Jalankan `npm run build` dan `npm run lint` sebelum menyerahkan perubahan frontend.
