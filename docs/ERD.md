# ERD Portal CNB

Dokumen ini adalah ringkasan teknis ERD Portal CNB berdasarkan model Sequelize terbaru di `backend/src/models` dan asosiasi pada `backend/src/models/index.js`. Nama tabel dan kolom memakai nama fisik database terbaru berbahasa Indonesia.

## Ringkasan Update Schema Terbaru

- Nama tabel/kolom sudah menggunakan schema Indonesia, misalnya `akun_pengguna`, `siswa`, `kelas`, `jadwal_mengajar`, dan `absensi_siswa`.
- Role akun mendukung `kepala_sekolah`.
- Tabel baru/aktif yang masuk ERD: `log_audit` dan `permintaan_reset_password`.
- Kolom penting yang ikut terdokumentasi: `akun_pengguna.wajib_ganti_kata_sandi`, `profil_guru.jenjang`, `profil_guru.wali_kelas`, dan `kegiatan.status`.
- `log_audit` hanya memakai `dibuat_pada`; tabel ini tidak memakai `diperbarui_pada` karena `updatedAt: false`.

## Diagram Mermaid

```mermaid
erDiagram
  kelas ||--o{ siswa : "1:N"
  akun_pengguna ||--|| profil_guru : "1:1"
  akun_pengguna ||--o{ profil_guru : "approves 1:N"
  kelas ||--o{ profil_guru : "1:N"
  akun_pengguna ||--o{ jadwal_mengajar : "1:N"
  kelas ||--o{ jadwal_mengajar : "1:N"
  siswa ||--o{ absensi_siswa : "1:N"
  kelas ||--o{ absensi_siswa : "1:N"
  akun_pengguna ||--o{ absensi_siswa : "1:N"
  jadwal_mengajar ||--o{ absensi_siswa : "1:N"
  akun_pengguna ||--o{ tautan_akun_portal : "1:N"
  siswa ||--o{ tautan_akun_portal : "1:N"
  akun_pengguna ||--o{ log_audit : "1:N"
  akun_pengguna ||--o{ permintaan_reset_password : "matched 1:N"
  akun_pengguna ||--o{ permintaan_reset_password : "processed 1:N"

  akun_pengguna {
    integer id PK
    string nama
    string email UK
    string kata_sandi
    enum peran
    string profesi
    boolean wajib_ganti_kata_sandi
    datetime dibuat_pada
    datetime diperbarui_pada
  }

  profil_guru {
    integer id PK
    integer akun_pengguna_id UK_FK
    enum tipe_guru
    string mata_pelajaran
    enum jenjang
    boolean wali_kelas
    integer kelas_id FK
    enum status_verifikasi
    text catatan
    integer disetujui_oleh_akun_pengguna_id FK
    datetime disetujui_pada
    datetime dibuat_pada
    datetime diperbarui_pada
  }

  kelas {
    integer id PK
    string nama_kelas
    string tingkat
    string wali_kelas
    string tahun_ajaran
    integer jumlah_siswa
    datetime dibuat_pada
    datetime diperbarui_pada
  }

  siswa {
    integer id PK
    string nisn UK
    string nama
    integer kelas_id FK
    string tempat_lahir
    dateonly tanggal_lahir
    enum jenis_kelamin
    string agama
    text alamat
    string nama_ayah
    string nama_ibu
    string no_telepon
    string email
    text foto
    enum status
    datetime dibuat_pada
    datetime diperbarui_pada
  }

  jadwal_mengajar {
    integer id PK
    integer guru_akun_pengguna_id FK
    integer kelas_id FK
    string mata_pelajaran
    enum hari
    time jam_mulai
    time jam_selesai
    enum status
    datetime dibuat_pada
    datetime diperbarui_pada
  }

  absensi_siswa {
    integer id PK
    integer siswa_id FK
    integer kelas_id FK
    integer guru_akun_pengguna_id FK
    integer jadwal_mengajar_id FK
    dateonly tanggal
    string hari
    enum tipe_guru
    string mata_pelajaran
    enum status
    text keterangan
    datetime dibuat_pada
    datetime diperbarui_pada
  }

  tautan_akun_portal {
    integer id PK
    integer akun_pengguna_id FK
    integer siswa_id FK
    enum jenis_tautan
    datetime dibuat_pada
    datetime diperbarui_pada
  }

  log_audit {
    integer id PK
    integer pelaku_akun_pengguna_id FK
    string aksi
    string jenis_entitas
    string entitas_id
    text metadata
    string alamat_ip
    text agen_pengguna
    datetime dibuat_pada
  }

  permintaan_reset_password {
    integer id PK
    enum peran
    string email
    string nama
    string nisn
    string kelas
    text catatan
    enum status
    integer akun_pengguna_terkait_id FK
    integer diproses_oleh_akun_pengguna_id FK
    text alasan_penolakan
    string alamat_ip
    text agen_pengguna
    datetime diproses_pada
    datetime dibuat_pada
    datetime diperbarui_pada
  }

  pendaftaran_ppdb {
    integer id PK
    enum jenis_pendaftaran
    enum target_jenjang
    string nama_lengkap
    string nisn
    string tempat_lahir
    dateonly tanggal_lahir
    enum jenis_kelamin
    string agama
    text alamat
    string nama_orang_tua
    string nama_ayah
    string nama_ibu
    string pekerjaan_ayah
    string pekerjaan_ibu
    string no_telepon
    string email
    string asal_sekolah
    enum status
    string tahun_ajaran
    longtext berkas_kk
    longtext berkas_raport
    longtext foto_siswa
    longtext berkas_surat_pindah
    text catatan_notifikasi
    datetime dibuat_pada
    datetime diperbarui_pada
  }

  profil_sekolah {
    integer id PK
    string nama_sekolah
    string npsn
    text alamat
    string telepon
    string email
    string website
    text logo
    text visi
    text misi
    text sejarah
    text fasilitas
    text struktur_sekolah
    string akreditasi
    datetime dibuat_pada
    datetime diperbarui_pada
  }

  guru {
    integer id PK
    string nip UK
    string nama
    string email
    string no_telepon
    string mata_pelajaran
    string pendidikan_terakhir
    text foto
    text alamat
    dateonly tanggal_lahir
    enum jenis_kelamin
    enum status
    datetime dibuat_pada
    datetime diperbarui_pada
  }

  kepala_sekolah {
    integer id PK
    string nip UK
    string nama
    string email
    string no_telepon
    text foto
    dateonly periode_mulai
    dateonly periode_akhir
    text alamat
    string pendidikan_terakhir
    enum status
    datetime dibuat_pada
    datetime diperbarui_pada
  }

  kegiatan {
    integer id PK
    string judul
    dateonly tanggal
    text deskripsi
    longtext gambar
    enum status
    datetime dibuat_pada
    datetime diperbarui_pada
  }

  pengumuman {
    integer id PK
    string judul
    dateonly tanggal
    text isi
    string kategori
    text gambar
    datetime dibuat_pada
    datetime diperbarui_pada
  }

  galeri {
    integer id PK
    string judul
    longtext gambar
    text deskripsi
    string kategori
    datetime dibuat_pada
    datetime diperbarui_pada
  }

```

## Daftar Tabel

Total tabel pada ERD: **16 tabel**.

| No | Tabel | Nama Bisnis | Fungsi |
|---:|---|---|---|
| 1 | `akun_pengguna` | Akun Pengguna | Menyimpan akun login seluruh pengguna sistem, termasuk admin, guru, siswa, orang tua, dan kepala sekolah. |
| 2 | `profil_guru` | Profil Guru Portal | Menyimpan profil tambahan untuk akun guru: tipe guru, mata pelajaran, jenjang, status wali kelas, kelas terkait, dan status verifikasi. |
| 3 | `kelas` | Kelas | Menyimpan data kelas/rombongan belajar, tingkat, tahun ajaran, wali kelas teks, dan jumlah siswa. |
| 4 | `siswa` | Siswa | Menyimpan data induk siswa, identitas, kelas, data orang tua, kontak, foto, dan status siswa. |
| 5 | `jadwal_mengajar` | Jadwal Mengajar | Menyimpan jadwal mengajar guru per kelas, mata pelajaran, hari, jam, dan status jadwal. |
| 6 | `absensi_siswa` | Absensi Siswa | Menyimpan catatan kehadiran siswa berdasarkan siswa, kelas, guru pencatat, tanggal, mata pelajaran, dan status kehadiran. |
| 7 | `tautan_akun_portal` | Tautan Akun Portal | Menghubungkan akun pengguna dengan data siswa untuk akses portal siswa dan orang tua. |
| 8 | `log_audit` | Log Audit | Mencatat aktivitas penting sistem: pelaku, aksi, entitas, metadata, IP address, dan user agent. |
| 9 | `permintaan_reset_password` | Permintaan Reset Password | Menyimpan permintaan reset password, pencocokan akun, status, admin pemroses, alasan penolakan, dan informasi request. |
| 10 | `pendaftaran_ppdb` | Pendaftaran PPDB | Menyimpan data calon siswa PPDB, data orang tua, dokumen pendukung, status penerimaan, dan catatan notifikasi. |
| 11 | `profil_sekolah` | Profil Sekolah | Menyimpan profil sekolah: NPSN, kontak, visi, misi, sejarah, fasilitas, struktur, dan akreditasi. |
| 12 | `guru` | Data Guru | Menyimpan data guru untuk administrasi atau publikasi profil guru pada website sekolah. |
| 13 | `kepala_sekolah` | Kepala Sekolah | Menyimpan data kepala sekolah, periode jabatan, kontak, pendidikan, foto, dan status. |
| 14 | `kegiatan` | Kegiatan | Menyimpan konten kegiatan sekolah yang ditampilkan pada website. |
| 15 | `pengumuman` | Pengumuman | Menyimpan konten pengumuman sekolah, kategori, isi, tanggal, dan gambar. |
| 16 | `galeri` | Galeri | Menyimpan dokumentasi gambar/foto galeri sekolah beserta kategori dan deskripsi. |

## Detail Tabel dan Kolom

### Akun Pengguna - `akun_pengguna`

Menyimpan akun login seluruh pengguna sistem, termasuk admin, guru, siswa, orang tua, dan kepala sekolah.

Model Sequelize: `akun_pengguna` dari file `backend/src/models/User.js`.

| Kolom DB | Alias Model | Tipe | Constraint | Keterangan |
|---|---|---|---|---|
| `id` | `id` | `INTEGER` | `PK`<br>`AI` | Primary key unik untuk setiap baris data. |
| `nama` | `name` | `STRING` | `NOT NULL` | Nama pengguna/orang/data utama sesuai konteks tabel. |
| `email` | `email` | `STRING` | `UK`<br>`NOT NULL` | Alamat email untuk kontak atau login. |
| `kata_sandi` | `password` | `STRING` | `NOT NULL` | Password akun; seharusnya berupa hash. |
| `peran` | `role` | `ENUM(admin, guru, siswa, orangtua, kepala_sekolah)` | `DEFAULT siswa` | Role pengguna dalam sistem. |
| `profesi` | `profession` | `STRING` | - | Profesi pengguna bila diperlukan. |
| `wajib_ganti_kata_sandi` | `must_change_password` | `BOOLEAN` | `NOT NULL`<br>`DEFAULT false` | Penanda pengguna wajib mengganti password. |
| `dibuat_pada` | `createdAt` | `DATETIME` | `NOT NULL` | Timestamp saat data dibuat. |
| `diperbarui_pada` | `updatedAt` | `DATETIME` | `NOT NULL` | Timestamp saat data terakhir diperbarui. |

### Profil Guru Portal - `profil_guru`

Menyimpan profil tambahan untuk akun guru: tipe guru, mata pelajaran, jenjang, status wali kelas, kelas terkait, dan status verifikasi.

Model Sequelize: `profil_guru` dari file `backend/src/models/GuruProfile.js`.

| Kolom DB | Alias Model | Tipe | Constraint | Keterangan |
|---|---|---|---|---|
| `id` | `id` | `INTEGER` | `PK`<br>`AI` | Primary key unik untuk setiap baris data. |
| `akun_pengguna_id` | `user_id` | `INTEGER` | `UK`<br>`FK -> akun_pengguna.id`<br>`NOT NULL` | Foreign key ke tabel akun_pengguna. |
| `tipe_guru` | `teacher_type` | `ENUM(wali_kelas, mapel)` | `NOT NULL`<br>`DEFAULT mapel` | Jenis guru: wali_kelas atau mapel. |
| `mata_pelajaran` | `subject` | `STRING` | - | Mata pelajaran terkait. |
| `jenjang` | `jenjang` | `ENUM(sd, smp)` | - | Jenjang pendidikan terkait guru. |
| `wali_kelas` | `is_homeroom` | `BOOLEAN` | `NOT NULL`<br>`DEFAULT false` | Penanda apakah guru adalah wali kelas. |
| `kelas_id` | `kelas_id` | `INTEGER` | `FK -> kelas.id` | Foreign key ke tabel kelas. |
| `status_verifikasi` | `verification_status` | `ENUM(pending, approved, rejected)` | `DEFAULT pending` | Status verifikasi profil guru. |
| `catatan` | `note` | `TEXT` | - | Catatan tambahan. |
| `disetujui_oleh_akun_pengguna_id` | `approved_by` | `INTEGER` | `FK -> akun_pengguna.id` | Akun/admin yang menyetujui profil guru. |
| `disetujui_pada` | `approved_at` | `DATETIME` | - | Waktu profil guru disetujui. |
| `dibuat_pada` | `createdAt` | `DATETIME` | `NOT NULL` | Timestamp saat data dibuat. |
| `diperbarui_pada` | `updatedAt` | `DATETIME` | `NOT NULL` | Timestamp saat data terakhir diperbarui. |

### Kelas - `kelas`

Menyimpan data kelas/rombongan belajar, tingkat, tahun ajaran, wali kelas teks, dan jumlah siswa.

Model Sequelize: `kelas` dari file `backend/src/models/Kelas.js`.

| Kolom DB | Alias Model | Tipe | Constraint | Keterangan |
|---|---|---|---|---|
| `id` | `id` | `INTEGER` | `PK`<br>`AI` | Primary key unik untuk setiap baris data. |
| `nama_kelas` | `nama_kelas` | `STRING` | `NOT NULL` | Nama kelas/rombongan belajar. |
| `tingkat` | `tingkat` | `STRING` | `NOT NULL` | Tingkat/level kelas. |
| `wali_kelas` | `wali_kelas` | `STRING` | - | Penanda apakah guru adalah wali kelas. |
| `tahun_ajaran` | `tahun_ajaran` | `STRING` | `NOT NULL` | Tahun ajaran data berlaku. |
| `jumlah_siswa` | `jumlah_siswa` | `INTEGER` | `DEFAULT 0` | Jumlah siswa pada kelas. |
| `dibuat_pada` | `createdAt` | `DATETIME` | `NOT NULL` | Timestamp saat data dibuat. |
| `diperbarui_pada` | `updatedAt` | `DATETIME` | `NOT NULL` | Timestamp saat data terakhir diperbarui. |

### Siswa - `siswa`

Menyimpan data induk siswa, identitas, kelas, data orang tua, kontak, foto, dan status siswa.

Model Sequelize: `siswa` dari file `backend/src/models/Siswa.js`.

| Kolom DB | Alias Model | Tipe | Constraint | Keterangan |
|---|---|---|---|---|
| `id` | `id` | `INTEGER` | `PK`<br>`AI` | Primary key unik untuk setiap baris data. |
| `nisn` | `nisn` | `STRING` | `UK`<br>`NOT NULL` | Nomor Induk Siswa Nasional. |
| `nama` | `nama` | `STRING` | `NOT NULL` | Nama pengguna/orang/data utama sesuai konteks tabel. |
| `kelas_id` | `kelas_id` | `INTEGER` | `FK -> kelas.id` | Foreign key ke tabel kelas. |
| `tempat_lahir` | `tempat_lahir` | `STRING` | - | Tempat lahir. |
| `tanggal_lahir` | `tanggal_lahir` | `DATEONLY` | - | Tanggal lahir. |
| `jenis_kelamin` | `jenis_kelamin` | `ENUM(L, P)` | `NOT NULL` | Jenis kelamin. |
| `agama` | `agama` | `STRING` | - | Agama. |
| `alamat` | `alamat` | `TEXT` | - | Alamat lengkap. |
| `nama_ayah` | `nama_ayah` | `STRING` | - | Nama ayah. |
| `nama_ibu` | `nama_ibu` | `STRING` | - | Nama ibu. |
| `no_telepon` | `no_telepon` | `STRING` | - | Nomor telepon/kontak. |
| `email` | `email` | `STRING` | - | Alamat email untuk kontak atau login. |
| `foto` | `foto` | `TEXT` | - | Foto profil/dokumentasi. |
| `status` | `status` | `ENUM(aktif, lulus, pindah, keluar)` | `DEFAULT aktif` | Status data sesuai konteks tabel. |
| `dibuat_pada` | `createdAt` | `DATETIME` | `NOT NULL` | Timestamp saat data dibuat. |
| `diperbarui_pada` | `updatedAt` | `DATETIME` | `NOT NULL` | Timestamp saat data terakhir diperbarui. |

### Jadwal Mengajar - `jadwal_mengajar`

Menyimpan jadwal mengajar guru per kelas, mata pelajaran, hari, jam, dan status jadwal.

Model Sequelize: `jadwal_mengajar` dari file `backend/src/models/JadwalMengajar.js`.

| Kolom DB | Alias Model | Tipe | Constraint | Keterangan |
|---|---|---|---|---|
| `id` | `id` | `INTEGER` | `PK`<br>`AI` | Primary key unik untuk setiap baris data. |
| `guru_akun_pengguna_id` | `guru_user_id` | `INTEGER` | `FK -> akun_pengguna.id`<br>`NOT NULL` | Akun guru yang mengajar atau mencatat absensi. |
| `kelas_id` | `kelas_id` | `INTEGER` | `FK -> kelas.id`<br>`NOT NULL` | Foreign key ke tabel kelas. |
| `mata_pelajaran` | `mapel` | `STRING` | `NOT NULL` | Mata pelajaran terkait. |
| `hari` | `hari` | `ENUM(senin, selasa, rabu, kamis, jumat, sabtu, minggu)` | `NOT NULL` | Nama hari jadwal atau absensi. |
| `jam_mulai` | `jam_mulai` | `TIME` | `NOT NULL` | Kolom data sesuai kebutuhan domain sistem. |
| `jam_selesai` | `jam_selesai` | `TIME` | `NOT NULL` | Kolom data sesuai kebutuhan domain sistem. |
| `status` | `status` | `ENUM(aktif, non-aktif)` | `DEFAULT aktif` | Status data sesuai konteks tabel. |
| `dibuat_pada` | `createdAt` | `DATETIME` | `NOT NULL` | Timestamp saat data dibuat. |
| `diperbarui_pada` | `updatedAt` | `DATETIME` | `NOT NULL` | Timestamp saat data terakhir diperbarui. |

### Absensi Siswa - `absensi_siswa`

Menyimpan catatan kehadiran siswa berdasarkan siswa, kelas, guru pencatat, tanggal, mata pelajaran, dan status kehadiran.

Model Sequelize: `absensi_siswa` dari file `backend/src/models/AbsensiSiswa.js`.

| Kolom DB | Alias Model | Tipe | Constraint | Keterangan |
|---|---|---|---|---|
| `id` | `id` | `INTEGER` | `PK`<br>`AI` | Primary key unik untuk setiap baris data. |
| `siswa_id` | `siswa_id` | `INTEGER` | `FK -> siswa.id`<br>`NOT NULL` | Kolom data sesuai kebutuhan domain sistem. |
| `kelas_id` | `kelas_id` | `INTEGER` | `FK -> kelas.id`<br>`NOT NULL` | Foreign key ke tabel kelas. |
| `guru_akun_pengguna_id` | `guru_user_id` | `INTEGER` | `FK -> akun_pengguna.id`<br>`NOT NULL` | Akun guru yang mengajar atau mencatat absensi. |
| `jadwal_mengajar_id` | `jadwal_id` | `INTEGER` | `FK -> jadwal_mengajar.id` | Foreign key ke tabel jadwal_mengajar. |
| `tanggal` | `tanggal` | `DATEONLY` | `NOT NULL` | Tanggal kegiatan/pengumuman/absensi. |
| `hari` | `hari` | `STRING` | `NOT NULL` | Nama hari jadwal atau absensi. |
| `tipe_guru` | `tipe_guru` | `ENUM(wali_kelas, mapel)` | `NOT NULL` | Jenis guru: wali_kelas atau mapel. |
| `mata_pelajaran` | `mapel` | `STRING` | - | Mata pelajaran terkait. |
| `status` | `status` | `ENUM(hadir, izin, sakit, alpha)` | `NOT NULL` | Status data sesuai konteks tabel. |
| `keterangan` | `keterangan` | `TEXT` | - | Keterangan absensi. |
| `dibuat_pada` | `createdAt` | `DATETIME` | `NOT NULL` | Timestamp saat data dibuat. |
| `diperbarui_pada` | `updatedAt` | `DATETIME` | `NOT NULL` | Timestamp saat data terakhir diperbarui. |

### Tautan Akun Portal - `tautan_akun_portal`

Menghubungkan akun pengguna dengan data siswa untuk akses portal siswa dan orang tua.

Model Sequelize: `tautan_akun_portal` dari file `backend/src/models/PortalAccountLink.js`.

| Kolom DB | Alias Model | Tipe | Constraint | Keterangan |
|---|---|---|---|---|
| `id` | `id` | `INTEGER` | `PK`<br>`AI` | Primary key unik untuk setiap baris data. |
| `akun_pengguna_id` | `user_id` | `INTEGER` | `FK -> akun_pengguna.id`<br>`NOT NULL` | Foreign key ke tabel akun_pengguna. |
| `siswa_id` | `siswa_id` | `INTEGER` | `FK -> siswa.id`<br>`NOT NULL` | Kolom data sesuai kebutuhan domain sistem. |
| `jenis_tautan` | `link_type` | `ENUM(siswa, orangtua)` | `NOT NULL` | Jenis relasi akun portal: siswa atau orangtua. |
| `dibuat_pada` | `createdAt` | `DATETIME` | `NOT NULL` | Timestamp saat data dibuat. |
| `diperbarui_pada` | `updatedAt` | `DATETIME` | `NOT NULL` | Timestamp saat data terakhir diperbarui. |

### Log Audit - `log_audit`

Mencatat aktivitas penting sistem: pelaku, aksi, entitas, metadata, IP address, dan user agent.

Model Sequelize: `log_audit` dari file `backend/src/models/AuditLog.js`.

| Kolom DB | Alias Model | Tipe | Constraint | Keterangan |
|---|---|---|---|---|
| `id` | `id` | `INTEGER` | `PK`<br>`AI` | Primary key unik untuk setiap baris data. |
| `pelaku_akun_pengguna_id` | `actor_user_account_id` | `INTEGER` | `FK -> akun_pengguna.id` | Akun pengguna yang melakukan aksi audit. |
| `aksi` | `action` | `STRING` | `NOT NULL` | Aksi yang dicatat pada audit log. |
| `jenis_entitas` | `entity_type` | `STRING` | `NOT NULL` | Jenis entitas yang terdampak audit. |
| `entitas_id` | `entity_id` | `STRING` | - | ID entitas yang terdampak audit. |
| `metadata` | `metadata` | `TEXT` | - | Metadata tambahan audit. |
| `alamat_ip` | `ip_address` | `STRING` | - | IP address asal request. |
| `agen_pengguna` | `user_agent` | `TEXT` | - | User agent/browser/perangkat asal request. |
| `dibuat_pada` | `createdAt` | `DATETIME` | `NOT NULL` | Timestamp saat data dibuat. |

### Permintaan Reset Password - `permintaan_reset_password`

Menyimpan permintaan reset password, pencocokan akun, status, admin pemroses, alasan penolakan, dan informasi request.

Model Sequelize: `permintaan_reset_password` dari file `backend/src/models/PasswordResetRequest.js`.

Index tambahan: `status` pada `status`, `peran_email_status` pada `peran, email, status`.

| Kolom DB | Alias Model | Tipe | Constraint | Keterangan |
|---|---|---|---|---|
| `id` | `id` | `INTEGER` | `PK`<br>`AI` | Primary key unik untuk setiap baris data. |
| `peran` | `role` | `ENUM(guru, siswa, orangtua, kepala_sekolah)` | `NOT NULL` | Role pengguna dalam sistem. |
| `email` | `email` | `STRING` | `NOT NULL` | Alamat email untuk kontak atau login. |
| `nama` | `name` | `STRING` | `NOT NULL` | Nama pengguna/orang/data utama sesuai konteks tabel. |
| `nisn` | `nisn` | `STRING` | - | Nomor Induk Siswa Nasional. |
| `kelas` | `class_name` | `STRING` | - | Nama kelas pada permintaan reset password. |
| `catatan` | `notes` | `TEXT` | - | Catatan tambahan. |
| `status` | `status` | `ENUM(pending, completed, rejected)` | `NOT NULL`<br>`DEFAULT pending` | Status data sesuai konteks tabel. |
| `akun_pengguna_terkait_id` | `matched_user_id` | `INTEGER` | `FK -> akun_pengguna.id` | Akun yang cocok dengan permintaan reset password. |
| `diproses_oleh_akun_pengguna_id` | `processed_by` | `INTEGER` | `FK -> akun_pengguna.id` | Akun/admin yang memproses reset password. |
| `alasan_penolakan` | `rejection_reason` | `TEXT` | - | Alasan reset password ditolak. |
| `alamat_ip` | `ip_address` | `STRING` | - | IP address asal request. |
| `agen_pengguna` | `user_agent` | `TEXT` | - | User agent/browser/perangkat asal request. |
| `diproses_pada` | `processed_at` | `DATETIME` | - | Waktu reset password diproses. |
| `dibuat_pada` | `createdAt` | `DATETIME` | `NOT NULL` | Timestamp saat data dibuat. |
| `diperbarui_pada` | `updatedAt` | `DATETIME` | `NOT NULL` | Timestamp saat data terakhir diperbarui. |

### Pendaftaran PPDB - `pendaftaran_ppdb`

Menyimpan data calon siswa PPDB, data orang tua, dokumen pendukung, status penerimaan, dan catatan notifikasi.

Model Sequelize: `pendaftaran_ppdb` dari file `backend/src/models/PPDB.js`.

| Kolom DB | Alias Model | Tipe | Constraint | Keterangan |
|---|---|---|---|---|
| `id` | `id` | `INTEGER` | `PK`<br>`AI` | Primary key unik untuk setiap baris data. |
| `jenis_pendaftaran` | `jenis_pendaftaran` | `ENUM(pendaftaran_baru, siswa_pindahan)` | `NOT NULL`<br>`DEFAULT pendaftaran_baru` | Jenis pendaftaran PPDB. |
| `target_jenjang` | `target_jenjang` | `ENUM(tk, sd, smp)` | `NOT NULL`<br>`DEFAULT tk` | Jenjang tujuan PPDB. |
| `nama_lengkap` | `nama_lengkap` | `STRING` | `NOT NULL` | Nama lengkap calon siswa. |
| `nisn` | `nisn` | `STRING` | - | Nomor Induk Siswa Nasional. |
| `tempat_lahir` | `tempat_lahir` | `STRING` | - | Tempat lahir. |
| `tanggal_lahir` | `tanggal_lahir` | `DATEONLY` | `NOT NULL` | Tanggal lahir. |
| `jenis_kelamin` | `jenis_kelamin` | `ENUM(L, P)` | `NOT NULL` | Jenis kelamin. |
| `agama` | `agama` | `STRING` | - | Agama. |
| `alamat` | `alamat` | `TEXT` | `NOT NULL` | Alamat lengkap. |
| `nama_orang_tua` | `nama_orang_tua` | `STRING` | `NOT NULL` | Nama orang tua/wali utama. |
| `nama_ayah` | `nama_ayah` | `STRING` | - | Nama ayah. |
| `nama_ibu` | `nama_ibu` | `STRING` | - | Nama ibu. |
| `pekerjaan_ayah` | `pekerjaan_ayah` | `STRING` | - | Pekerjaan ayah. |
| `pekerjaan_ibu` | `pekerjaan_ibu` | `STRING` | - | Pekerjaan ibu. |
| `no_telepon` | `no_telepon` | `STRING` | `NOT NULL` | Nomor telepon/kontak. |
| `email` | `email` | `STRING` | `NOT NULL` | Alamat email untuk kontak atau login. |
| `asal_sekolah` | `asal_sekolah` | `STRING` | - | Asal sekolah calon siswa. |
| `status` | `status` | `ENUM(pending, diterima, ditolak)` | `DEFAULT pending` | Status data sesuai konteks tabel. |
| `tahun_ajaran` | `tahun_ajaran` | `STRING` | `NOT NULL` | Tahun ajaran data berlaku. |
| `berkas_kk` | `berkas_kk` | `LONGTEXT` | - | File kartu keluarga. |
| `berkas_raport` | `berkas_raport` | `LONGTEXT` | - | File rapor. |
| `foto_siswa` | `foto_siswa` | `LONGTEXT` | - | Foto calon siswa. |
| `berkas_surat_pindah` | `berkas_surat_pindah` | `LONGTEXT` | - | File surat pindah. |
| `catatan_notifikasi` | `notification_note` | `TEXT` | - | Catatan notifikasi/keputusan PPDB. |
| `dibuat_pada` | `createdAt` | `DATETIME` | `NOT NULL` | Timestamp saat data dibuat. |
| `diperbarui_pada` | `updatedAt` | `DATETIME` | `NOT NULL` | Timestamp saat data terakhir diperbarui. |

### Profil Sekolah - `profil_sekolah`

Menyimpan profil sekolah: NPSN, kontak, visi, misi, sejarah, fasilitas, struktur, dan akreditasi.

Model Sequelize: `profil_sekolah` dari file `backend/src/models/ProfilSekolah.js`.

| Kolom DB | Alias Model | Tipe | Constraint | Keterangan |
|---|---|---|---|---|
| `id` | `id` | `INTEGER` | `PK`<br>`AI` | Primary key unik untuk setiap baris data. |
| `nama_sekolah` | `nama_sekolah` | `STRING` | `NOT NULL` | Nama sekolah. |
| `npsn` | `npsn` | `STRING` | - | Nomor Pokok Sekolah Nasional. |
| `alamat` | `alamat` | `TEXT` | - | Alamat lengkap. |
| `telepon` | `telepon` | `STRING` | - | Telepon sekolah. |
| `email` | `email` | `STRING` | - | Alamat email untuk kontak atau login. |
| `website` | `website` | `STRING` | - | Website sekolah. |
| `logo` | `logo` | `TEXT` | - | Logo sekolah. |
| `visi` | `visi` | `TEXT` | - | Visi sekolah. |
| `misi` | `misi` | `TEXT` | - | Misi sekolah. |
| `sejarah` | `sejarah` | `TEXT` | - | Sejarah sekolah. |
| `fasilitas` | `fasilitas` | `TEXT` | - | Fasilitas sekolah. |
| `struktur_sekolah` | `struktur_sekolah` | `TEXT` | - | Struktur organisasi sekolah. |
| `akreditasi` | `akreditasi` | `STRING` | - | Akreditasi sekolah. |
| `dibuat_pada` | `createdAt` | `DATETIME` | `NOT NULL` | Timestamp saat data dibuat. |
| `diperbarui_pada` | `updatedAt` | `DATETIME` | `NOT NULL` | Timestamp saat data terakhir diperbarui. |

### Data Guru - `guru`

Menyimpan data guru untuk administrasi atau publikasi profil guru pada website sekolah.

Model Sequelize: `guru` dari file `backend/src/models/Guru.js`.

| Kolom DB | Alias Model | Tipe | Constraint | Keterangan |
|---|---|---|---|---|
| `id` | `id` | `INTEGER` | `PK`<br>`AI` | Primary key unik untuk setiap baris data. |
| `nip` | `nip` | `STRING` | `UK`<br>`NOT NULL` | Nomor Induk Pegawai. |
| `nama` | `nama` | `STRING` | `NOT NULL` | Nama pengguna/orang/data utama sesuai konteks tabel. |
| `email` | `email` | `STRING` | - | Alamat email untuk kontak atau login. |
| `no_telepon` | `no_telepon` | `STRING` | - | Nomor telepon/kontak. |
| `mata_pelajaran` | `mata_pelajaran` | `STRING` | - | Mata pelajaran terkait. |
| `pendidikan_terakhir` | `pendidikan_terakhir` | `STRING` | - | Pendidikan terakhir. |
| `foto` | `foto` | `TEXT` | - | Foto profil/dokumentasi. |
| `alamat` | `alamat` | `TEXT` | - | Alamat lengkap. |
| `tanggal_lahir` | `tanggal_lahir` | `DATEONLY` | - | Tanggal lahir. |
| `jenis_kelamin` | `jenis_kelamin` | `ENUM(L, P)` | - | Jenis kelamin. |
| `status` | `status` | `ENUM(aktif, non-aktif)` | `DEFAULT aktif` | Status data sesuai konteks tabel. |
| `dibuat_pada` | `createdAt` | `DATETIME` | `NOT NULL` | Timestamp saat data dibuat. |
| `diperbarui_pada` | `updatedAt` | `DATETIME` | `NOT NULL` | Timestamp saat data terakhir diperbarui. |

### Kepala Sekolah - `kepala_sekolah`

Menyimpan data kepala sekolah, periode jabatan, kontak, pendidikan, foto, dan status.

Model Sequelize: `kepala_sekolah` dari file `backend/src/models/KepalaSekolah.js`.

| Kolom DB | Alias Model | Tipe | Constraint | Keterangan |
|---|---|---|---|---|
| `id` | `id` | `INTEGER` | `PK`<br>`AI` | Primary key unik untuk setiap baris data. |
| `nip` | `nip` | `STRING` | `UK`<br>`NOT NULL` | Nomor Induk Pegawai. |
| `nama` | `nama` | `STRING` | `NOT NULL` | Nama pengguna/orang/data utama sesuai konteks tabel. |
| `email` | `email` | `STRING` | - | Alamat email untuk kontak atau login. |
| `no_telepon` | `no_telepon` | `STRING` | - | Nomor telepon/kontak. |
| `foto` | `foto` | `TEXT` | - | Foto profil/dokumentasi. |
| `periode_mulai` | `periode_mulai` | `DATEONLY` | `NOT NULL` | Tanggal mulai periode jabatan. |
| `periode_akhir` | `periode_akhir` | `DATEONLY` | - | Tanggal akhir periode jabatan. |
| `alamat` | `alamat` | `TEXT` | - | Alamat lengkap. |
| `pendidikan_terakhir` | `pendidikan_terakhir` | `STRING` | - | Pendidikan terakhir. |
| `status` | `status` | `ENUM(aktif, non-aktif)` | `DEFAULT aktif` | Status data sesuai konteks tabel. |
| `dibuat_pada` | `createdAt` | `DATETIME` | `NOT NULL` | Timestamp saat data dibuat. |
| `diperbarui_pada` | `updatedAt` | `DATETIME` | `NOT NULL` | Timestamp saat data terakhir diperbarui. |

### Kegiatan - `kegiatan`

Menyimpan konten kegiatan sekolah yang ditampilkan pada website.

Model Sequelize: `kegiatan` dari file `backend/src/models/Kegiatan.js`.

| Kolom DB | Alias Model | Tipe | Constraint | Keterangan |
|---|---|---|---|---|
| `id` | `id` | `INTEGER` | `PK`<br>`AI` | Primary key unik untuk setiap baris data. |
| `judul` | `title` | `STRING` | `NOT NULL` | Judul konten. |
| `tanggal` | `date` | `DATEONLY` | `NOT NULL` | Tanggal kegiatan/pengumuman/absensi. |
| `deskripsi` | `description` | `TEXT` | `NOT NULL` | Deskripsi konten. |
| `gambar` | `image` | `LONGTEXT` | - | File atau URL gambar. |
| `status` | `status` | `ENUM(tampil, tidak_tampil)` | `NOT NULL`<br>`DEFAULT tampil` | Status data sesuai konteks tabel. |
| `dibuat_pada` | `createdAt` | `DATETIME` | `NOT NULL` | Timestamp saat data dibuat. |
| `diperbarui_pada` | `updatedAt` | `DATETIME` | `NOT NULL` | Timestamp saat data terakhir diperbarui. |

### Pengumuman - `pengumuman`

Menyimpan konten pengumuman sekolah, kategori, isi, tanggal, dan gambar.

Model Sequelize: `pengumuman` dari file `backend/src/models/Pengumuman.js`.

| Kolom DB | Alias Model | Tipe | Constraint | Keterangan |
|---|---|---|---|---|
| `id` | `id` | `INTEGER` | `PK`<br>`AI` | Primary key unik untuk setiap baris data. |
| `judul` | `title` | `STRING` | `NOT NULL` | Judul konten. |
| `tanggal` | `date` | `DATEONLY` | `NOT NULL` | Tanggal kegiatan/pengumuman/absensi. |
| `isi` | `content` | `TEXT` | `NOT NULL` | Isi pengumuman/konten. |
| `kategori` | `category` | `STRING` | - | Kategori konten. |
| `gambar` | `image` | `TEXT` | - | File atau URL gambar. |
| `dibuat_pada` | `createdAt` | `DATETIME` | `NOT NULL` | Timestamp saat data dibuat. |
| `diperbarui_pada` | `updatedAt` | `DATETIME` | `NOT NULL` | Timestamp saat data terakhir diperbarui. |

### Galeri - `galeri`

Menyimpan dokumentasi gambar/foto galeri sekolah beserta kategori dan deskripsi.

Model Sequelize: `galeri` dari file `backend/src/models/Galeri.js`.

| Kolom DB | Alias Model | Tipe | Constraint | Keterangan |
|---|---|---|---|---|
| `id` | `id` | `INTEGER` | `PK`<br>`AI` | Primary key unik untuk setiap baris data. |
| `judul` | `title` | `STRING` | `NOT NULL` | Judul konten. |
| `gambar` | `image` | `LONGTEXT` | `NOT NULL` | File atau URL gambar. |
| `deskripsi` | `description` | `TEXT` | - | Deskripsi konten. |
| `kategori` | `category` | `STRING` | - | Kategori konten. |
| `dibuat_pada` | `createdAt` | `DATETIME` | `NOT NULL` | Timestamp saat data dibuat. |
| `diperbarui_pada` | `updatedAt` | `DATETIME` | `NOT NULL` | Timestamp saat data terakhir diperbarui. |

## Detail Relasi

| Dari Tabel | Ke Tabel | FK | Referensi | Kardinalitas | On Delete | On Update | Makna |
|---|---|---|---|---|---|---|---|
| `kelas` | `siswa` | `siswa.kelas_id` | `kelas.id` | `1:N` | `SET NULL` | `CASCADE` | Satu kelas dapat memiliki banyak siswa; siswa boleh belum punya kelas. |
| `akun_pengguna` | `profil_guru` | `profil_guru.akun_pengguna_id` | `akun_pengguna.id` | `1:1` | `CASCADE` | `CASCADE` | Satu akun guru hanya memiliki satu profil guru karena FK unique. |
| `akun_pengguna` | `profil_guru` | `profil_guru.disetujui_oleh_akun_pengguna_id` | `akun_pengguna.id` | `1:N` | `SET NULL` | `CASCADE` | Satu admin/user dapat menyetujui banyak profil guru. |
| `kelas` | `profil_guru` | `profil_guru.kelas_id` | `kelas.id` | `1:N` | `SET NULL` | `CASCADE` | Satu kelas dapat terkait dengan banyak profil guru. |
| `akun_pengguna` | `jadwal_mengajar` | `jadwal_mengajar.guru_akun_pengguna_id` | `akun_pengguna.id` | `1:N` | `CASCADE` | `CASCADE` | Satu akun guru dapat memiliki banyak jadwal mengajar. |
| `kelas` | `jadwal_mengajar` | `jadwal_mengajar.kelas_id` | `kelas.id` | `1:N` | `CASCADE` | `CASCADE` | Satu kelas dapat memiliki banyak jadwal mengajar. |
| `siswa` | `absensi_siswa` | `absensi_siswa.siswa_id` | `siswa.id` | `1:N` | `CASCADE` | `CASCADE` | Satu siswa dapat memiliki banyak catatan absensi. |
| `kelas` | `absensi_siswa` | `absensi_siswa.kelas_id` | `kelas.id` | `1:N` | `CASCADE` | `CASCADE` | Satu kelas dapat memiliki banyak catatan absensi. |
| `akun_pengguna` | `absensi_siswa` | `absensi_siswa.guru_akun_pengguna_id` | `akun_pengguna.id` | `1:N` | `CASCADE` | `CASCADE` | Satu guru dapat mencatat banyak absensi siswa. |
| `jadwal_mengajar` | `absensi_siswa` | `absensi_siswa.jadwal_mengajar_id` | `jadwal_mengajar.id` | `1:N` | `SET NULL` | `CASCADE` | Satu jadwal dapat menjadi referensi banyak absensi; absensi tetap ada jika jadwal dihapus. |
| `akun_pengguna` | `tautan_akun_portal` | `tautan_akun_portal.akun_pengguna_id` | `akun_pengguna.id` | `1:N` | `CASCADE` | `CASCADE` | Satu akun dapat memiliki banyak tautan portal ke siswa. |
| `siswa` | `tautan_akun_portal` | `tautan_akun_portal.siswa_id` | `siswa.id` | `1:N` | `CASCADE` | `CASCADE` | Satu siswa dapat terhubung ke akun siswa dan/atau orang tua. |
| `akun_pengguna` | `log_audit` | `log_audit.pelaku_akun_pengguna_id` | `akun_pengguna.id` | `1:N` | `SET NULL` | `CASCADE` | Satu akun dapat menghasilkan banyak log audit; log tetap ada jika akun pelaku dihapus. |
| `akun_pengguna` | `permintaan_reset_password` | `permintaan_reset_password.akun_pengguna_terkait_id` | `akun_pengguna.id` | `1:N` | `SET NULL` | `CASCADE` | Satu akun dapat cocok dengan banyak permintaan reset password. |
| `akun_pengguna` | `permintaan_reset_password` | `permintaan_reset_password.diproses_oleh_akun_pengguna_id` | `akun_pengguna.id` | `1:N` | `SET NULL` | `CASCADE` | Satu admin/user dapat memproses banyak permintaan reset password. |

## Tabel Tanpa Relasi FK Langsung

Tabel berikut berdiri sendiri dari sisi relasi database pada model Sequelize saat ini:

- `pendaftaran_ppdb` - Menyimpan data calon siswa PPDB, data orang tua, dokumen pendukung, status penerimaan, dan catatan notifikasi.
- `profil_sekolah` - Menyimpan profil sekolah: NPSN, kontak, visi, misi, sejarah, fasilitas, struktur, dan akreditasi.
- `guru` - Menyimpan data guru untuk administrasi atau publikasi profil guru pada website sekolah.
- `kepala_sekolah` - Menyimpan data kepala sekolah, periode jabatan, kontak, pendidikan, foto, dan status.
- `kegiatan` - Menyimpan konten kegiatan sekolah yang ditampilkan pada website.
- `pengumuman` - Menyimpan konten pengumuman sekolah, kategori, isi, tanggal, dan gambar.
- `galeri` - Menyimpan dokumentasi gambar/foto galeri sekolah beserta kategori dan deskripsi.

## Catatan Desain

- `guru` dan `profil_guru` masih terpisah. `profil_guru` terhubung ke akun login, sedangkan `guru` dipakai sebagai data guru mandiri/publik.
- `pendaftaran_ppdb` belum memiliki FK ke `siswa`; konversi calon siswa diterima ke data siswa ditangani oleh logic aplikasi.
- `profil_sekolah` belum dibatasi menjadi satu baris aktif pada level database.
- `tautan_akun_portal` sebaiknya dipertimbangkan memiliki unique composite `(akun_pengguna_id, siswa_id, jenis_tautan)`.
