# ERD Portal CNB

Dokumen ini disusun dari model Sequelize di `backend/src/models`. Nama kolom memakai nama fisik database (`field` Sequelize), bukan alias property JavaScript. Semua tabel memakai `timestamps: true` dan `underscored: true`, sehingga memiliki kolom `dibuat_pada` dan `diperbarui_pada`.

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
    datetime dibuat_pada
    datetime diperbarui_pada
  }

  CLASSROOM {
    int id PK
    string class_name
    string grade_level
    string wali_kelas
    string academic_year
    int siswa_count
    string room
    datetime dibuat_pada
    datetime diperbarui_pada
  }

  STUDENT {
    int id PK
    string national_siswa_id UK
    string name
    int kelas_id FK
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
    datetime dibuat_pada
    datetime diperbarui_pada
  }

  TEACHER_PROFILE {
    int id PK
    int akun_pengguna_id FK_UK
    enum tipe_guru
    string mata_pelajaran
    int kelas_id FK
    enum verification_status
    text note
    int disetujui_oleh_akun_pengguna_id FK
    datetime approved_at
    datetime dibuat_pada
    datetime diperbarui_pada
  }

  TEACHING_SCHEDULE {
    int id PK
    int guru_akun_pengguna_id FK
    int kelas_id FK
    string mata_pelajaran
    enum day_name
    time start_time
    time end_time
    enum status
    datetime dibuat_pada
    datetime diperbarui_pada
  }

  STUDENT_ATTENDANCE {
    int id PK
    int siswa_id FK
    int kelas_id FK
    int guru_akun_pengguna_id FK
    int jadwal_mengajar_id FK
    date attendance_date
    string day_name
    enum tipe_guru
    string mata_pelajaran
    enum status
    text note
    datetime dibuat_pada
    datetime diperbarui_pada
  }

  PORTAL_ACCOUNT_LINK {
    int id PK
    int akun_pengguna_id FK
    int siswa_id FK
    enum link_type
    datetime dibuat_pada
    datetime diperbarui_pada
  }

  TEACHER {
    int id PK
    string employee_number UK
    string name
    string email
    string phone_number
    string mata_pelajaran
    string last_education
    text photo
    text address
    date birth_date
    enum gender
    enum status
    datetime dibuat_pada
    datetime diperbarui_pada
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
    datetime dibuat_pada
    datetime diperbarui_pada
  }

  ADMISSION_APPLICATION {
    int id PK
    enum registration_type
    enum target_level
    string full_name
    string national_siswa_id
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
    longtext siswa_photo_file
    longtext transfer_letter_file
    text notification_note
    datetime dibuat_pada
    datetime diperbarui_pada
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
    datetime dibuat_pada
    datetime diperbarui_pada
  }

  ACTIVITY {
    int id PK
    string title
    date date
    text description
    string image
    datetime dibuat_pada
    datetime diperbarui_pada
  }

  ANNOUNCEMENT {
    int id PK
    string title
    date date
    text content
    string category
    text image
    datetime dibuat_pada
    datetime diperbarui_pada
  }

  GALLERY {
    int id PK
    string title
    longtext image
    text description
    string category
    datetime dibuat_pada
    datetime diperbarui_pada
  }
```

## Daftar Tabel dan Kolom

### 1. `akun_pengguna`
| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | INTEGER | PK, auto increment | ID akun pengguna |
| `name` | STRING | NOT NULL | Nama pengguna |
| `email` | STRING | NOT NULL, UNIQUE | Email masuk |
| `password` | STRING | NOT NULL | Hash kata sandi |
| `role` | ENUM(`admin`, `guru`, `siswa`, `orangtua`) | DEFAULT `siswa` | Peran akun |
| `profession` | STRING | NULL | Profesi pengguna |
| `dibuat_pada` | DATETIME | NOT NULL | Waktu dibuat |
| `diperbarui_pada` | DATETIME | NOT NULL | Waktu diubah |

### 2. `kelas`
| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | INTEGER | PK, auto increment | ID kelas |
| `class_name` | STRING | NOT NULL | Nama kelas |
| `grade_level` | STRING | NOT NULL | Tingkat/jenjang kelas |
| `wali_kelas` | STRING | NULL | Nama wali kelas teks/manual |
| `academic_year` | STRING | NOT NULL | Tahun ajaran |
| `siswa_count` | INTEGER | DEFAULT `0` | Jumlah siswa |
| `room` | STRING | NULL | Ruangan kelas |
| `dibuat_pada` | DATETIME | NOT NULL | Waktu dibuat |
| `diperbarui_pada` | DATETIME | NOT NULL | Waktu diubah |

### 3. `siswa`
| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | INTEGER | PK, auto increment | ID siswa |
| `national_siswa_id` | STRING | NOT NULL, UNIQUE | NISN |
| `name` | STRING | NOT NULL | Nama siswa |
| `kelas_id` | INTEGER | FK -> `kelas.id`, NULL | Kelas siswa |
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
| `dibuat_pada` | DATETIME | NOT NULL | Waktu dibuat |
| `diperbarui_pada` | DATETIME | NOT NULL | Waktu diubah |

### 4. `profil_guru`
| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | INTEGER | PK, auto increment | ID profil guru portal |
| `akun_pengguna_id` | INTEGER | FK -> `akun_pengguna.id`, NOT NULL, UNIQUE | Akun guru |
| `tipe_guru` | ENUM(`wali_kelas`, `mapel`) | NOT NULL, DEFAULT `mapel` | Jenis guru |
| `mata_pelajaran` | STRING | NULL | Mata pelajaran |
| `kelas_id` | INTEGER | FK -> `kelas.id`, NULL | Kelas wali jika wali kelas |
| `verification_status` | ENUM(`pending`, `approved`, `rejected`) | DEFAULT `pending` | Status verifikasi profil |
| `note` | TEXT | NULL | Catatan verifikasi |
| `disetujui_oleh_akun_pengguna_id` | INTEGER | FK -> `akun_pengguna.id`, NULL | Administrator/pengguna yang menyetujui |
| `approved_at` | DATETIME | NULL | Waktu persetujuan |
| `dibuat_pada` | DATETIME | NOT NULL | Waktu dibuat |
| `diperbarui_pada` | DATETIME | NOT NULL | Waktu diubah |

### 5. `jadwal_mengajar`
| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | INTEGER | PK, auto increment | ID jadwal mengajar |
| `guru_akun_pengguna_id` | INTEGER | FK -> `akun_pengguna.id`, NOT NULL | Akun guru pengajar |
| `kelas_id` | INTEGER | FK -> `kelas.id`, NOT NULL | Kelas yang diajar |
| `mata_pelajaran` | STRING | NOT NULL | Mata pelajaran |
| `day_name` | ENUM(`senin`, `selasa`, `rabu`, `kamis`, `jumat`, `sabtu`, `minggu`) | NOT NULL | Hari |
| `start_time` | TIME | NOT NULL | Jam mulai |
| `end_time` | TIME | NOT NULL | Jam selesai |
| `status` | ENUM(`aktif`, `non-aktif`) | DEFAULT `aktif` | Status jadwal |
| `dibuat_pada` | DATETIME | NOT NULL | Waktu dibuat |
| `diperbarui_pada` | DATETIME | NOT NULL | Waktu diubah |

### 6. `absensi_siswa`
| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | INTEGER | PK, auto increment | ID absensi siswa |
| `siswa_id` | INTEGER | FK -> `siswa.id`, NOT NULL | Siswa yang diabsen |
| `kelas_id` | INTEGER | FK -> `kelas.id`, NOT NULL | Kelas absensi |
| `guru_akun_pengguna_id` | INTEGER | FK -> `akun_pengguna.id`, NOT NULL | Guru pencatat absensi |
| `jadwal_mengajar_id` | INTEGER | FK -> `jadwal_mengajar.id`, NULL | Jadwal terkait |
| `attendance_date` | DATEONLY | NOT NULL | Tanggal absensi |
| `day_name` | STRING | NOT NULL | Nama hari |
| `tipe_guru` | ENUM(`wali_kelas`, `mapel`) | NOT NULL | Jenis guru pencatat |
| `mata_pelajaran` | STRING | NULL | Mata pelajaran jika guru mapel |
| `status` | ENUM(`hadir`, `izin`, `sakit`, `alpha`) | NOT NULL, DEFAULT `hadir` | Status kehadiran |
| `note` | TEXT | NULL | Keterangan absensi |
| `dibuat_pada` | DATETIME | NOT NULL | Waktu dibuat |
| `diperbarui_pada` | DATETIME | NOT NULL | Waktu diubah |

### 7. `tautan_akun_portal`
| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | INTEGER | PK, auto increment | ID link akun portal |
| `akun_pengguna_id` | INTEGER | FK -> `akun_pengguna.id`, NOT NULL | Akun siswa/orangtua |
| `siswa_id` | INTEGER | FK -> `siswa.id`, NOT NULL | Siswa yang terhubung |
| `link_type` | ENUM(`siswa`, `orangtua`) | NOT NULL | Jenis relasi akun |
| `dibuat_pada` | DATETIME | NOT NULL | Waktu dibuat |
| `diperbarui_pada` | DATETIME | NOT NULL | Waktu diubah |

### 8. `guru`
| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | INTEGER | PK, auto increment | ID data guru publik/admin |
| `employee_number` | STRING | NOT NULL, UNIQUE | NIP |
| `name` | STRING | NOT NULL | Nama guru |
| `email` | STRING | NULL | Email guru |
| `phone_number` | STRING | NULL | Nomor telepon |
| `mata_pelajaran` | STRING | NULL | Mata pelajaran |
| `last_education` | STRING | NULL | Pendidikan terakhir |
| `photo` | TEXT | NULL | Foto guru |
| `address` | TEXT | NULL | Alamat |
| `birth_date` | DATEONLY | NULL | Tanggal lahir |
| `gender` | ENUM(`L`, `P`) | NULL | Jenis kelamin |
| `status` | ENUM(`aktif`, `non-aktif`) | DEFAULT `aktif` | Status guru |
| `dibuat_pada` | DATETIME | NOT NULL | Waktu dibuat |
| `diperbarui_pada` | DATETIME | NOT NULL | Waktu diubah |

### 9. `kepala_sekolah`
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
| `dibuat_pada` | DATETIME | NOT NULL | Waktu dibuat |
| `diperbarui_pada` | DATETIME | NOT NULL | Waktu diubah |

### 10. `pendaftaran_ppdb`
| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | INTEGER | PK, auto increment | ID pendaftaran PPDB |
| `registration_type` | ENUM(`pendaftaran_baru`, `siswa_pindahan`) | NOT NULL, DEFAULT `pendaftaran_baru` | Jenis pendaftaran |
| `target_level` | ENUM(`tk`, `sd`, `smp`) | NOT NULL, DEFAULT `tk` | Target jenjang |
| `full_name` | STRING | NOT NULL | Nama lengkap calon siswa |
| `national_siswa_id` | STRING | NULL | NISN calon siswa |
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
| `siswa_photo_file` | LONGTEXT | NULL | Foto siswa |
| `transfer_letter_file` | LONGTEXT | NULL | Surat pindah |
| `notification_note` | TEXT | NULL | Catatan notifikasi |
| `dibuat_pada` | DATETIME | NOT NULL | Waktu dibuat |
| `diperbarui_pada` | DATETIME | NOT NULL | Waktu diubah |

### 11. `profil_sekolah`
| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | INTEGER | PK, auto increment | ID profil sekolah |
| `school_name` | STRING | NOT NULL | Nama sekolah |
| `npsn` | STRING | NULL | NPSN |
| `address` | TEXT | NULL | Alamat sekolah |
| `phone_number` | STRING | NULL | Telepon sekolah |
| `email` | STRING | NULL | Email sekolah |
| `website` | STRING | NULL | Situs web sekolah |
| `logo` | TEXT | NULL | Logo sekolah |
| `vision` | TEXT | NULL | Visi |
| `mission` | TEXT | NULL | Misi |
| `history` | TEXT | NULL | Sejarah |
| `facility` | TEXT | NULL | Fasilitas |
| `school_structure` | TEXT | NULL | Struktur sekolah |
| `accreditation` | STRING | NULL | Akreditasi |
| `dibuat_pada` | DATETIME | NOT NULL | Waktu dibuat |
| `diperbarui_pada` | DATETIME | NOT NULL | Waktu diubah |

### 12. `kegiatan`
| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | INTEGER | PK, auto increment | ID kegiatan |
| `title` | STRING | NOT NULL | Judul kegiatan |
| `date` | DATEONLY | NOT NULL | Tanggal kegiatan |
| `description` | TEXT | NOT NULL | Deskripsi kegiatan |
| `image` | STRING | NULL | Gambar kegiatan |
| `dibuat_pada` | DATETIME | NOT NULL | Waktu dibuat |
| `diperbarui_pada` | DATETIME | NOT NULL | Waktu diubah |

### 13. `pengumuman`
| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | INTEGER | PK, auto increment | ID pengumuman |
| `title` | STRING | NOT NULL | Judul pengumuman |
| `date` | DATEONLY | NOT NULL | Tanggal pengumuman |
| `content` | TEXT | NOT NULL | Isi pengumuman |
| `category` | STRING | NULL | Kategori |
| `image` | TEXT | NULL | Gambar pengumuman |
| `dibuat_pada` | DATETIME | NOT NULL | Waktu dibuat |
| `diperbarui_pada` | DATETIME | NOT NULL | Waktu diubah |

### 14. `galeri`
| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | INTEGER | PK, auto increment | ID galeri |
| `title` | STRING | NOT NULL | Judul galeri |
| `image` | LONGTEXT | NOT NULL | File/URL gambar |
| `description` | TEXT | NULL | Deskripsi gambar |
| `category` | STRING | NULL | Kategori galeri |
| `dibuat_pada` | DATETIME | NOT NULL | Waktu dibuat |
| `diperbarui_pada` | DATETIME | NOT NULL | Waktu diubah |

## Relasi Detail

| Dari Tabel | Kolom FK | Ke Tabel | Kardinalitas | Saat Dihapus | Saat Diperbarui | Keterangan |
|---|---|---|---|---|---|---|
| `siswa` | `kelas_id` | `kelas.id` | Banyak siswa ke satu kelas | SET NULL | CASCADE | Siswa boleh tidak punya kelas |
| `profil_guru` | `akun_pengguna_id` | `akun_pengguna.id` | Satu akun ke satu profil guru | CASCADE | CASCADE | `akun_pengguna_id` bersifat unique |
| `profil_guru` | `disetujui_oleh_akun_pengguna_id` | `akun_pengguna.id` | Banyak profil disetujui satu user | SET NULL | CASCADE | Biasanya admin/verifikator |
| `profil_guru` | `kelas_id` | `kelas.id` | Banyak profil wali ke satu kelas | SET NULL | CASCADE | Dipakai untuk wali kelas |
| `jadwal_mengajar` | `guru_akun_pengguna_id` | `akun_pengguna.id` | Banyak jadwal ke satu guru | CASCADE | CASCADE | Guru pengajar berdasarkan akun |
| `jadwal_mengajar` | `kelas_id` | `kelas.id` | Banyak jadwal ke satu kelas | CASCADE | CASCADE | Jadwal kelas |
| `absensi_siswa` | `siswa_id` | `siswa.id` | Banyak absensi ke satu siswa | CASCADE | CASCADE | Riwayat absensi siswa |
| `absensi_siswa` | `kelas_id` | `kelas.id` | Banyak absensi ke satu kelas | CASCADE | CASCADE | Kelas saat absensi dibuat |
| `absensi_siswa` | `guru_akun_pengguna_id` | `akun_pengguna.id` | Banyak absensi ke satu guru | CASCADE | CASCADE | Guru pencatat absensi |
| `absensi_siswa` | `jadwal_mengajar_id` | `jadwal_mengajar.id` | Banyak absensi ke satu jadwal | SET NULL | CASCADE | Jadwal opsional |
| `tautan_akun_portal` | `akun_pengguna_id` | `akun_pengguna.id` | Banyak link ke satu akun | CASCADE | CASCADE | Akun siswa/orangtua |
| `tautan_akun_portal` | `siswa_id` | `siswa.id` | Banyak link ke satu siswa | CASCADE | CASCADE | Satu siswa bisa punya akun siswa dan orangtua |

## Tabel Tanpa Relasi FK Langsung

Tabel berikut berdiri sendiri berdasarkan model saat ini:

- `guru`
- `kepala_sekolah`
- `pendaftaran_ppdb`
- `profil_sekolah`
- `kegiatan`
- `pengumuman`
- `galeri`

## Catatan Penting

- Tabel `guru` dan `profil_guru` sama-sama menyimpan data guru, tetapi belum memiliki FK langsung satu sama lain. `profil_guru` terhubung ke akun login `akun_pengguna`.
- Kolom `kelas.wali_kelas` masih berupa teks, sedangkan relasi wali kelas yang lebih terstruktur ada di `profil_guru.kelas_id` dengan `tipe_guru = 'wali_kelas'`.
- Tabel `pendaftaran_ppdb` belum otomatis berelasi ke `siswa`, walaupun sama-sama memiliki NISN/nama siswa. Jika PPDB diterima lalu menjadi siswa, relasi atau proses migrasi data perlu ditentukan di level aplikasi.
