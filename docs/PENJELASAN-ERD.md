# Penjelasan ERD Portal CNB

Dokumen ini menjelaskan Entity Relationship Diagram (ERD) untuk project Portal CNB. ERD ini dibuat berdasarkan model Sequelize pada folder `backend/src/models` dan asosiasi relasi pada `backend/src/models/index.js`.

## 1. Gambaran Umum

Portal CNB adalah sistem informasi sekolah yang memiliki beberapa domain data utama:

1. **Akun dan Role Pengguna**
   - Menyimpan akun login untuk admin, guru, siswa, dan orang tua.
   - Direpresentasikan oleh tabel `user_account`.

2. **Akademik Sekolah**
   - Mengelola kelas, siswa, jadwal mengajar, profil guru portal, dan absensi siswa.
   - Direpresentasikan oleh tabel `classroom`, `student`, `teacher_profile`, `teaching_schedule`, dan `student_attendance`.

3. **Portal Siswa dan Orang Tua**
   - Menghubungkan akun portal dengan data siswa.
   - Direpresentasikan oleh tabel `portal_account_link`.

4. **Konten Website Sekolah**
   - Menyimpan kegiatan, pengumuman, galeri, profil sekolah, data guru, dan kepala sekolah.
   - Direpresentasikan oleh tabel `activity`, `announcement`, `gallery`, `school_profile`, `teacher`, dan `principal`.

5. **PPDB / Pendaftaran Siswa Baru**
   - Menyimpan data calon siswa dan dokumen pendaftaran.
   - Direpresentasikan oleh tabel `admission_application`.

## 2. Notasi Relasi ERD

Diagram menggunakan notasi **Crow's Foot**.

| Simbol | Arti |
|---|---|
| `|` | Satu data / wajib satu |
| `o` | Nol / opsional |
| Crow's foot / kaki tiga | Banyak data |
| `1:1` | Satu data berhubungan dengan satu data |
| `1:N` | Satu data berhubungan dengan banyak data |

Contoh:

```text
classroom 1 ----< N student
```

Artinya satu kelas dapat memiliki banyak siswa, sedangkan satu siswa hanya berada pada satu kelas.

## 3. Daftar Entitas Utama

### 3.1 `user_account` - Akun Pengguna

Tabel ini menyimpan akun login seluruh pengguna sistem.

| Kolom | Fungsi |
|---|---|
| `id` | Primary key akun pengguna |
| `name` | Nama pengguna |
| `email` | Email login, bersifat unik |
| `password` | Password pengguna, idealnya berupa hash |
| `role` | Role pengguna: `admin`, `guru`, `siswa`, atau `orangtua` |
| `profession` | Profesi pengguna jika diperlukan |
| `created_at` | Waktu data dibuat |
| `updated_at` | Waktu data terakhir diperbarui |

Relasi penting:

- Satu `user_account` dapat memiliki satu `teacher_profile` jika role pengguna adalah guru.
- Satu `user_account` dapat membuat banyak `teaching_schedule` sebagai guru pengajar.
- Satu `user_account` dapat mencatat banyak `student_attendance`.
- Satu `user_account` dapat memiliki banyak `portal_account_link` untuk akun siswa/orang tua.
- Satu `user_account` juga dapat menjadi approver untuk banyak `teacher_profile`.

### 3.2 `classroom` - Kelas

Tabel ini menyimpan data kelas di sekolah.

| Kolom | Fungsi |
|---|---|
| `id` | Primary key kelas |
| `class_name` | Nama kelas, contoh: `7A`, `8B`, `TK A` |
| `grade_level` | Tingkat kelas atau jenjang |
| `homeroom_teacher` | Nama wali kelas dalam bentuk teks |
| `academic_year` | Tahun ajaran |
| `student_count` | Jumlah siswa pada kelas tersebut |
| `room` | Nama atau nomor ruangan kelas |
| `created_at` | Waktu data dibuat |
| `updated_at` | Waktu data terakhir diperbarui |

Relasi penting:

- Satu kelas memiliki banyak siswa.
- Satu kelas dapat memiliki banyak profil guru wali/mapel.
- Satu kelas dapat memiliki banyak jadwal mengajar.
- Satu kelas dapat memiliki banyak data absensi siswa.

Catatan desain:

- Kolom `homeroom_teacher` masih berupa teks.
- Relasi wali kelas yang lebih terstruktur sebenarnya ada di `teacher_profile.classroom_id` dengan `teacher_type = 'wali_kelas'`.

### 3.3 `student` - Siswa

Tabel ini menyimpan data siswa aktif maupun nonaktif.

| Kolom | Fungsi |
|---|---|
| `id` | Primary key siswa |
| `national_student_id` | NISN siswa, bersifat unik |
| `name` | Nama siswa |
| `classroom_id` | Foreign key ke tabel `classroom` |
| `birthplace` | Tempat lahir |
| `birth_date` | Tanggal lahir |
| `gender` | Jenis kelamin: `L` atau `P` |
| `religion` | Agama siswa |
| `address` | Alamat siswa |
| `father_name` | Nama ayah |
| `mother_name` | Nama ibu |
| `phone_number` | Nomor telepon siswa/orang tua |
| `email` | Email siswa/orang tua |
| `photo` | Foto siswa |
| `status` | Status siswa: `aktif`, `lulus`, `pindah`, atau `keluar` |
| `created_at` | Waktu data dibuat |
| `updated_at` | Waktu data terakhir diperbarui |

Relasi penting:

- Banyak siswa dapat berada dalam satu kelas.
- Satu siswa dapat memiliki banyak data absensi.
- Satu siswa dapat dihubungkan dengan banyak akun portal melalui `portal_account_link`.

Contoh penggunaan:

- Jika satu siswa memiliki akun sendiri dan orang tua juga memiliki akun, maka tabel `portal_account_link` dapat menyimpan dua baris untuk siswa yang sama dengan `link_type` berbeda.

### 3.4 `teacher_profile` - Profil Guru Portal

Tabel ini menyimpan profil guru yang terhubung dengan akun login.

| Kolom | Fungsi |
|---|---|
| `id` | Primary key profil guru |
| `user_account_id` | Foreign key ke `user_account.id`, bersifat unik |
| `teacher_type` | Jenis guru: `wali_kelas` atau `mapel` |
| `subject` | Mata pelajaran yang diajar |
| `classroom_id` | Foreign key ke kelas jika guru menjadi wali kelas atau terkait kelas tertentu |
| `verification_status` | Status verifikasi: `pending`, `approved`, atau `rejected` |
| `note` | Catatan verifikasi |
| `approved_by_user_account_id` | User/admin yang menyetujui profil guru |
| `approved_at` | Waktu profil disetujui |
| `created_at` | Waktu data dibuat |
| `updated_at` | Waktu data terakhir diperbarui |

Relasi penting:

- Satu akun guru hanya dapat memiliki satu profil guru karena `user_account_id` bersifat unik.
- Satu admin/user dapat menyetujui banyak profil guru.
- Satu kelas dapat terhubung ke banyak profil guru.

Makna relasi:

```text
user_account 1 ---- 1 teacher_profile
```

Artinya satu akun guru hanya memiliki satu profil guru portal.

```text
user_account 1 ----< N teacher_profile
```

Artinya satu user/admin dapat menjadi approver untuk banyak profil guru.

### 3.5 `teaching_schedule` - Jadwal Mengajar

Tabel ini menyimpan jadwal mengajar guru per kelas dan mata pelajaran.

| Kolom | Fungsi |
|---|---|
| `id` | Primary key jadwal mengajar |
| `teacher_user_account_id` | Foreign key ke akun guru di `user_account` |
| `classroom_id` | Foreign key ke kelas |
| `subject` | Mata pelajaran |
| `day_name` | Hari jadwal: `senin` sampai `minggu` |
| `start_time` | Jam mulai |
| `end_time` | Jam selesai |
| `status` | Status jadwal: `aktif` atau `non-aktif` |
| `created_at` | Waktu data dibuat |
| `updated_at` | Waktu data terakhir diperbarui |

Relasi penting:

- Satu guru dapat memiliki banyak jadwal mengajar.
- Satu kelas dapat memiliki banyak jadwal mengajar.
- Satu jadwal mengajar dapat digunakan oleh banyak data absensi siswa.

Contoh:

Jika guru matematika mengajar kelas `7A` setiap Senin pukul 08:00, maka data tersebut masuk ke tabel `teaching_schedule`.

### 3.6 `student_attendance` - Absensi Siswa

Tabel ini menyimpan catatan kehadiran siswa.

| Kolom | Fungsi |
|---|---|
| `id` | Primary key absensi |
| `student_id` | Foreign key ke siswa |
| `classroom_id` | Foreign key ke kelas |
| `teacher_user_account_id` | Foreign key ke akun guru pencatat absensi |
| `teaching_schedule_id` | Foreign key opsional ke jadwal mengajar |
| `attendance_date` | Tanggal absensi |
| `day_name` | Nama hari absensi |
| `teacher_type` | Jenis guru yang mencatat: `wali_kelas` atau `mapel` |
| `subject` | Mata pelajaran jika absensi berdasarkan mapel |
| `status` | Status kehadiran: `hadir`, `izin`, `sakit`, atau `alpha` |
| `note` | Catatan absensi |
| `created_at` | Waktu data dibuat |
| `updated_at` | Waktu data terakhir diperbarui |

Relasi penting:

- Satu siswa dapat memiliki banyak catatan absensi.
- Satu kelas dapat memiliki banyak catatan absensi.
- Satu guru dapat mencatat banyak absensi.
- Satu jadwal mengajar dapat memiliki banyak catatan absensi.

Catatan:

- `teaching_schedule_id` bersifat opsional, sehingga absensi tetap bisa dibuat tanpa terhubung langsung ke jadwal.
- Data `classroom_id`, `teacher_user_account_id`, dan `subject` disimpan juga di absensi agar riwayat tetap jelas walaupun data jadwal berubah.

### 3.7 `portal_account_link` - Link Akun Portal

Tabel ini menjadi penghubung antara akun login dengan siswa.

| Kolom | Fungsi |
|---|---|
| `id` | Primary key link akun portal |
| `user_account_id` | Foreign key ke akun pengguna |
| `student_id` | Foreign key ke siswa |
| `link_type` | Jenis link: `siswa` atau `orangtua` |
| `created_at` | Waktu data dibuat |
| `updated_at` | Waktu data terakhir diperbarui |

Relasi penting:

- Satu akun pengguna dapat memiliki banyak link ke siswa.
- Satu siswa dapat memiliki banyak akun portal terkait.

Contoh:

- Akun siswa: `link_type = 'siswa'`
- Akun orang tua: `link_type = 'orangtua'`

Dengan desain ini, satu siswa bisa diakses oleh akun siswa dan akun orang tua.

## 4. Entitas Konten Website

### 4.1 `teacher` - Data Guru

Tabel ini menyimpan data guru untuk kebutuhan informasi sekolah atau halaman publik.

| Kolom | Fungsi |
|---|---|
| `id` | Primary key data guru |
| `employee_number` | NIP guru, bersifat unik |
| `name` | Nama guru |
| `email` | Email guru |
| `phone_number` | Nomor telepon |
| `subject` | Mata pelajaran |
| `last_education` | Pendidikan terakhir |
| `photo` | Foto guru |
| `address` | Alamat guru |
| `birth_date` | Tanggal lahir |
| `gender` | Jenis kelamin |
| `status` | Status guru: `aktif` atau `non-aktif` |
| `created_at` | Waktu data dibuat |
| `updated_at` | Waktu data terakhir diperbarui |

Catatan:

- Tabel ini belum memiliki relasi langsung ke `user_account` atau `teacher_profile`.
- Jika ingin menyatukan data guru publik dengan akun guru, perlu ditambahkan FK seperti `user_account_id` atau `teacher_profile_id`.

### 4.2 `principal` - Kepala Sekolah

Tabel ini menyimpan data kepala sekolah.

| Kolom | Fungsi |
|---|---|
| `id` | Primary key kepala sekolah |
| `employee_number` | NIP kepala sekolah, bersifat unik |
| `name` | Nama kepala sekolah |
| `email` | Email |
| `phone_number` | Nomor telepon |
| `photo` | Foto |
| `start_period` | Tanggal mulai periode jabatan |
| `end_period` | Tanggal akhir periode jabatan |
| `address` | Alamat |
| `last_education` | Pendidikan terakhir |
| `status` | Status: `aktif` atau `non-aktif` |
| `created_at` | Waktu data dibuat |
| `updated_at` | Waktu data terakhir diperbarui |

Tabel ini berdiri sendiri dan belum memiliki FK ke tabel lain.

### 4.3 `school_profile` - Profil Sekolah

Tabel ini menyimpan informasi umum sekolah.

| Kolom | Fungsi |
|---|---|
| `id` | Primary key profil sekolah |
| `school_name` | Nama sekolah |
| `npsn` | Nomor Pokok Sekolah Nasional |
| `address` | Alamat sekolah |
| `phone_number` | Nomor telepon sekolah |
| `email` | Email sekolah |
| `website` | Website sekolah |
| `logo` | Logo sekolah |
| `vision` | Visi sekolah |
| `mission` | Misi sekolah |
| `history` | Sejarah sekolah |
| `facility` | Fasilitas sekolah |
| `school_structure` | Struktur organisasi sekolah |
| `accreditation` | Akreditasi sekolah |
| `created_at` | Waktu data dibuat |
| `updated_at` | Waktu data terakhir diperbarui |

Catatan:

- Biasanya tabel ini hanya berisi satu data aktif, tetapi schema saat ini belum membatasi jumlah baris menjadi satu.

### 4.4 `activity` - Kegiatan

Tabel ini menyimpan data kegiatan sekolah.

| Kolom | Fungsi |
|---|---|
| `id` | Primary key kegiatan |
| `title` | Judul kegiatan |
| `date` | Tanggal kegiatan |
| `description` | Deskripsi kegiatan |
| `image` | Gambar kegiatan |
| `created_at` | Waktu data dibuat |
| `updated_at` | Waktu data terakhir diperbarui |

### 4.5 `announcement` - Pengumuman

Tabel ini menyimpan pengumuman sekolah.

| Kolom | Fungsi |
|---|---|
| `id` | Primary key pengumuman |
| `title` | Judul pengumuman |
| `date` | Tanggal pengumuman |
| `content` | Isi pengumuman |
| `category` | Kategori pengumuman |
| `image` | Gambar pengumuman |
| `created_at` | Waktu data dibuat |
| `updated_at` | Waktu data terakhir diperbarui |

### 4.6 `gallery` - Galeri

Tabel ini menyimpan dokumentasi foto atau gambar sekolah.

| Kolom | Fungsi |
|---|---|
| `id` | Primary key galeri |
| `title` | Judul galeri |
| `image` | Gambar galeri |
| `description` | Deskripsi gambar |
| `category` | Kategori galeri |
| `created_at` | Waktu data dibuat |
| `updated_at` | Waktu data terakhir diperbarui |

## 5. Entitas PPDB

### 5.1 `admission_application` - Pendaftaran PPDB

Tabel ini menyimpan data calon siswa yang mendaftar melalui PPDB.

| Kolom | Fungsi |
|---|---|
| `id` | Primary key pendaftaran |
| `registration_type` | Jenis pendaftaran: `pendaftaran_baru` atau `siswa_pindahan` |
| `target_level` | Target jenjang: `tk`, `sd`, atau `smp` |
| `full_name` | Nama lengkap calon siswa |
| `national_student_id` | NISN calon siswa, jika ada |
| `birthplace` | Tempat lahir |
| `birth_date` | Tanggal lahir |
| `gender` | Jenis kelamin: `L` atau `P` |
| `religion` | Agama |
| `address` | Alamat calon siswa |
| `parent_name` | Nama orang tua/wali utama |
| `father_name` | Nama ayah |
| `mother_name` | Nama ibu |
| `father_occupation` | Pekerjaan ayah |
| `mother_occupation` | Pekerjaan ibu |
| `phone_number` | Nomor telepon pendaftar |
| `email` | Email pendaftar |
| `previous_school` | Asal sekolah |
| `status` | Status pendaftaran: `pending`, `diterima`, atau `ditolak` |
| `academic_year` | Tahun ajaran tujuan |
| `family_card_file` | Berkas kartu keluarga |
| `report_file` | Berkas rapor |
| `student_photo_file` | Foto calon siswa |
| `transfer_letter_file` | Surat pindah untuk siswa pindahan |
| `notification_note` | Catatan notifikasi atau keputusan |
| `created_at` | Waktu data dibuat |
| `updated_at` | Waktu data terakhir diperbarui |

Catatan relasi:

- Tabel ini belum memiliki FK ke `student`.
- Jika pendaftaran diterima dan calon siswa menjadi siswa aktif, proses konversi dari `admission_application` ke `student` dilakukan di level aplikasi.
- Jika ingin relasi lebih eksplisit, dapat ditambahkan kolom seperti `student_id` pada `admission_application` setelah calon siswa diterima.

## 6. Detail Relasi Antar Tabel

### 6.1 `classroom` ke `student`

```text
classroom 1 ----< N student
```

- Foreign key: `student.classroom_id`
- Referensi: `classroom.id`
- Kardinalitas: satu kelas memiliki banyak siswa.
- Ketika kelas dihapus: `student.classroom_id` menjadi `NULL`.
- Ketika ID kelas berubah: ikut `CASCADE`.

Makna bisnis:

Siswa boleh belum memiliki kelas, misalnya saat baru dibuat atau sedang proses penempatan kelas.

### 6.2 `user_account` ke `teacher_profile`

```text
user_account 1 ---- 1 teacher_profile
```

- Foreign key: `teacher_profile.user_account_id`
- Referensi: `user_account.id`
- Kardinalitas: satu akun guru memiliki satu profil guru.
- Constraint: `teacher_profile.user_account_id` unik.
- Ketika akun dihapus: profil guru ikut terhapus.

Makna bisnis:

Akun dengan role guru dapat melengkapi profil guru portal hanya satu kali.

### 6.3 `user_account` sebagai approver `teacher_profile`

```text
user_account 1 ----< N teacher_profile
```

- Foreign key: `teacher_profile.approved_by_user_account_id`
- Referensi: `user_account.id`
- Kardinalitas: satu user/admin dapat menyetujui banyak profil guru.
- Ketika approver dihapus: kolom approver menjadi `NULL`.

Makna bisnis:

Riwayat profil tetap tersimpan walaupun akun admin/verifikator dihapus.

### 6.4 `classroom` ke `teacher_profile`

```text
classroom 1 ----< N teacher_profile
```

- Foreign key: `teacher_profile.classroom_id`
- Referensi: `classroom.id`
- Kardinalitas: satu kelas dapat terkait dengan banyak profil guru.
- Ketika kelas dihapus: `teacher_profile.classroom_id` menjadi `NULL`.

Makna bisnis:

Relasi ini dipakai terutama untuk guru wali kelas atau guru yang terkait dengan kelas tertentu.

### 6.5 `user_account` ke `teaching_schedule`

```text
user_account 1 ----< N teaching_schedule
```

- Foreign key: `teaching_schedule.teacher_user_account_id`
- Referensi: `user_account.id`
- Kardinalitas: satu guru dapat memiliki banyak jadwal mengajar.
- Ketika akun guru dihapus: jadwal mengajar ikut terhapus.

Makna bisnis:

Jadwal mengajar bergantung pada akun guru.

### 6.6 `classroom` ke `teaching_schedule`

```text
classroom 1 ----< N teaching_schedule
```

- Foreign key: `teaching_schedule.classroom_id`
- Referensi: `classroom.id`
- Kardinalitas: satu kelas dapat memiliki banyak jadwal mengajar.
- Ketika kelas dihapus: jadwal mengajar ikut terhapus.

Makna bisnis:

Jadwal tidak dapat berdiri tanpa kelas.

### 6.7 `student` ke `student_attendance`

```text
student 1 ----< N student_attendance
```

- Foreign key: `student_attendance.student_id`
- Referensi: `student.id`
- Kardinalitas: satu siswa memiliki banyak catatan absensi.
- Ketika siswa dihapus: absensi siswa ikut terhapus.

Makna bisnis:

Absensi adalah riwayat milik siswa tertentu.

### 6.8 `classroom` ke `student_attendance`

```text
classroom 1 ----< N student_attendance
```

- Foreign key: `student_attendance.classroom_id`
- Referensi: `classroom.id`
- Kardinalitas: satu kelas memiliki banyak catatan absensi.
- Ketika kelas dihapus: absensi kelas ikut terhapus.

Makna bisnis:

Absensi disimpan berdasarkan kelas saat absensi dibuat.

### 6.9 `user_account` ke `student_attendance`

```text
user_account 1 ----< N student_attendance
```

- Foreign key: `student_attendance.teacher_user_account_id`
- Referensi: `user_account.id`
- Kardinalitas: satu guru dapat mencatat banyak absensi.
- Ketika akun guru dihapus: absensi yang dicatat guru ikut terhapus.

Makna bisnis:

Setiap catatan absensi memiliki informasi guru yang mencatat.

### 6.10 `teaching_schedule` ke `student_attendance`

```text
teaching_schedule 1 ----< N student_attendance
```

- Foreign key: `student_attendance.teaching_schedule_id`
- Referensi: `teaching_schedule.id`
- Kardinalitas: satu jadwal dapat digunakan pada banyak catatan absensi.
- Ketika jadwal dihapus: `student_attendance.teaching_schedule_id` menjadi `NULL`.

Makna bisnis:

Absensi tetap ada walaupun jadwal asalnya dihapus, karena jadwal hanya referensi tambahan.

### 6.11 `user_account` ke `portal_account_link`

```text
user_account 1 ----< N portal_account_link
```

- Foreign key: `portal_account_link.user_account_id`
- Referensi: `user_account.id`
- Kardinalitas: satu akun dapat memiliki banyak link portal.
- Ketika akun dihapus: link portal ikut terhapus.

Makna bisnis:

Akun orang tua dapat dihubungkan ke satu atau beberapa siswa.

### 6.12 `student` ke `portal_account_link`

```text
student 1 ----< N portal_account_link
```

- Foreign key: `portal_account_link.student_id`
- Referensi: `student.id`
- Kardinalitas: satu siswa dapat memiliki banyak link akun portal.
- Ketika siswa dihapus: link portal ikut terhapus.

Makna bisnis:

Satu siswa bisa memiliki akun siswa sendiri dan akun orang tua yang terhubung.

## 7. Alur Data Utama

### 7.1 Alur Akun Guru

1. Data akun dibuat di `user_account` dengan `role = 'guru'`.
2. Guru mengisi profil di `teacher_profile`.
3. Profil guru diverifikasi oleh admin melalui `approved_by_user_account_id`.
4. Setelah disetujui, guru dapat memiliki jadwal di `teaching_schedule`.
5. Guru dapat mencatat absensi siswa di `student_attendance`.

### 7.2 Alur Data Siswa

1. Data siswa disimpan di `student`.
2. Siswa ditempatkan pada kelas melalui `student.classroom_id`.
3. Jika siswa/orang tua memiliki akun portal, relasi dibuat di `portal_account_link`.
4. Kehadiran siswa dicatat di `student_attendance`.

### 7.3 Alur Jadwal dan Absensi

1. Admin/guru membuat jadwal mengajar di `teaching_schedule`.
2. Jadwal mengajar menghubungkan guru, kelas, mata pelajaran, hari, dan jam.
3. Saat absensi dilakukan, sistem membuat data di `student_attendance`.
4. Absensi dapat terhubung ke jadwal melalui `teaching_schedule_id`.

### 7.4 Alur PPDB

1. Calon siswa mengisi formulir pendaftaran.
2. Data masuk ke `admission_application`.
3. Admin memproses status menjadi `pending`, `diterima`, atau `ditolak`.
4. Jika diterima, data calon siswa dapat dibuat menjadi data siswa di `student`.
5. Saat ini relasi PPDB ke siswa belum otomatis menggunakan FK.

### 7.5 Alur Konten Website

1. Admin mengelola profil sekolah di `school_profile`.
2. Admin mengelola data guru publik di `teacher`.
3. Admin mengelola kepala sekolah di `principal`.
4. Admin mengelola kegiatan di `activity`.
5. Admin mengelola pengumuman di `announcement`.
6. Admin mengelola galeri di `gallery`.

## 8. Tabel yang Berdiri Sendiri

Beberapa tabel belum memiliki foreign key langsung ke tabel lain.

| Tabel | Fungsi | Catatan |
|---|---|---|
| `teacher` | Data guru untuk informasi sekolah | Belum terhubung ke akun guru |
| `principal` | Data kepala sekolah | Belum terhubung ke user/admin |
| `admission_application` | Data pendaftaran PPDB | Belum terhubung ke `student` |
| `school_profile` | Profil umum sekolah | Biasanya satu data aktif |
| `activity` | Data kegiatan | Konten mandiri |
| `announcement` | Data pengumuman | Konten mandiri |
| `gallery` | Data galeri | Konten mandiri |

## 9. Ringkasan Kardinalitas

| Relasi | Kardinalitas | Penjelasan Singkat |
|---|---|---|
| `classroom` ke `student` | 1:N | Satu kelas punya banyak siswa |
| `user_account` ke `teacher_profile` | 1:1 | Satu akun guru punya satu profil guru |
| `user_account` ke `teacher_profile` sebagai approver | 1:N | Satu admin menyetujui banyak profil guru |
| `classroom` ke `teacher_profile` | 1:N | Satu kelas bisa terkait banyak profil guru |
| `user_account` ke `teaching_schedule` | 1:N | Satu guru punya banyak jadwal |
| `classroom` ke `teaching_schedule` | 1:N | Satu kelas punya banyak jadwal |
| `student` ke `student_attendance` | 1:N | Satu siswa punya banyak absensi |
| `classroom` ke `student_attendance` | 1:N | Satu kelas punya banyak absensi |
| `user_account` ke `student_attendance` | 1:N | Satu guru mencatat banyak absensi |
| `teaching_schedule` ke `student_attendance` | 1:N | Satu jadwal punya banyak absensi |
| `user_account` ke `portal_account_link` | 1:N | Satu akun punya banyak link portal |
| `student` ke `portal_account_link` | 1:N | Satu siswa punya banyak akun portal terkait |

## 10. Catatan Integritas Data

### 10.1 Cascade Delete

Beberapa relasi menggunakan `onDelete: CASCADE`. Artinya jika data induk dihapus, data anak ikut terhapus.

Contoh:

- Jika `student` dihapus, maka `student_attendance` siswa tersebut ikut terhapus.
- Jika `user_account` guru dihapus, maka `teaching_schedule` guru tersebut ikut terhapus.
- Jika `user_account` dihapus, maka `portal_account_link` ikut terhapus.

### 10.2 Set Null

Beberapa relasi menggunakan `onDelete: SET NULL`. Artinya jika data induk dihapus, foreign key pada data anak diubah menjadi `NULL`.

Contoh:

- Jika `classroom` dihapus, `student.classroom_id` menjadi `NULL`.
- Jika `teaching_schedule` dihapus, `student_attendance.teaching_schedule_id` menjadi `NULL`.
- Jika approver dihapus, `teacher_profile.approved_by_user_account_id` menjadi `NULL`.

### 10.3 Unique Key

Beberapa kolom dibuat unik agar tidak terjadi duplikasi data penting.

| Tabel | Kolom Unique | Fungsi |
|---|---|---|
| `user_account` | `email` | Satu email hanya untuk satu akun |
| `student` | `national_student_id` | Satu NISN hanya untuk satu siswa |
| `teacher_profile` | `user_account_id` | Satu akun hanya punya satu profil guru |
| `teacher` | `employee_number` | Satu NIP hanya untuk satu guru |
| `principal` | `employee_number` | Satu NIP hanya untuk satu kepala sekolah |

## 11. Catatan Perbaikan Desain Database

Bagian ini bukan error, tetapi rekomendasi jika database ingin dibuat lebih konsisten dan production-ready.

### 11.1 Hubungkan `teacher` dengan `user_account`

Saat ini tabel `teacher` dan `teacher_profile` terpisah. Jika data guru publik dan akun guru ingin disatukan, bisa tambahkan salah satu:

- `teacher.user_account_id`
- atau `teacher_profile.teacher_id`

Manfaat:

- Menghindari data guru ganda.
- Mempermudah sinkronisasi profil guru dan akun login.

### 11.2 Hubungkan `admission_application` dengan `student`

Saat calon siswa diterima, data PPDB dapat dikonversi menjadi siswa. Agar riwayat tetap jelas, bisa ditambahkan:

```text
admission_application.student_id -> student.id
```

Manfaat:

- Riwayat asal siswa dari PPDB jelas.
- Admin bisa melacak pendaftaran mana yang menghasilkan data siswa.

### 11.3 Batasi `school_profile` Menjadi Satu Data Aktif

Jika sistem hanya membutuhkan satu profil sekolah aktif, dapat ditambahkan mekanisme:

- Kolom `is_active`
- Validasi aplikasi agar hanya satu data aktif
- Atau konfigurasi singleton di level service

### 11.4 Tambahkan Constraint pada `portal_account_link`

Untuk menghindari link duplikat, bisa ditambahkan unique composite:

```text
UNIQUE(user_account_id, student_id, link_type)
```

Manfaat:

- Akun yang sama tidak terhubung berkali-kali ke siswa yang sama dengan tipe link yang sama.

## 12. Kesimpulan

ERD Portal CNB terdiri dari 14 tabel utama. Pusat relasi sistem berada pada tabel `user_account`, `classroom`, dan `student`.

- `user_account` menjadi pusat akun login, guru, approver, absensi, dan portal siswa/orang tua.
- `classroom` menjadi pusat data akademik kelas, siswa, jadwal, dan absensi.
- `student` menjadi pusat data siswa, absensi, dan akun portal terkait.
- Tabel konten seperti `activity`, `announcement`, dan `gallery` berdiri sendiri untuk kebutuhan website sekolah.
- Tabel `admission_application` menyimpan proses PPDB, tetapi belum memiliki relasi langsung ke tabel `student`.

Dengan struktur ini, sistem sudah dapat mendukung fitur utama portal sekolah: manajemen akun, data siswa, kelas, jadwal mengajar, absensi, PPDB, dan konten website sekolah.
