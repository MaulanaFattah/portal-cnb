# Revisi RBAC, Absensi, Upload, dan Portal Akun

## Requirement Analysis

Tujuan revisi adalah memperkuat project existing tanpa rewrite: UI publik lebih rapi, upload gambar tidak lagi menyimpan base64 baru, registrasi guru mendukung multi-peran, data siswa otomatis membuat akun siswa/orang tua, RBAC absensi tetap berbasis `student_id`, kepala sekolah read-only dengan export, admin bisa force reset password, dan aktivitas penting tercatat di audit log.

## Role Matrix

| Role internal | Label UI | Hak utama |
| --- | --- | --- |
| `admin` | Admin | Kelola konten, kelas, siswa, akun portal, guru, jadwal, reset password, upload, dan verifikasi guru. |
| `guru` | Teacher | Melihat roster aktif, mengisi absensi berdasarkan `student_id`, melihat rekap sesuai roster/wali kelas. |
| `siswa` | Student | Melihat data diri dan absensi miliknya sendiri melalui `portal_account_link`. |
| `orangtua` | Parent | Melihat data dan absensi anak yang terhubung melalui `portal_account_link`. |
| `kepala_sekolah` | Principal | Monitoring read-only data sekolah dan export laporan Excel/PDF. |

## System Design

### Upload

- Backend memakai `multer` dengan validasi `image/jpeg`, `image/png`, `image/webp` dan ukuran maksimal 4 MB.
- Folder upload dibuat otomatis di `backend/uploads` dengan subfolder `activities`, `students`, `gallery`, dan `principal`.
- Static serving tersedia melalui `/uploads`.
- Data baru menyimpan path relatif seperti `/uploads/activities/file.webp`.
- Data lama base64 tetap ditampilkan karena frontend `resolveMediaUrl()` hanya mengubah path `/uploads/...`.

### Schema / Migration

Migration baru: `npm run migrate:revision-rbac`.

Perubahan DB:

- `user_account.must_change_password` boolean default `false`.
- `teacher_profile.is_homeroom` boolean default `false`.
- `audit_log` untuk aktivitas penting.
- Data lama `teacher_type = wali_kelas` dibackfill menjadi `is_homeroom = true`.

### Guru Multi-Peran

- `teacher_type` tetap dipertahankan untuk kompatibilitas.
- `is_homeroom` menjadi privilege wali kelas.
- `subject` tetap menyimpan daftar mapel sederhana, dipisahkan koma.
- Guru bisa `is_homeroom = true` sekaligus punya `subject` dan roster mapel.

### Absensi

- `student_attendance` tetap menyimpan `student_id` (`siswa_id`) sebagai referensi utama.
- Guru mapel harus memilih `jadwal_id` aktif.
- Wali kelas dapat absensi pembuka tanpa `jadwal_id` untuk kelas walinya.
- Wali kelas dapat melihat rekap seluruh absensi kelasnya secara read-only.

### Akun Siswa dan Orang Tua

- Saat admin tambah siswa, backend memakai transaksi untuk:
  1. membuat `student`,
  2. membuat akun `siswa`,
  3. membuat akun `orangtua`,
  4. membuat `portal_account_link`,
  5. mengembalikan password awal satu kali.
- Password di-hash dengan bcrypt.
- Akun baru diset `must_change_password = true`.

### Force Reset Password

- Endpoint admin: `PUT /api/admin/users/:id/reset-password`.
- Admin dapat mengisi password manual atau generate otomatis.
- User dipaksa mengganti password lewat `/change-password` saat login berikutnya.

### Audit Log

Model `audit_log` menyimpan:

- `actor_user_account_id`
- `action`
- `entity_type`
- `entity_id`
- `metadata`
- `ip_address`
- `user_agent`
- `created_at`

Aktivitas yang sudah dicatat: upload/tambah/edit/hapus kegiatan dan galeri, tambah/edit/hapus siswa, buat akun siswa/orang tua, verifikasi/hapus registrasi guru, perubahan jadwal, input absensi, force reset password, ganti password, dan export laporan kepala sekolah.

## API Changes

- `POST /api/kegiatan` dan `PUT /api/kegiatan/:id` menerima `multipart/form-data` field `image`.
- `POST /api/galeri` dan `PUT /api/galeri/:id` menerima `multipart/form-data` field `image`.
- `POST /api/siswa` dan `PUT /api/siswa/:id` menerima `multipart/form-data` field `foto`.
- `POST /api/auth/register-guru` menerima `is_homeroom`, `is_subject_teacher`, `homeroom_classroom_id`, dan `subjects`.
- `DELETE /api/admin-guru/registrations/:userId` menghapus registrasi guru pending/rejected dan menolak approved yang masih dipakai jadwal/absensi.
- `PUT /api/auth/change-password` mengganti password user sendiri.
- `PUT /api/admin/users/:id/reset-password` force reset password user.

## UI Changes

- Beranda profil dan kartu kegiatan memakai readable measure, `text-align: justify`, line-height lebih nyaman, dan card image aspect ratio stabil.
- Halaman kegiatan dan galeri memakai lazy image + fallback image.
- Admin kegiatan, siswa, dan galeri memakai file upload asli, bukan base64 baru.
- Admin siswa dibuat lebih full-width, minim kolom tabel, ada search, grouping data siswa/orang tua, dan advanced field collapsible.
- Registrasi guru memakai checkbox multi-peran.
- Admin verifikasi guru menampilkan pengaturan multi-peran dan tombol `Hapus`.
- Kepala sekolah memiliki export Excel dan PDF.

## Testing Checklist

Backend:

- `npm install` di `backend` setelah menarik revisi.
- `npm run migrate:revision-rbac`.
- `node --check` seluruh file `backend/src/**/*.js`.
- `npm start` dan pastikan server start tanpa error.

Frontend:

- `npm run build`.
- `npm run lint` bila ingin mengecek rule lint existing.

Manual check:

- Admin upload gambar kegiatan, galeri, dan foto siswa.
- Gambar tampil di Beranda, Kegiatan, dan Galeri.
- Tambah siswa lalu simpan credential awal siswa/orang tua.
- Login siswa/orang tua dengan password awal lalu diarahkan ke ganti password.
- Registrasi guru dengan wali kelas + mapel, lalu admin approve.
- Admin hapus registrasi guru pending/rejected.
- Guru mapel input absensi dari roster aktif.
- Wali kelas input absensi pembuka dan melihat rekap kelas.
- Kepala sekolah melihat dashboard read-only dan export Excel/PDF.
- Admin reset password user dan user wajib mengganti password.

## Deployment Steps

1. Pull perubahan project.
2. Jalankan `cd backend && npm install`.
3. Jalankan migration berurutan bila DB lama: `npm run migrate:english-schema`, `npm run migrate:portal-features`, lalu `npm run migrate:revision-rbac`.
4. Pastikan folder `backend/uploads` writable oleh proses Node.js.
5. Restart backend.
6. Build/deploy frontend dari `frontend-react-new`.

## Maintenance / Rollback Notes

- Rollback code aman selama DB tidak di-drop; kolom baru bersifat additive.
- File upload lokal perlu backup bersama database karena DB hanya menyimpan path relatif.
- Jika rollback ke versi lama, data gambar path `/uploads/...` tetap berupa string di kolom lama, tetapi versi lama mungkin tidak melakukan static serving.
- `audit_log` dapat dibersihkan berkala dengan archival policy bila tumbuh besar.
- XLSX import siswa belum dibuat; CSV/XLSX import sebaiknya dikerjakan sebagai fase khusus agar validasi batch dan preview error bisa matang.
