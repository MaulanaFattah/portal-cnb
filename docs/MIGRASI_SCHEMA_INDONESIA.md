# Migrasi Skema Database Bahasa Indonesia

Dokumen ini menjelaskan cara memindahkan database Portal CNB ke nama tabel dan kolom fisik Bahasa Indonesia.

## Command

Jalankan dari folder backend:

```bash
npm run migrate:schema-indonesia
```

Alias pendek juga tersedia:

```bash
npm run migrate:schema
```

## Yang Dimigrasikan

Migration `backend/src/migrateSchemaIndonesia.js` melakukan:

- rename tabel Inggris/plural lama ke tabel Indonesia,
- rename kolom Inggris ke kolom Indonesia,
- rename timestamp ke `dibuat_pada` dan `diperbarui_pada`,
- membuat/menyesuaikan `log_audit`,
- menambahkan `akun_pengguna.wajib_ganti_kata_sandi`,
- menambahkan `profil_guru.wali_kelas`,
- mengembalikan foreign key dengan nama dan kolom Indonesia,
- membuat folder unggah baru: `kegiatan`, `siswa`, `galeri`, dan `kepala-sekolah`.

## Nama Tabel Final

| Area | Tabel final |
| --- | --- |
| Akun | `akun_pengguna` |
| Siswa | `siswa` |
| Kelas | `kelas` |
| Guru | `guru`, `profil_guru`, `jadwal_mengajar` |
| Absensi | `absensi_siswa` |
| Portal akun | `tautan_akun_portal` |
| Audit | `log_audit` |
| Konten | `kegiatan`, `pengumuman`, `galeri`, `profil_sekolah` |
| PPDB | `pendaftaran_ppdb` |
| Kepala sekolah | `kepala_sekolah` |

## Keamanan Data

Migration bersifat hati-hati:

- Jika tabel lama berisi data dan tabel final kosong, tabel final kosong dihapus lalu tabel lama di-rename.
- Jika tabel lama kosong dan tabel final sudah ada, tabel lama kosong dihapus.
- Jika tabel lama dan tabel final sama-sama berisi data, migration berhenti dan meminta penggabungan manual.
- Foreign key lama dilepas sebelum rename kolom, lalu dibuat ulang setelah orphan check.

## Setelah Migration

Pastikan backend memakai model terbaru yang memetakan properti JavaScript ke kolom fisik Indonesia. Contoh:

- properti `user.name` tetap dibaca kode aplikasi, tetapi kolom database fisiknya `nama`,
- properti `user.password` tetap dibaca kode aplikasi, tetapi kolom database fisiknya `kata_sandi`,
- properti `createdAt` tetap dipakai Sequelize, tetapi kolom fisiknya `dibuat_pada`.

Pendekatan ini menjaga kompatibilitas controller/frontend sambil membuat schema database fisik konsisten Bahasa Indonesia.
