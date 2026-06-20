# Revisi RBAC, Absensi, Unggah, dan Skema Bahasa Indonesia

## Ringkasan

Revisi ini mempertahankan project yang sudah ada tanpa membangun ulang dari awal. Fokus perubahan mencakup UI publik yang lebih rapi, unggah gambar berbasis berkas, registrasi guru multi-peran, pengelolaan siswa dan akun orang tua, RBAC absensi sekolah, log audit, atur ulang kata sandi paksa oleh administrator, serta migrasi database fisik ke Bahasa Indonesia.

## Matriks Peran

| Peran internal | Label UI | Hak utama |
| --- | --- | --- |
| `admin` | Administrator | Mengelola data sekolah, kelas, siswa, guru, akun portal, jadwal, unggahan, PPDB, verifikasi guru, ekspor laporan, dan atur ulang kata sandi. |
| `guru` | Guru | Melihat jadwal aktif, mengisi absensi berdasarkan kelas/jadwal, dan melihat rekap sesuai jadwal atau hak wali kelas. |
| `siswa` | Siswa | Melihat data diri dan absensi miliknya sendiri melalui relasi `tautan_akun_portal`. |
| `orangtua` | Orang Tua | Melihat data dan absensi anak yang terhubung melalui `tautan_akun_portal`. |
| `kepala_sekolah` | Kepala Sekolah | Memantau data sekolah secara hanya baca dan mengekspor laporan Excel/PDF. |

## Skema Database Bahasa Indonesia

Migration utama: `cd backend && npm run migrate:schema-indonesia`.

Tabel utama yang dipakai aplikasi:

- `akun_pengguna`
- `siswa`
- `kelas`
- `guru`
- `kepala_sekolah`
- `profil_guru`
- `jadwal_mengajar`
- `absensi_siswa`
- `tautan_akun_portal`
- `log_audit`
- `pendaftaran_ppdb`
- `profil_sekolah`
- `kegiatan`
- `pengumuman`
- `galeri`

Kolom timestamp fisik juga memakai Bahasa Indonesia:

- `dibuat_pada`
- `diperbarui_pada`

Mapping penting:

- `akun_pengguna.wajib_ganti_kata_sandi`
- `profil_guru.wali_kelas`
- `profil_guru.tipe_guru`
- `profil_guru.mata_pelajaran`
- `jadwal_mengajar.guru_akun_pengguna_id`
- `absensi_siswa.siswa_id`
- `absensi_siswa.jadwal_mengajar_id`
- `tautan_akun_portal.akun_pengguna_id`
- `log_audit.pelaku_akun_pengguna_id`
- `log_audit.aksi`
- `log_audit.jenis_entitas`
- `log_audit.entitas_id`
- `log_audit.alamat_ip`
- `log_audit.agen_pengguna`

## Unggah Berkas

- Backend memakai `multer` dengan validasi `image/jpeg`, `image/png`, `image/webp` dan ukuran maksimal 4 MB.
- Folder unggah baru dibuat otomatis di `backend/uploads` dengan subfolder `kegiatan`, `siswa`, `galeri`, dan `kepala-sekolah`.
- Berkas baru disimpan sebagai path relatif seperti `/uploads/kegiatan/nama-file.webp`.
- Data lama berbentuk Base64 atau path `/uploads/...` tetap dapat ditampilkan oleh frontend melalui `resolveMediaUrl()`.

## Guru Multi-Peran

- Satu akun guru dapat menjadi wali kelas dan guru mata pelajaran sekaligus.
- Di database, wali kelas disimpan sebagai privilege `profil_guru.wali_kelas`, bukan role terpisah.
- Mata pelajaran guru disimpan di `profil_guru.mata_pelajaran`.
- API registrasi dan verifikasi guru tetap menerima field lama untuk kompatibilitas, serta sudah menerima alias Indonesia seperti `nama`, `kata_sandi`, `tipe_guru`, `mata_pelajaran`, `wali_kelas`, `guru_mata_pelajaran`, `kelas_wali_id`, `status_verifikasi`, dan `catatan`.

## Absensi

- Absensi selalu disimpan berdasarkan `absensi_siswa.siswa_id`, bukan nama atau username siswa.
- Guru mata pelajaran menginput absensi berdasarkan `jadwal_mengajar` aktif.
- Wali kelas dapat melakukan absensi pembuka dan monitoring kelasnya.
- Kepala sekolah hanya membaca rekap dan laporan, tanpa mengubah data absensi.

## Akun Siswa dan Orang Tua

Saat administrator menambahkan siswa, backend memakai transaksi untuk:

1. membuat data `siswa`,
2. membuat akun siswa di `akun_pengguna`,
3. membuat akun orang tua di `akun_pengguna`,
4. menghubungkan akun dengan siswa melalui `tautan_akun_portal`,
5. mengembalikan kata sandi awal satu kali.

Kata sandi selalu di-hash dengan bcrypt, dan akun baru diset `wajib_ganti_kata_sandi = true`.

## Atur Ulang Kata Sandi Paksa

- Endpoint administrator: `PUT /api/admin/users/:id/reset-password`.
- Administrator dapat mengisi kata sandi manual atau membuat kata sandi otomatis.
- Backend menyimpan hash kata sandi dan mengaktifkan `wajib_ganti_kata_sandi` agar pengguna mengganti kata sandi saat masuk berikutnya.

## Log Audit

Aktivitas penting dicatat ke `log_audit`, termasuk:

- pembuatan akun,
- assignment guru dan wali kelas,
- input absensi,
- validasi absensi,
- perubahan jadwal,
- unggah, tambah, ubah, dan hapus konten,
- import/export laporan,
- atur ulang kata sandi,
- perubahan kata sandi pengguna.

## Perubahan UI

- Beranda bagian profil dan kegiatan memakai `text-align: justify`, jarak paragraf lebih nyaman, dan lebar konten lebih proporsional.
- Kartu kegiatan memakai rasio gambar konsisten dan fallback logo sekolah jika gambar gagal dimuat.
- Halaman admin siswa dibuat lebih bersih, lebar, minimalis, dan dikelompokkan berdasarkan kelas.
- Registrasi guru memakai checkbox multi-peran.
- Verifikasi guru memiliki tombol `Setujui`, `Tolak`, `Menunggu`, dan `Hapus` dengan konfirmasi.

## Daftar Periksa Pengujian

Backend:

- `cd backend && npm install`
- `npm run migrate:schema-indonesia`
- `node --check` untuk seluruh file `backend/src/**/*.js`
- `npm start`

Frontend:

- `cd frontend-react-new && npm install`
- `npm run build`
- `npm run lint`

Pemeriksaan manual:

- Administrator mengunggah gambar kegiatan, galeri, dan foto siswa.
- Gambar tampil di Beranda, Kegiatan, Galeri, dan dasbor administrator.
- Administrator menambahkan siswa sekaligus akun siswa/orang tua.
- Guru mendaftar sebagai wali kelas dan guru mata pelajaran sekaligus.
- Administrator menyetujui, menolak, menunda, dan menghapus registrasi guru.
- Guru menginput absensi berdasarkan jadwal aktif.
- Wali kelas melihat dan memvalidasi absensi kelasnya.
- Kepala sekolah melihat laporan dan mengekspor Excel/PDF.

## Deployment

1. Backup database dan folder `backend/uploads`.
2. Jalankan `cd backend && npm install`.
3. Jalankan `npm run migrate:schema-indonesia` sebelum menyalakan server versi baru.
4. Pastikan folder `backend/uploads` writable oleh proses Node.js.
5. Restart backend.
6. Build dan deploy frontend dari `frontend-react-new`.

## Catatan Pemeliharaan

- Migration akan menolak lanjut jika tabel lama dan tabel baru sama-sama berisi data, agar tidak terjadi kehilangan data diam-diam.
- Berkas unggah lokal perlu backup bersama database karena database hanya menyimpan path relatif.
- Jika rollback ke versi lama, perhatikan perubahan nama tabel/kolom fisik karena schema sekarang memakai Bahasa Indonesia.
- Import siswa XLSX/CSV sebaiknya dikerjakan sebagai fase khusus agar validasi batch dan pratinjau error lebih matang.
