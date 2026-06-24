# Penjelasan ERD Portal CNB

Dokumen ini menjelaskan ERD Portal CNB dengan bahasa yang lebih mudah dipahami. Penjelasan ini sudah mengikuti schema database terbaru yang menggunakan nama tabel dan kolom berbahasa Indonesia.

## 1. Gambaran Besar Sistem

Database Portal CNB terbagi menjadi beberapa kelompok data besar:

1. **Akun dan keamanan akses**: `akun_pengguna`, `permintaan_reset_password`, dan `log_audit`.
2. **Akademik sekolah**: `kelas`, `siswa`, `profil_guru`, `jadwal_mengajar`, dan `absensi_siswa`.
3. **Portal siswa/orang tua**: `tautan_akun_portal`.
4. **PPDB**: `pendaftaran_ppdb`.
5. **Konten website/profil sekolah**: `profil_sekolah`, `guru`, `kepala_sekolah`, `kegiatan`, `pengumuman`, dan `galeri`.

Pusat relasi utama ada pada `akun_pengguna`, `kelas`, dan `siswa`. Tiga tabel ini menghubungkan fitur guru, jadwal, absensi, portal orang tua/siswa, audit, dan reset password.

## 2. Cara Membaca Relasi

ERD Draw.io menggunakan notasi **Crow's Foot**. Simbol `|` berarti satu data, sedangkan simbol kaki tiga berarti banyak data. Contoh `kelas |----< siswa` berarti satu kelas dapat memiliki banyak siswa.

| Notasi | Arti | Contoh |
|---|---|---|
| `1:1` | Satu data terhubung ke satu data | Satu `akun_pengguna` guru hanya punya satu `profil_guru` |
| `1:N` | Satu data terhubung ke banyak data | Satu `kelas` punya banyak `siswa` |
| `SET NULL` | Jika induk dihapus, FK anak dikosongkan | Siswa tetap ada walau kelas dihapus |
| `CASCADE` | Jika induk dihapus, data anak ikut terhapus | Absensi ikut hilang jika siswa dihapus |

## 3. Penjelasan Tiap Tabel

### 3.1 Akun Pengguna (`akun_pengguna`)

Menyimpan akun login seluruh pengguna sistem, termasuk admin, guru, siswa, orang tua, dan kepala sekolah.

**Kolom penting:**

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `INTEGER - PK, AI` | Primary key unik untuk setiap baris data. |
| `nama` | `STRING - NOT NULL` | Nama pengguna/orang/data utama sesuai konteks tabel. |
| `email` | `STRING - UK, NOT NULL` | Alamat email untuk kontak atau login. |
| `kata_sandi` | `STRING - NOT NULL` | Password akun; seharusnya berupa hash. |
| `peran` | `ENUM(admin, guru, siswa, orangtua, kepala_sekolah)` | Role pengguna dalam sistem. |
| `profesi` | `STRING` | Profesi pengguna bila diperlukan. |
| `wajib_ganti_kata_sandi` | `BOOLEAN - NOT NULL` | Penanda pengguna wajib mengganti password. |
| `dibuat_pada` | `DATETIME - NOT NULL` | Timestamp saat data dibuat. |
| `diperbarui_pada` | `DATETIME - NOT NULL` | Timestamp saat data terakhir diperbarui. |

**Relasi tabel:**

- `akun_pengguna` ke `profil_guru` adalah `1:1`: Satu akun guru hanya memiliki satu profil guru karena FK unique.
- `akun_pengguna` ke `profil_guru` adalah `1:N`: Satu admin/user dapat menyetujui banyak profil guru.
- `akun_pengguna` ke `jadwal_mengajar` adalah `1:N`: Satu akun guru dapat memiliki banyak jadwal mengajar.
- `akun_pengguna` ke `absensi_siswa` adalah `1:N`: Satu guru dapat mencatat banyak absensi siswa.
- `akun_pengguna` ke `tautan_akun_portal` adalah `1:N`: Satu akun dapat memiliki banyak tautan portal ke siswa.
- `akun_pengguna` ke `log_audit` adalah `1:N`: Satu akun dapat menghasilkan banyak log audit; log tetap ada jika akun pelaku dihapus.
- `akun_pengguna` ke `permintaan_reset_password` adalah `1:N`: Satu akun dapat cocok dengan banyak permintaan reset password.
- `akun_pengguna` ke `permintaan_reset_password` adalah `1:N`: Satu admin/user dapat memproses banyak permintaan reset password.

### 3.2 Profil Guru Portal (`profil_guru`)

Menyimpan profil tambahan untuk akun guru: tipe guru, mata pelajaran, jenjang, status wali kelas, kelas terkait, dan status verifikasi.

**Kolom penting:**

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `INTEGER - PK, AI` | Primary key unik untuk setiap baris data. |
| `akun_pengguna_id` | `INTEGER - UK, FK -> akun_pengguna.id, NOT NULL` | Foreign key ke tabel akun_pengguna. |
| `tipe_guru` | `ENUM(wali_kelas, mapel) - NOT NULL` | Jenis guru: wali_kelas atau mapel. |
| `mata_pelajaran` | `STRING` | Mata pelajaran terkait. |
| `jenjang` | `ENUM(sd, smp)` | Jenjang pendidikan terkait guru. |
| `wali_kelas` | `BOOLEAN - NOT NULL` | Penanda apakah guru adalah wali kelas. |
| `kelas_id` | `INTEGER - FK -> kelas.id` | Foreign key ke tabel kelas. |
| `status_verifikasi` | `ENUM(pending, approved, rejected)` | Status verifikasi profil guru. |
| `catatan` | `TEXT` | Catatan tambahan. |
| `disetujui_oleh_akun_pengguna_id` | `INTEGER - FK -> akun_pengguna.id` | Akun/admin yang menyetujui profil guru. |
| `disetujui_pada` | `DATETIME` | Waktu profil guru disetujui. |
| `dibuat_pada` | `DATETIME - NOT NULL` | Timestamp saat data dibuat. |
| `diperbarui_pada` | `DATETIME - NOT NULL` | Timestamp saat data terakhir diperbarui. |

**Relasi tabel:**

- `akun_pengguna` ke `profil_guru` adalah `1:1`: Satu akun guru hanya memiliki satu profil guru karena FK unique.
- `akun_pengguna` ke `profil_guru` adalah `1:N`: Satu admin/user dapat menyetujui banyak profil guru.
- `kelas` ke `profil_guru` adalah `1:N`: Satu kelas dapat terkait dengan banyak profil guru.

### 3.3 Kelas (`kelas`)

Menyimpan data kelas/rombongan belajar, tingkat, tahun ajaran, wali kelas teks, dan jumlah siswa.

**Kolom penting:**

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `INTEGER - PK, AI` | Primary key unik untuk setiap baris data. |
| `nama_kelas` | `STRING - NOT NULL` | Nama kelas/rombongan belajar. |
| `tingkat` | `STRING - NOT NULL` | Tingkat/level kelas. |
| `wali_kelas` | `STRING` | Penanda apakah guru adalah wali kelas. |
| `tahun_ajaran` | `STRING - NOT NULL` | Tahun ajaran data berlaku. |
| `jumlah_siswa` | `INTEGER` | Jumlah siswa pada kelas. |
| `dibuat_pada` | `DATETIME - NOT NULL` | Timestamp saat data dibuat. |
| `diperbarui_pada` | `DATETIME - NOT NULL` | Timestamp saat data terakhir diperbarui. |

**Relasi tabel:**

- `kelas` ke `siswa` adalah `1:N`: Satu kelas dapat memiliki banyak siswa; siswa boleh belum punya kelas.
- `kelas` ke `profil_guru` adalah `1:N`: Satu kelas dapat terkait dengan banyak profil guru.
- `kelas` ke `jadwal_mengajar` adalah `1:N`: Satu kelas dapat memiliki banyak jadwal mengajar.
- `kelas` ke `absensi_siswa` adalah `1:N`: Satu kelas dapat memiliki banyak catatan absensi.

### 3.4 Siswa (`siswa`)

Menyimpan data induk siswa, identitas, kelas, data orang tua, kontak, foto, dan status siswa.

**Kolom penting:**

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `INTEGER - PK, AI` | Primary key unik untuk setiap baris data. |
| `nisn` | `STRING - UK, NOT NULL` | Nomor Induk Siswa Nasional. |
| `nama` | `STRING - NOT NULL` | Nama pengguna/orang/data utama sesuai konteks tabel. |
| `kelas_id` | `INTEGER - FK -> kelas.id` | Foreign key ke tabel kelas. |
| `tempat_lahir` | `STRING` | Tempat lahir. |
| `tanggal_lahir` | `DATEONLY` | Tanggal lahir. |
| `jenis_kelamin` | `ENUM(L, P) - NOT NULL` | Jenis kelamin. |
| `agama` | `STRING` | Agama. |
| `alamat` | `TEXT` | Alamat lengkap. |
| `nama_ayah` | `STRING` | Nama ayah. |
| `nama_ibu` | `STRING` | Nama ibu. |
| `no_telepon` | `STRING` | Nomor telepon/kontak. |
| `email` | `STRING` | Alamat email untuk kontak atau login. |
| `foto` | `TEXT` | Foto profil/dokumentasi. |
| `status` | `ENUM(aktif, lulus, pindah, keluar)` | Status data sesuai konteks tabel. |
| `dibuat_pada` | `DATETIME - NOT NULL` | Timestamp saat data dibuat. |
| `diperbarui_pada` | `DATETIME - NOT NULL` | Timestamp saat data terakhir diperbarui. |

**Relasi tabel:**

- `siswa` ke `absensi_siswa` adalah `1:N`: Satu siswa dapat memiliki banyak catatan absensi.
- `siswa` ke `tautan_akun_portal` adalah `1:N`: Satu siswa dapat terhubung ke akun siswa dan/atau orang tua.
- `kelas` ke `siswa` adalah `1:N`: Satu kelas dapat memiliki banyak siswa; siswa boleh belum punya kelas.

### 3.5 Jadwal Mengajar (`jadwal_mengajar`)

Menyimpan jadwal mengajar guru per kelas, mata pelajaran, hari, jam, dan status jadwal.

**Kolom penting:**

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `INTEGER - PK, AI` | Primary key unik untuk setiap baris data. |
| `guru_akun_pengguna_id` | `INTEGER - FK -> akun_pengguna.id, NOT NULL` | Akun guru yang mengajar atau mencatat absensi. |
| `kelas_id` | `INTEGER - FK -> kelas.id, NOT NULL` | Foreign key ke tabel kelas. |
| `mata_pelajaran` | `STRING - NOT NULL` | Mata pelajaran terkait. |
| `hari` | `ENUM(senin, selasa, rabu, kamis, jumat, sabtu, minggu) - NOT NULL` | Nama hari jadwal atau absensi. |
| `jam_mulai` | `TIME - NOT NULL` | Kolom data sesuai kebutuhan domain sistem. |
| `jam_selesai` | `TIME - NOT NULL` | Kolom data sesuai kebutuhan domain sistem. |
| `status` | `ENUM(aktif, non-aktif)` | Status data sesuai konteks tabel. |
| `dibuat_pada` | `DATETIME - NOT NULL` | Timestamp saat data dibuat. |
| `diperbarui_pada` | `DATETIME - NOT NULL` | Timestamp saat data terakhir diperbarui. |

**Relasi tabel:**

- `jadwal_mengajar` ke `absensi_siswa` adalah `1:N`: Satu jadwal dapat menjadi referensi banyak absensi; absensi tetap ada jika jadwal dihapus.
- `akun_pengguna` ke `jadwal_mengajar` adalah `1:N`: Satu akun guru dapat memiliki banyak jadwal mengajar.
- `kelas` ke `jadwal_mengajar` adalah `1:N`: Satu kelas dapat memiliki banyak jadwal mengajar.

### 3.6 Absensi Siswa (`absensi_siswa`)

Menyimpan catatan kehadiran siswa berdasarkan siswa, kelas, guru pencatat, tanggal, mata pelajaran, dan status kehadiran.

**Kolom penting:**

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `INTEGER - PK, AI` | Primary key unik untuk setiap baris data. |
| `siswa_id` | `INTEGER - FK -> siswa.id, NOT NULL` | Kolom data sesuai kebutuhan domain sistem. |
| `kelas_id` | `INTEGER - FK -> kelas.id, NOT NULL` | Foreign key ke tabel kelas. |
| `guru_akun_pengguna_id` | `INTEGER - FK -> akun_pengguna.id, NOT NULL` | Akun guru yang mengajar atau mencatat absensi. |
| `jadwal_mengajar_id` | `INTEGER - FK -> jadwal_mengajar.id` | Foreign key ke tabel jadwal_mengajar. |
| `tanggal` | `DATEONLY - NOT NULL` | Tanggal kegiatan/pengumuman/absensi. |
| `hari` | `STRING - NOT NULL` | Nama hari jadwal atau absensi. |
| `tipe_guru` | `ENUM(wali_kelas, mapel) - NOT NULL` | Jenis guru: wali_kelas atau mapel. |
| `mata_pelajaran` | `STRING` | Mata pelajaran terkait. |
| `status` | `ENUM(hadir, izin, sakit, alpha) - NOT NULL` | Status data sesuai konteks tabel. |
| `keterangan` | `TEXT` | Keterangan absensi. |
| `dibuat_pada` | `DATETIME - NOT NULL` | Timestamp saat data dibuat. |
| `diperbarui_pada` | `DATETIME - NOT NULL` | Timestamp saat data terakhir diperbarui. |

**Relasi tabel:**

- `siswa` ke `absensi_siswa` adalah `1:N`: Satu siswa dapat memiliki banyak catatan absensi.
- `kelas` ke `absensi_siswa` adalah `1:N`: Satu kelas dapat memiliki banyak catatan absensi.
- `akun_pengguna` ke `absensi_siswa` adalah `1:N`: Satu guru dapat mencatat banyak absensi siswa.
- `jadwal_mengajar` ke `absensi_siswa` adalah `1:N`: Satu jadwal dapat menjadi referensi banyak absensi; absensi tetap ada jika jadwal dihapus.

### 3.7 Tautan Akun Portal (`tautan_akun_portal`)

Menghubungkan akun pengguna dengan data siswa untuk akses portal siswa dan orang tua.

**Kolom penting:**

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `INTEGER - PK, AI` | Primary key unik untuk setiap baris data. |
| `akun_pengguna_id` | `INTEGER - FK -> akun_pengguna.id, NOT NULL` | Foreign key ke tabel akun_pengguna. |
| `siswa_id` | `INTEGER - FK -> siswa.id, NOT NULL` | Kolom data sesuai kebutuhan domain sistem. |
| `jenis_tautan` | `ENUM(siswa, orangtua) - NOT NULL` | Jenis relasi akun portal: siswa atau orangtua. |
| `dibuat_pada` | `DATETIME - NOT NULL` | Timestamp saat data dibuat. |
| `diperbarui_pada` | `DATETIME - NOT NULL` | Timestamp saat data terakhir diperbarui. |

**Relasi tabel:**

- `akun_pengguna` ke `tautan_akun_portal` adalah `1:N`: Satu akun dapat memiliki banyak tautan portal ke siswa.
- `siswa` ke `tautan_akun_portal` adalah `1:N`: Satu siswa dapat terhubung ke akun siswa dan/atau orang tua.

### 3.8 Log Audit (`log_audit`)

Mencatat aktivitas penting sistem: pelaku, aksi, entitas, metadata, IP address, dan user agent.

**Kolom penting:**

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `INTEGER - PK, AI` | Primary key unik untuk setiap baris data. |
| `pelaku_akun_pengguna_id` | `INTEGER - FK -> akun_pengguna.id` | Akun pengguna yang melakukan aksi audit. |
| `aksi` | `STRING - NOT NULL` | Aksi yang dicatat pada audit log. |
| `jenis_entitas` | `STRING - NOT NULL` | Jenis entitas yang terdampak audit. |
| `entitas_id` | `STRING` | ID entitas yang terdampak audit. |
| `metadata` | `TEXT` | Metadata tambahan audit. |
| `alamat_ip` | `STRING` | IP address asal request. |
| `agen_pengguna` | `TEXT` | User agent/browser/perangkat asal request. |
| `dibuat_pada` | `DATETIME - NOT NULL` | Timestamp saat data dibuat. |

**Relasi tabel:**

- `akun_pengguna` ke `log_audit` adalah `1:N`: Satu akun dapat menghasilkan banyak log audit; log tetap ada jika akun pelaku dihapus.

### 3.9 Permintaan Reset Password (`permintaan_reset_password`)

Menyimpan permintaan reset password, pencocokan akun, status, admin pemroses, alasan penolakan, dan informasi request.

**Kolom penting:**

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `INTEGER - PK, AI` | Primary key unik untuk setiap baris data. |
| `peran` | `ENUM(guru, siswa, orangtua, kepala_sekolah) - NOT NULL` | Role pengguna dalam sistem. |
| `email` | `STRING - NOT NULL` | Alamat email untuk kontak atau login. |
| `nama` | `STRING - NOT NULL` | Nama pengguna/orang/data utama sesuai konteks tabel. |
| `nisn` | `STRING` | Nomor Induk Siswa Nasional. |
| `kelas` | `STRING` | Nama kelas pada permintaan reset password. |
| `catatan` | `TEXT` | Catatan tambahan. |
| `status` | `ENUM(pending, completed, rejected) - NOT NULL` | Status data sesuai konteks tabel. |
| `akun_pengguna_terkait_id` | `INTEGER - FK -> akun_pengguna.id` | Akun yang cocok dengan permintaan reset password. |
| `diproses_oleh_akun_pengguna_id` | `INTEGER - FK -> akun_pengguna.id` | Akun/admin yang memproses reset password. |
| `alasan_penolakan` | `TEXT` | Alasan reset password ditolak. |
| `alamat_ip` | `STRING` | IP address asal request. |
| `agen_pengguna` | `TEXT` | User agent/browser/perangkat asal request. |
| `diproses_pada` | `DATETIME` | Waktu reset password diproses. |
| `dibuat_pada` | `DATETIME - NOT NULL` | Timestamp saat data dibuat. |
| `diperbarui_pada` | `DATETIME - NOT NULL` | Timestamp saat data terakhir diperbarui. |

**Relasi tabel:**

- `akun_pengguna` ke `permintaan_reset_password` adalah `1:N`: Satu akun dapat cocok dengan banyak permintaan reset password.
- `akun_pengguna` ke `permintaan_reset_password` adalah `1:N`: Satu admin/user dapat memproses banyak permintaan reset password.

### 3.10 Pendaftaran PPDB (`pendaftaran_ppdb`)

Menyimpan data calon siswa PPDB, data orang tua, dokumen pendukung, status penerimaan, dan catatan notifikasi.

**Kolom penting:**

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `INTEGER - PK, AI` | Primary key unik untuk setiap baris data. |
| `jenis_pendaftaran` | `ENUM(pendaftaran_baru, siswa_pindahan) - NOT NULL` | Jenis pendaftaran PPDB. |
| `target_jenjang` | `ENUM(tk, sd, smp) - NOT NULL` | Jenjang tujuan PPDB. |
| `nama_lengkap` | `STRING - NOT NULL` | Nama lengkap calon siswa. |
| `nisn` | `STRING` | Nomor Induk Siswa Nasional. |
| `tempat_lahir` | `STRING` | Tempat lahir. |
| `tanggal_lahir` | `DATEONLY - NOT NULL` | Tanggal lahir. |
| `jenis_kelamin` | `ENUM(L, P) - NOT NULL` | Jenis kelamin. |
| `agama` | `STRING` | Agama. |
| `alamat` | `TEXT - NOT NULL` | Alamat lengkap. |
| `nama_orang_tua` | `STRING - NOT NULL` | Nama orang tua/wali utama. |
| `nama_ayah` | `STRING` | Nama ayah. |
| `nama_ibu` | `STRING` | Nama ibu. |
| `pekerjaan_ayah` | `STRING` | Pekerjaan ayah. |
| `pekerjaan_ibu` | `STRING` | Pekerjaan ibu. |
| `no_telepon` | `STRING - NOT NULL` | Nomor telepon/kontak. |
| `email` | `STRING - NOT NULL` | Alamat email untuk kontak atau login. |
| `asal_sekolah` | `STRING` | Asal sekolah calon siswa. |
| `status` | `ENUM(pending, diterima, ditolak)` | Status data sesuai konteks tabel. |
| `tahun_ajaran` | `STRING - NOT NULL` | Tahun ajaran data berlaku. |
| `berkas_kk` | `LONGTEXT` | File kartu keluarga. |
| `berkas_raport` | `LONGTEXT` | File rapor. |
| `foto_siswa` | `LONGTEXT` | Foto calon siswa. |
| `berkas_surat_pindah` | `LONGTEXT` | File surat pindah. |
| `catatan_notifikasi` | `TEXT` | Catatan notifikasi/keputusan PPDB. |
| `dibuat_pada` | `DATETIME - NOT NULL` | Timestamp saat data dibuat. |
| `diperbarui_pada` | `DATETIME - NOT NULL` | Timestamp saat data terakhir diperbarui. |

Tabel ini berdiri sendiri dan belum memiliki relasi foreign key langsung pada model Sequelize saat ini.

### 3.11 Profil Sekolah (`profil_sekolah`)

Menyimpan profil sekolah: NPSN, kontak, visi, misi, sejarah, fasilitas, struktur, dan akreditasi.

**Kolom penting:**

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `INTEGER - PK, AI` | Primary key unik untuk setiap baris data. |
| `nama_sekolah` | `STRING - NOT NULL` | Nama sekolah. |
| `npsn` | `STRING` | Nomor Pokok Sekolah Nasional. |
| `alamat` | `TEXT` | Alamat lengkap. |
| `telepon` | `STRING` | Telepon sekolah. |
| `email` | `STRING` | Alamat email untuk kontak atau login. |
| `website` | `STRING` | Website sekolah. |
| `logo` | `TEXT` | Logo sekolah. |
| `visi` | `TEXT` | Visi sekolah. |
| `misi` | `TEXT` | Misi sekolah. |
| `sejarah` | `TEXT` | Sejarah sekolah. |
| `fasilitas` | `TEXT` | Fasilitas sekolah. |
| `struktur_sekolah` | `TEXT` | Struktur organisasi sekolah. |
| `akreditasi` | `STRING` | Akreditasi sekolah. |
| `dibuat_pada` | `DATETIME - NOT NULL` | Timestamp saat data dibuat. |
| `diperbarui_pada` | `DATETIME - NOT NULL` | Timestamp saat data terakhir diperbarui. |

Tabel ini berdiri sendiri dan belum memiliki relasi foreign key langsung pada model Sequelize saat ini.

### 3.12 Data Guru (`guru`)

Menyimpan data guru untuk administrasi atau publikasi profil guru pada website sekolah.

**Kolom penting:**

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `INTEGER - PK, AI` | Primary key unik untuk setiap baris data. |
| `nip` | `STRING - UK, NOT NULL` | Nomor Induk Pegawai. |
| `nama` | `STRING - NOT NULL` | Nama pengguna/orang/data utama sesuai konteks tabel. |
| `email` | `STRING` | Alamat email untuk kontak atau login. |
| `no_telepon` | `STRING` | Nomor telepon/kontak. |
| `mata_pelajaran` | `STRING` | Mata pelajaran terkait. |
| `pendidikan_terakhir` | `STRING` | Pendidikan terakhir. |
| `foto` | `TEXT` | Foto profil/dokumentasi. |
| `alamat` | `TEXT` | Alamat lengkap. |
| `tanggal_lahir` | `DATEONLY` | Tanggal lahir. |
| `jenis_kelamin` | `ENUM(L, P)` | Jenis kelamin. |
| `status` | `ENUM(aktif, non-aktif)` | Status data sesuai konteks tabel. |
| `dibuat_pada` | `DATETIME - NOT NULL` | Timestamp saat data dibuat. |
| `diperbarui_pada` | `DATETIME - NOT NULL` | Timestamp saat data terakhir diperbarui. |

Tabel ini berdiri sendiri dan belum memiliki relasi foreign key langsung pada model Sequelize saat ini.

### 3.13 Kepala Sekolah (`kepala_sekolah`)

Menyimpan data kepala sekolah, periode jabatan, kontak, pendidikan, foto, dan status.

**Kolom penting:**

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `INTEGER - PK, AI` | Primary key unik untuk setiap baris data. |
| `nip` | `STRING - UK, NOT NULL` | Nomor Induk Pegawai. |
| `nama` | `STRING - NOT NULL` | Nama pengguna/orang/data utama sesuai konteks tabel. |
| `email` | `STRING` | Alamat email untuk kontak atau login. |
| `no_telepon` | `STRING` | Nomor telepon/kontak. |
| `foto` | `TEXT` | Foto profil/dokumentasi. |
| `periode_mulai` | `DATEONLY - NOT NULL` | Tanggal mulai periode jabatan. |
| `periode_akhir` | `DATEONLY` | Tanggal akhir periode jabatan. |
| `alamat` | `TEXT` | Alamat lengkap. |
| `pendidikan_terakhir` | `STRING` | Pendidikan terakhir. |
| `status` | `ENUM(aktif, non-aktif)` | Status data sesuai konteks tabel. |
| `dibuat_pada` | `DATETIME - NOT NULL` | Timestamp saat data dibuat. |
| `diperbarui_pada` | `DATETIME - NOT NULL` | Timestamp saat data terakhir diperbarui. |

Tabel ini berdiri sendiri dan belum memiliki relasi foreign key langsung pada model Sequelize saat ini.

### 3.14 Kegiatan (`kegiatan`)

Menyimpan konten kegiatan sekolah yang ditampilkan pada website.

**Kolom penting:**

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `INTEGER - PK, AI` | Primary key unik untuk setiap baris data. |
| `judul` | `STRING - NOT NULL` | Judul konten. |
| `tanggal` | `DATEONLY - NOT NULL` | Tanggal kegiatan/pengumuman/absensi. |
| `deskripsi` | `TEXT - NOT NULL` | Deskripsi konten. |
| `gambar` | `LONGTEXT` | File atau URL gambar. |
| `status` | `ENUM(tampil, tidak_tampil) - NOT NULL` | Status data sesuai konteks tabel. |
| `dibuat_pada` | `DATETIME - NOT NULL` | Timestamp saat data dibuat. |
| `diperbarui_pada` | `DATETIME - NOT NULL` | Timestamp saat data terakhir diperbarui. |

Tabel ini berdiri sendiri dan belum memiliki relasi foreign key langsung pada model Sequelize saat ini.

### 3.15 Pengumuman (`pengumuman`)

Menyimpan konten pengumuman sekolah, kategori, isi, tanggal, dan gambar.

**Kolom penting:**

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `INTEGER - PK, AI` | Primary key unik untuk setiap baris data. |
| `judul` | `STRING - NOT NULL` | Judul konten. |
| `tanggal` | `DATEONLY - NOT NULL` | Tanggal kegiatan/pengumuman/absensi. |
| `isi` | `TEXT - NOT NULL` | Isi pengumuman/konten. |
| `kategori` | `STRING` | Kategori konten. |
| `gambar` | `TEXT` | File atau URL gambar. |
| `dibuat_pada` | `DATETIME - NOT NULL` | Timestamp saat data dibuat. |
| `diperbarui_pada` | `DATETIME - NOT NULL` | Timestamp saat data terakhir diperbarui. |

Tabel ini berdiri sendiri dan belum memiliki relasi foreign key langsung pada model Sequelize saat ini.

### 3.16 Galeri (`galeri`)

Menyimpan dokumentasi gambar/foto galeri sekolah beserta kategori dan deskripsi.

**Kolom penting:**

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `INTEGER - PK, AI` | Primary key unik untuk setiap baris data. |
| `judul` | `STRING - NOT NULL` | Judul konten. |
| `gambar` | `LONGTEXT - NOT NULL` | File atau URL gambar. |
| `deskripsi` | `TEXT` | Deskripsi konten. |
| `kategori` | `STRING` | Kategori konten. |
| `dibuat_pada` | `DATETIME - NOT NULL` | Timestamp saat data dibuat. |
| `diperbarui_pada` | `DATETIME - NOT NULL` | Timestamp saat data terakhir diperbarui. |

Tabel ini berdiri sendiri dan belum memiliki relasi foreign key langsung pada model Sequelize saat ini.

## 4. Penjelasan Relasi Utama

### 4.1 `kelas` ke `siswa`

- Kardinalitas: `1:N`
- Foreign key: `siswa.kelas_id`
- Referensi: `kelas.id`
- Saat data induk dihapus: `SET NULL`
- Saat data induk diupdate: `CASCADE`
- Makna bisnis: Satu kelas dapat memiliki banyak siswa; siswa boleh belum punya kelas.

### 4.2 `akun_pengguna` ke `profil_guru`

- Kardinalitas: `1:1`
- Foreign key: `profil_guru.akun_pengguna_id`
- Referensi: `akun_pengguna.id`
- Saat data induk dihapus: `CASCADE`
- Saat data induk diupdate: `CASCADE`
- Makna bisnis: Satu akun guru hanya memiliki satu profil guru karena FK unique.

### 4.3 `akun_pengguna` ke `profil_guru`

- Kardinalitas: `1:N`
- Foreign key: `profil_guru.disetujui_oleh_akun_pengguna_id`
- Referensi: `akun_pengguna.id`
- Saat data induk dihapus: `SET NULL`
- Saat data induk diupdate: `CASCADE`
- Makna bisnis: Satu admin/user dapat menyetujui banyak profil guru.

### 4.4 `kelas` ke `profil_guru`

- Kardinalitas: `1:N`
- Foreign key: `profil_guru.kelas_id`
- Referensi: `kelas.id`
- Saat data induk dihapus: `SET NULL`
- Saat data induk diupdate: `CASCADE`
- Makna bisnis: Satu kelas dapat terkait dengan banyak profil guru.

### 4.5 `akun_pengguna` ke `jadwal_mengajar`

- Kardinalitas: `1:N`
- Foreign key: `jadwal_mengajar.guru_akun_pengguna_id`
- Referensi: `akun_pengguna.id`
- Saat data induk dihapus: `CASCADE`
- Saat data induk diupdate: `CASCADE`
- Makna bisnis: Satu akun guru dapat memiliki banyak jadwal mengajar.

### 4.6 `kelas` ke `jadwal_mengajar`

- Kardinalitas: `1:N`
- Foreign key: `jadwal_mengajar.kelas_id`
- Referensi: `kelas.id`
- Saat data induk dihapus: `CASCADE`
- Saat data induk diupdate: `CASCADE`
- Makna bisnis: Satu kelas dapat memiliki banyak jadwal mengajar.

### 4.7 `siswa` ke `absensi_siswa`

- Kardinalitas: `1:N`
- Foreign key: `absensi_siswa.siswa_id`
- Referensi: `siswa.id`
- Saat data induk dihapus: `CASCADE`
- Saat data induk diupdate: `CASCADE`
- Makna bisnis: Satu siswa dapat memiliki banyak catatan absensi.

### 4.8 `kelas` ke `absensi_siswa`

- Kardinalitas: `1:N`
- Foreign key: `absensi_siswa.kelas_id`
- Referensi: `kelas.id`
- Saat data induk dihapus: `CASCADE`
- Saat data induk diupdate: `CASCADE`
- Makna bisnis: Satu kelas dapat memiliki banyak catatan absensi.

### 4.9 `akun_pengguna` ke `absensi_siswa`

- Kardinalitas: `1:N`
- Foreign key: `absensi_siswa.guru_akun_pengguna_id`
- Referensi: `akun_pengguna.id`
- Saat data induk dihapus: `CASCADE`
- Saat data induk diupdate: `CASCADE`
- Makna bisnis: Satu guru dapat mencatat banyak absensi siswa.

### 4.10 `jadwal_mengajar` ke `absensi_siswa`

- Kardinalitas: `1:N`
- Foreign key: `absensi_siswa.jadwal_mengajar_id`
- Referensi: `jadwal_mengajar.id`
- Saat data induk dihapus: `SET NULL`
- Saat data induk diupdate: `CASCADE`
- Makna bisnis: Satu jadwal dapat menjadi referensi banyak absensi; absensi tetap ada jika jadwal dihapus.

### 4.11 `akun_pengguna` ke `tautan_akun_portal`

- Kardinalitas: `1:N`
- Foreign key: `tautan_akun_portal.akun_pengguna_id`
- Referensi: `akun_pengguna.id`
- Saat data induk dihapus: `CASCADE`
- Saat data induk diupdate: `CASCADE`
- Makna bisnis: Satu akun dapat memiliki banyak tautan portal ke siswa.

### 4.12 `siswa` ke `tautan_akun_portal`

- Kardinalitas: `1:N`
- Foreign key: `tautan_akun_portal.siswa_id`
- Referensi: `siswa.id`
- Saat data induk dihapus: `CASCADE`
- Saat data induk diupdate: `CASCADE`
- Makna bisnis: Satu siswa dapat terhubung ke akun siswa dan/atau orang tua.

### 4.13 `akun_pengguna` ke `log_audit`

- Kardinalitas: `1:N`
- Foreign key: `log_audit.pelaku_akun_pengguna_id`
- Referensi: `akun_pengguna.id`
- Saat data induk dihapus: `SET NULL`
- Saat data induk diupdate: `CASCADE`
- Makna bisnis: Satu akun dapat menghasilkan banyak log audit; log tetap ada jika akun pelaku dihapus.

### 4.14 `akun_pengguna` ke `permintaan_reset_password`

- Kardinalitas: `1:N`
- Foreign key: `permintaan_reset_password.akun_pengguna_terkait_id`
- Referensi: `akun_pengguna.id`
- Saat data induk dihapus: `SET NULL`
- Saat data induk diupdate: `CASCADE`
- Makna bisnis: Satu akun dapat cocok dengan banyak permintaan reset password.

### 4.15 `akun_pengguna` ke `permintaan_reset_password`

- Kardinalitas: `1:N`
- Foreign key: `permintaan_reset_password.diproses_oleh_akun_pengguna_id`
- Referensi: `akun_pengguna.id`
- Saat data induk dihapus: `SET NULL`
- Saat data induk diupdate: `CASCADE`
- Makna bisnis: Satu admin/user dapat memproses banyak permintaan reset password.

## 5. Alur Data yang Didukung Database

### 5.1 Alur Akun Guru

1. Akun dibuat di `akun_pengguna` dengan `peran = guru`.
2. Detail guru portal disimpan di `profil_guru`.
3. Admin memverifikasi profil lewat `disetujui_oleh_akun_pengguna_id` dan `disetujui_pada`.
4. Guru mendapatkan jadwal di `jadwal_mengajar`.
5. Guru mencatat kehadiran siswa di `absensi_siswa`.

### 5.2 Alur Siswa dan Orang Tua

1. Data siswa disimpan di `siswa`.
2. Siswa ditempatkan ke kelas melalui `kelas_id`.
3. Akun siswa/orang tua dibuat di `akun_pengguna`.
4. Hubungan akun dan siswa disimpan di `tautan_akun_portal`.
5. Riwayat kehadiran siswa tersimpan di `absensi_siswa`.

### 5.3 Alur Absensi

1. Jadwal guru disimpan di `jadwal_mengajar`.
2. Saat absensi dibuat, data mengacu ke `siswa`, `kelas`, dan akun guru pencatat.
3. Jika absensi dibuat dari jadwal tertentu, `jadwal_mengajar_id` diisi.
4. Jika jadwal dihapus, data absensi tetap tersimpan dan `jadwal_mengajar_id` menjadi `NULL`.

### 5.4 Alur Reset Password

1. Pengguna mengajukan reset password ke `permintaan_reset_password`.
2. Sistem/admin mencocokkan permintaan dengan `akun_pengguna_terkait_id`.
3. Admin pemroses disimpan pada `diproses_oleh_akun_pengguna_id`.
4. Status menjadi `pending`, `completed`, atau `rejected`.
5. Jika ditolak, alasan disimpan di `alasan_penolakan`.

### 5.5 Alur Audit Log

1. Aktivitas penting sistem dicatat di `log_audit`.
2. Jika aksi dilakukan oleh user login, `pelaku_akun_pengguna_id` mengarah ke `akun_pengguna`.
3. Jika akun pelaku dihapus, audit log tetap disimpan dan kolom pelaku menjadi `NULL`.

### 5.6 Alur PPDB

1. Calon siswa mengisi formulir pendaftaran.
2. Data masuk ke `pendaftaran_ppdb`.
3. Admin mengubah `status` menjadi `pending`, `diterima`, atau `ditolak`.
4. Jika diterima, data dapat dibuat menjadi `siswa`, tetapi saat ini belum ada FK langsung dari `pendaftaran_ppdb` ke `siswa`.

## 6. Ringkasan Kardinalitas

| Relasi | Kardinalitas | Makna Singkat |
|---|---|---|
| `kelas` → `siswa` | `1:N` | Satu kelas dapat memiliki banyak siswa; siswa boleh belum punya kelas. |
| `akun_pengguna` → `profil_guru` | `1:1` | Satu akun guru hanya memiliki satu profil guru karena FK unique. |
| `akun_pengguna` → `profil_guru` | `1:N` | Satu admin/user dapat menyetujui banyak profil guru. |
| `kelas` → `profil_guru` | `1:N` | Satu kelas dapat terkait dengan banyak profil guru. |
| `akun_pengguna` → `jadwal_mengajar` | `1:N` | Satu akun guru dapat memiliki banyak jadwal mengajar. |
| `kelas` → `jadwal_mengajar` | `1:N` | Satu kelas dapat memiliki banyak jadwal mengajar. |
| `siswa` → `absensi_siswa` | `1:N` | Satu siswa dapat memiliki banyak catatan absensi. |
| `kelas` → `absensi_siswa` | `1:N` | Satu kelas dapat memiliki banyak catatan absensi. |
| `akun_pengguna` → `absensi_siswa` | `1:N` | Satu guru dapat mencatat banyak absensi siswa. |
| `jadwal_mengajar` → `absensi_siswa` | `1:N` | Satu jadwal dapat menjadi referensi banyak absensi; absensi tetap ada jika jadwal dihapus. |
| `akun_pengguna` → `tautan_akun_portal` | `1:N` | Satu akun dapat memiliki banyak tautan portal ke siswa. |
| `siswa` → `tautan_akun_portal` | `1:N` | Satu siswa dapat terhubung ke akun siswa dan/atau orang tua. |
| `akun_pengguna` → `log_audit` | `1:N` | Satu akun dapat menghasilkan banyak log audit; log tetap ada jika akun pelaku dihapus. |
| `akun_pengguna` → `permintaan_reset_password` | `1:N` | Satu akun dapat cocok dengan banyak permintaan reset password. |
| `akun_pengguna` → `permintaan_reset_password` | `1:N` | Satu admin/user dapat memproses banyak permintaan reset password. |

## 7. Rekomendasi agar Lebih Rapi ke Depan

- Tambahkan relasi eksplisit antara `pendaftaran_ppdb` dan `siswa` jika ingin melacak siswa yang berasal dari PPDB.
- Pertimbangkan menghubungkan `guru` dengan `akun_pengguna` atau `profil_guru` agar data guru publik dan akun guru tidak terpisah.
- Tambahkan unique composite pada `tautan_akun_portal` untuk mencegah duplikasi tautan akun ke siswa yang sama.
- Jika `profil_sekolah` hanya boleh satu data aktif, tambahkan validasi singleton atau kolom `is_active`.
- Untuk audit dan reset password, pastikan data sensitif tidak disimpan berlebihan pada `metadata`, `catatan`, atau `agen_pengguna`.

## 8. Kesimpulan

ERD terbaru Portal CNB memiliki **16 tabel** dan **15 relasi eksplisit** pada model Sequelize. Perubahan penting dibanding schema lama adalah penggunaan nama tabel Indonesia, tambahan `log_audit`, tambahan `permintaan_reset_password`, dukungan role `kepala_sekolah`, serta kolom kontrol seperti `wajib_ganti_kata_sandi`, `jenjang`, `wali_kelas`, dan `status` pada kegiatan.
