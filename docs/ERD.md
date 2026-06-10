# ERD Portal CNB

Dokumen ini disusun dari model Sequelize di `backend/src/models`. Nama kolom memakai nama fisik database (`field` Sequelize), bukan alias property JavaScript. Semua tabel memakai `timestamps: true` dan `underscored: true`, sehingga memiliki kolom `created_at` dan `updated_at`.

## Diagram ERD

```mermaid
erDiagram
  USER_ACCOUNT ||--o| TEACHER_PROFILE : "has profile"
  USER_ACCOUNT ||--o{ TEACHER_PROFILE : "approves"
  USER_ACCOUNT ||--o{ TEACHING_SCHEDULE : "teaches"
  USER_ACCOUNT ||--o{ STUDENT_ATTENDANCE : "records"
  USER_ACCOUNT ||--o{ PORTAL_ACCOUNT_LINK : "owns"

  CLASSROOM ||--o{ STUDENT : "contains"
  CLASSROOM ||--o{ TEACHER_PROFILE : "homeroom"
  CLASSROOM ||--o{ TEACHING_SCHEDULE : "scheduled for"
  CLASSROOM ||--o{ STUDENT_ATTENDANCE : "attendance in"

  STUDENT ||--o{ STUDENT_ATTENDANCE : "has"
  STUDENT ||--o{ PORTAL_ACCOUNT_LINK : "linked to"

  TEACHING_SCHEDULE ||--o{ STUDENT_ATTENDANCE : "source schedule"

  USER_ACCOUNT {
    int id PK
    string name
    string email UK
    string password
    enum role
    string profession
    datetime created_at
    datetime updated_at
  }

  CLASSROOM {
    int id PK
    string class_name
    string grade_level
    string homeroom_teacher
    string academic_year
    int student_count
    string room
    datetime created_at
    datetime updated_at
  }

  STUDENT {
    int id PK
    string national_student_id UK
    string name
    int classroom_id FK
    string birthplace
    date birth_date
    enum gender
    string religion
    text address
    string father_name
    string mother_name
    string phone_number
    string email
    text photo
    enum status
    datetime created_at
    datetime updated_at
  }

  TEACHER_PROFILE {
    int id PK
    int user_account_id FK_UK
    enum teacher_type
    string subject
    int classroom_id FK
    enum verification_status
    text note
    int approved_by_user_account_id FK
    datetime approved_at
    datetime created_at
    datetime updated_at
  }

  TEACHING_SCHEDULE {
    int id PK
    int teacher_user_account_id FK
    int classroom_id FK
    string subject
    enum day_name
    time start_time
    time end_time
    enum status
    datetime created_at
    datetime updated_at
  }

  STUDENT_ATTENDANCE {
    int id PK
    int student_id FK
    int classroom_id FK
    int teacher_user_account_id FK
    int teaching_schedule_id FK
    date attendance_date
    string day_name
    enum teacher_type
    string subject
    enum status
    text note
    datetime created_at
    datetime updated_at
  }

  PORTAL_ACCOUNT_LINK {
    int id PK
    int user_account_id FK
    int student_id FK
    enum link_type
    datetime created_at
    datetime updated_at
  }

  TEACHER {
    int id PK
    string employee_number UK
    string name
    string email
    string phone_number
    string subject
    string last_education
    text photo
    text address
    date birth_date
    enum gender
    enum status
    datetime created_at
    datetime updated_at
  }

  PRINCIPAL {
    int id PK
    string employee_number UK
    string name
    string email
    string phone_number
    text photo
    date start_period
    date end_period
    text address
    string last_education
    enum status
    datetime created_at
    datetime updated_at
  }

  ADMISSION_APPLICATION {
    int id PK
    enum registration_type
    enum target_level
    string full_name
    string national_student_id
    string birthplace
    date birth_date
    enum gender
    string religion
    text address
    string parent_name
    string father_name
    string mother_name
    string father_occupation
    string mother_occupation
    string phone_number
    string email
    string previous_school
    enum status
    string academic_year
    longtext family_card_file
    longtext report_file
    longtext student_photo_file
    longtext transfer_letter_file
    text notification_note
    datetime created_at
    datetime updated_at
  }

  SCHOOL_PROFILE {
    int id PK
    string school_name
    string npsn
    text address
    string phone_number
    string email
    string website
    text logo
    text vision
    text mission
    text history
    text facility
    text school_structure
    string accreditation
    datetime created_at
    datetime updated_at
  }

  ACTIVITY {
    int id PK
    string title
    date date
    text description
    string image
    datetime created_at
    datetime updated_at
  }

  ANNOUNCEMENT {
    int id PK
    string title
    date date
    text content
    string category
    text image
    datetime created_at
    datetime updated_at
  }

  GALLERY {
    int id PK
    string title
    longtext image
    text description
    string category
    datetime created_at
    datetime updated_at
  }
```

## Daftar Tabel dan Kolom

### 1. `user_account`
| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | INTEGER | PK, auto increment | ID akun pengguna |
| `name` | STRING | NOT NULL | Nama pengguna |
| `email` | STRING | NOT NULL, UNIQUE | Email login |
| `password` | STRING | NOT NULL | Password hash |
| `role` | ENUM(`admin`, `guru`, `siswa`, `orangtua`) | DEFAULT `siswa` | Role akun |
| `profession` | STRING | NULL | Profesi pengguna |
| `created_at` | DATETIME | NOT NULL | Waktu dibuat |
| `updated_at` | DATETIME | NOT NULL | Waktu diubah |

### 2. `classroom`
| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | INTEGER | PK, auto increment | ID kelas |
| `class_name` | STRING | NOT NULL | Nama kelas |
| `grade_level` | STRING | NOT NULL | Tingkat/jenjang kelas |
| `homeroom_teacher` | STRING | NULL | Nama wali kelas teks/manual |
| `academic_year` | STRING | NOT NULL | Tahun ajaran |
| `student_count` | INTEGER | DEFAULT `0` | Jumlah siswa |
| `room` | STRING | NULL | Ruangan kelas |
| `created_at` | DATETIME | NOT NULL | Waktu dibuat |
| `updated_at` | DATETIME | NOT NULL | Waktu diubah |

### 3. `student`
| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | INTEGER | PK, auto increment | ID siswa |
| `national_student_id` | STRING | NOT NULL, UNIQUE | NISN |
| `name` | STRING | NOT NULL | Nama siswa |
| `classroom_id` | INTEGER | FK -> `classroom.id`, NULL | Kelas siswa |
| `birthplace` | STRING | NULL | Tempat lahir |
| `birth_date` | DATEONLY | NULL | Tanggal lahir |
| `gender` | ENUM(`L`, `P`) | NOT NULL | Jenis kelamin |
| `religion` | STRING | NULL | Agama |
| `address` | TEXT | NULL | Alamat |
| `father_name` | STRING | NULL | Nama ayah |
| `mother_name` | STRING | NULL | Nama ibu |
| `phone_number` | STRING | NULL | Nomor telepon |
| `email` | STRING | NULL | Email siswa/orangtua |
| `photo` | TEXT | NULL | Foto siswa |
| `status` | ENUM(`aktif`, `lulus`, `pindah`, `keluar`) | DEFAULT `aktif` | Status siswa |
| `created_at` | DATETIME | NOT NULL | Waktu dibuat |
| `updated_at` | DATETIME | NOT NULL | Waktu diubah |

### 4. `teacher_profile`
| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | INTEGER | PK, auto increment | ID profil guru portal |
| `user_account_id` | INTEGER | FK -> `user_account.id`, NOT NULL, UNIQUE | Akun guru |
| `teacher_type` | ENUM(`wali_kelas`, `mapel`) | NOT NULL, DEFAULT `mapel` | Jenis guru |
| `subject` | STRING | NULL | Mata pelajaran |
| `classroom_id` | INTEGER | FK -> `classroom.id`, NULL | Kelas wali jika wali kelas |
| `verification_status` | ENUM(`pending`, `approved`, `rejected`) | DEFAULT `pending` | Status verifikasi profil |
| `note` | TEXT | NULL | Catatan verifikasi |
| `approved_by_user_account_id` | INTEGER | FK -> `user_account.id`, NULL | Admin/pengguna yang menyetujui |
| `approved_at` | DATETIME | NULL | Waktu persetujuan |
| `created_at` | DATETIME | NOT NULL | Waktu dibuat |
| `updated_at` | DATETIME | NOT NULL | Waktu diubah |

### 5. `teaching_schedule`
| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | INTEGER | PK, auto increment | ID jadwal mengajar |
| `teacher_user_account_id` | INTEGER | FK -> `user_account.id`, NOT NULL | Akun guru pengajar |
| `classroom_id` | INTEGER | FK -> `classroom.id`, NOT NULL | Kelas yang diajar |
| `subject` | STRING | NOT NULL | Mata pelajaran |
| `day_name` | ENUM(`senin`, `selasa`, `rabu`, `kamis`, `jumat`, `sabtu`, `minggu`) | NOT NULL | Hari |
| `start_time` | TIME | NOT NULL | Jam mulai |
| `end_time` | TIME | NOT NULL | Jam selesai |
| `status` | ENUM(`aktif`, `non-aktif`) | DEFAULT `aktif` | Status jadwal |
| `created_at` | DATETIME | NOT NULL | Waktu dibuat |
| `updated_at` | DATETIME | NOT NULL | Waktu diubah |

### 6. `student_attendance`
| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | INTEGER | PK, auto increment | ID absensi siswa |
| `student_id` | INTEGER | FK -> `student.id`, NOT NULL | Siswa yang diabsen |
| `classroom_id` | INTEGER | FK -> `classroom.id`, NOT NULL | Kelas absensi |
| `teacher_user_account_id` | INTEGER | FK -> `user_account.id`, NOT NULL | Guru pencatat absensi |
| `teaching_schedule_id` | INTEGER | FK -> `teaching_schedule.id`, NULL | Jadwal terkait |
| `attendance_date` | DATEONLY | NOT NULL | Tanggal absensi |
| `day_name` | STRING | NOT NULL | Nama hari |
| `teacher_type` | ENUM(`wali_kelas`, `mapel`) | NOT NULL | Jenis guru pencatat |
| `subject` | STRING | NULL | Mata pelajaran jika guru mapel |
| `status` | ENUM(`hadir`, `izin`, `sakit`, `alpha`) | NOT NULL, DEFAULT `hadir` | Status kehadiran |
| `note` | TEXT | NULL | Keterangan absensi |
| `created_at` | DATETIME | NOT NULL | Waktu dibuat |
| `updated_at` | DATETIME | NOT NULL | Waktu diubah |

### 7. `portal_account_link`
| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | INTEGER | PK, auto increment | ID link akun portal |
| `user_account_id` | INTEGER | FK -> `user_account.id`, NOT NULL | Akun siswa/orangtua |
| `student_id` | INTEGER | FK -> `student.id`, NOT NULL | Siswa yang terhubung |
| `link_type` | ENUM(`siswa`, `orangtua`) | NOT NULL | Jenis relasi akun |
| `created_at` | DATETIME | NOT NULL | Waktu dibuat |
| `updated_at` | DATETIME | NOT NULL | Waktu diubah |

### 8. `teacher`
| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | INTEGER | PK, auto increment | ID data guru publik/admin |
| `employee_number` | STRING | NOT NULL, UNIQUE | NIP |
| `name` | STRING | NOT NULL | Nama guru |
| `email` | STRING | NULL | Email guru |
| `phone_number` | STRING | NULL | Nomor telepon |
| `subject` | STRING | NULL | Mata pelajaran |
| `last_education` | STRING | NULL | Pendidikan terakhir |
| `photo` | TEXT | NULL | Foto guru |
| `address` | TEXT | NULL | Alamat |
| `birth_date` | DATEONLY | NULL | Tanggal lahir |
| `gender` | ENUM(`L`, `P`) | NULL | Jenis kelamin |
| `status` | ENUM(`aktif`, `non-aktif`) | DEFAULT `aktif` | Status guru |
| `created_at` | DATETIME | NOT NULL | Waktu dibuat |
| `updated_at` | DATETIME | NOT NULL | Waktu diubah |

### 9. `principal`
| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | INTEGER | PK, auto increment | ID kepala sekolah |
| `employee_number` | STRING | NOT NULL, UNIQUE | NIP |
| `name` | STRING | NOT NULL | Nama kepala sekolah |
| `email` | STRING | NULL | Email |
| `phone_number` | STRING | NULL | Nomor telepon |
| `photo` | TEXT | NULL | Foto |
| `start_period` | DATEONLY | NOT NULL | Awal periode |
| `end_period` | DATEONLY | NULL | Akhir periode |
| `address` | TEXT | NULL | Alamat |
| `last_education` | STRING | NULL | Pendidikan terakhir |
| `status` | ENUM(`aktif`, `non-aktif`) | DEFAULT `aktif` | Status kepala sekolah |
| `created_at` | DATETIME | NOT NULL | Waktu dibuat |
| `updated_at` | DATETIME | NOT NULL | Waktu diubah |

### 10. `admission_application`
| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | INTEGER | PK, auto increment | ID pendaftaran PPDB |
| `registration_type` | ENUM(`pendaftaran_baru`, `siswa_pindahan`) | NOT NULL, DEFAULT `pendaftaran_baru` | Jenis pendaftaran |
| `target_level` | ENUM(`tk`, `sd`, `smp`) | NOT NULL, DEFAULT `tk` | Target jenjang |
| `full_name` | STRING | NOT NULL | Nama lengkap calon siswa |
| `national_student_id` | STRING | NULL | NISN calon siswa |
| `birthplace` | STRING | NULL | Tempat lahir |
| `birth_date` | DATEONLY | NOT NULL | Tanggal lahir |
| `gender` | ENUM(`L`, `P`) | NOT NULL | Jenis kelamin |
| `religion` | STRING | NULL | Agama |
| `address` | TEXT | NOT NULL | Alamat |
| `parent_name` | STRING | NOT NULL | Nama orang tua/wali |
| `father_name` | STRING | NULL | Nama ayah |
| `mother_name` | STRING | NULL | Nama ibu |
| `father_occupation` | STRING | NULL | Pekerjaan ayah |
| `mother_occupation` | STRING | NULL | Pekerjaan ibu |
| `phone_number` | STRING | NOT NULL | Nomor telepon |
| `email` | STRING | NOT NULL | Email pendaftar |
| `previous_school` | STRING | NULL | Asal sekolah |
| `status` | ENUM(`pending`, `diterima`, `ditolak`) | DEFAULT `pending` | Status pendaftaran |
| `academic_year` | STRING | NOT NULL | Tahun ajaran |
| `family_card_file` | LONGTEXT | NULL | Berkas KK |
| `report_file` | LONGTEXT | NULL | Berkas rapor |
| `student_photo_file` | LONGTEXT | NULL | Foto siswa |
| `transfer_letter_file` | LONGTEXT | NULL | Surat pindah |
| `notification_note` | TEXT | NULL | Catatan notifikasi |
| `created_at` | DATETIME | NOT NULL | Waktu dibuat |
| `updated_at` | DATETIME | NOT NULL | Waktu diubah |

### 11. `school_profile`
| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | INTEGER | PK, auto increment | ID profil sekolah |
| `school_name` | STRING | NOT NULL | Nama sekolah |
| `npsn` | STRING | NULL | NPSN |
| `address` | TEXT | NULL | Alamat sekolah |
| `phone_number` | STRING | NULL | Telepon sekolah |
| `email` | STRING | NULL | Email sekolah |
| `website` | STRING | NULL | Website sekolah |
| `logo` | TEXT | NULL | Logo sekolah |
| `vision` | TEXT | NULL | Visi |
| `mission` | TEXT | NULL | Misi |
| `history` | TEXT | NULL | Sejarah |
| `facility` | TEXT | NULL | Fasilitas |
| `school_structure` | TEXT | NULL | Struktur sekolah |
| `accreditation` | STRING | NULL | Akreditasi |
| `created_at` | DATETIME | NOT NULL | Waktu dibuat |
| `updated_at` | DATETIME | NOT NULL | Waktu diubah |

### 12. `activity`
| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | INTEGER | PK, auto increment | ID kegiatan |
| `title` | STRING | NOT NULL | Judul kegiatan |
| `date` | DATEONLY | NOT NULL | Tanggal kegiatan |
| `description` | TEXT | NOT NULL | Deskripsi kegiatan |
| `image` | STRING | NULL | Gambar kegiatan |
| `created_at` | DATETIME | NOT NULL | Waktu dibuat |
| `updated_at` | DATETIME | NOT NULL | Waktu diubah |

### 13. `announcement`
| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | INTEGER | PK, auto increment | ID pengumuman |
| `title` | STRING | NOT NULL | Judul pengumuman |
| `date` | DATEONLY | NOT NULL | Tanggal pengumuman |
| `content` | TEXT | NOT NULL | Isi pengumuman |
| `category` | STRING | NULL | Kategori |
| `image` | TEXT | NULL | Gambar pengumuman |
| `created_at` | DATETIME | NOT NULL | Waktu dibuat |
| `updated_at` | DATETIME | NOT NULL | Waktu diubah |

### 14. `gallery`
| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | INTEGER | PK, auto increment | ID galeri |
| `title` | STRING | NOT NULL | Judul galeri |
| `image` | LONGTEXT | NOT NULL | File/URL gambar |
| `description` | TEXT | NULL | Deskripsi gambar |
| `category` | STRING | NULL | Kategori galeri |
| `created_at` | DATETIME | NOT NULL | Waktu dibuat |
| `updated_at` | DATETIME | NOT NULL | Waktu diubah |

## Relasi Detail

| Dari Tabel | Kolom FK | Ke Tabel | Kardinalitas | On Delete | On Update | Keterangan |
|---|---|---|---|---|---|---|
| `student` | `classroom_id` | `classroom.id` | Banyak siswa ke satu kelas | SET NULL | CASCADE | Siswa boleh tidak punya kelas |
| `teacher_profile` | `user_account_id` | `user_account.id` | Satu akun ke satu profil guru | CASCADE | CASCADE | `user_account_id` bersifat unique |
| `teacher_profile` | `approved_by_user_account_id` | `user_account.id` | Banyak profil disetujui satu user | SET NULL | CASCADE | Biasanya admin/verifikator |
| `teacher_profile` | `classroom_id` | `classroom.id` | Banyak profil wali ke satu kelas | SET NULL | CASCADE | Dipakai untuk wali kelas |
| `teaching_schedule` | `teacher_user_account_id` | `user_account.id` | Banyak jadwal ke satu guru | CASCADE | CASCADE | Guru pengajar berdasarkan akun |
| `teaching_schedule` | `classroom_id` | `classroom.id` | Banyak jadwal ke satu kelas | CASCADE | CASCADE | Jadwal kelas |
| `student_attendance` | `student_id` | `student.id` | Banyak absensi ke satu siswa | CASCADE | CASCADE | Riwayat absensi siswa |
| `student_attendance` | `classroom_id` | `classroom.id` | Banyak absensi ke satu kelas | CASCADE | CASCADE | Kelas saat absensi dibuat |
| `student_attendance` | `teacher_user_account_id` | `user_account.id` | Banyak absensi ke satu guru | CASCADE | CASCADE | Guru pencatat absensi |
| `student_attendance` | `teaching_schedule_id` | `teaching_schedule.id` | Banyak absensi ke satu jadwal | SET NULL | CASCADE | Jadwal opsional |
| `portal_account_link` | `user_account_id` | `user_account.id` | Banyak link ke satu akun | CASCADE | CASCADE | Akun siswa/orangtua |
| `portal_account_link` | `student_id` | `student.id` | Banyak link ke satu siswa | CASCADE | CASCADE | Satu siswa bisa punya akun siswa dan orangtua |

## Tabel Tanpa Relasi FK Langsung

Tabel berikut berdiri sendiri berdasarkan model saat ini:

- `teacher`
- `principal`
- `admission_application`
- `school_profile`
- `activity`
- `announcement`
- `gallery`

## Catatan Penting

- Tabel `teacher` dan `teacher_profile` sama-sama menyimpan data guru, tetapi belum memiliki FK langsung satu sama lain. `teacher_profile` terhubung ke akun login `user_account`.
- Kolom `classroom.homeroom_teacher` masih berupa teks, sedangkan relasi wali kelas yang lebih terstruktur ada di `teacher_profile.classroom_id` dengan `teacher_type = 'wali_kelas'`.
- Tabel `admission_application` belum otomatis berelasi ke `student`, walaupun sama-sama memiliki NISN/nama siswa. Jika PPDB diterima lalu menjadi siswa, relasi atau proses migrasi data perlu ditentukan di level aplikasi.
