# Penjelasan ERD Portal CNB

Dokumen ini menjelaskan Entity Relationship Diagram (ERD) untuk project Portal CNB. ERD ini dibuat berdasarkan model Sequelize pada folder `backend/src/models` dan asosiasi relasi pada `backend/src/models/index.js`.

## 1. Gambaran Umum

Portal CNB adalah sistem informasi sekolah yang memiliki beberapa domain data utama:

1. **Akun dan Peran Pengguna**
   - Menyimpan akun masuk untuk administrator, guru, siswa, dan orang tua.
   - Direpresentasikan oleh tabel `akun_pengguna`.

2. **Akademik Sekolah**
   - Mengelola kelas, siswa, jadwal mengajar, profil guru portal, dan absensi siswa.
   - Direpresentasikan oleh tabel `kelas`, `siswa`, `profil_guru`, `jadwal_mengajar`, dan `absensi_siswa`.

3. **Portal Siswa dan Orang Tua**
   - Menghubungkan akun portal dengan data siswa.
   - Direpresentasikan oleh tabel `tautan_akun_portal`.

4. **Konten Situs Web Sekolah**
   - Menyimpan kegiatan, pengumuman, galeri, profil sekolah, data guru, dan kepala sekolah.
   - Direpresentasikan oleh tabel `kegiatan`, `pengumuman`, `galeri`, `profil_sekolah`, `guru`, dan `kepala_sekolah`.

5. **PPDB / Pendaftaran Siswa Baru**
   - Menyimpan data calon siswa dan dokumen pendaftaran.
   - Direpresentasikan oleh tabel `pendaftaran_ppdb`.

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
kelas 1 ----< N siswa
```

Artinya satu kelas dapat memiliki banyak siswa, sedangkan satu siswa hanya berada pada satu kelas.

## 3. Daftar Entitas Utama

### 3.1 `akun_pengguna` - Akun Pengguna

Tabel ini menyimpan akun login seluruh pengguna sistem.

| Kolom | Fungsi |
|---|---|
| `id` | Primary key akun pengguna |
| `name` | Nama pengguna |
| `email` | Email masuk, bersifat unik |
| `password` | Kata sandi pengguna, idealnya berupa hash |
| `role` | Peran pengguna: `admin`, `guru`, `siswa`, atau `orangtua` |
| `profession` | Profesi pengguna jika diperlukan |
| `dibuat_pada` | Waktu data dibuat |
| `diperbarui_pada` | Waktu data terakhir diperbarui |

Relasi penting:

- Satu `akun_pengguna` dapat memiliki satu `profil_guru` jika role pengguna adalah guru.
- Satu `akun_pengguna` dapat membuat banyak `jadwal_mengajar` sebagai guru pengajar.
- Satu `akun_pengguna` dapat mencatat banyak `absensi_siswa`.
- Satu `akun_pengguna` dapat memiliki banyak `tautan_akun_portal` untuk akun siswa/orang tua.
- Satu `akun_pengguna` juga dapat menjadi approver untuk banyak `profil_guru`.

### 3.2 `kelas` - Kelas

Tabel ini menyimpan data kelas di sekolah.

| Kolom | Fungsi |
|---|---|
| `id` | Primary key kelas |
| `class_name` | Nama kelas, contoh: `7A`, `8B`, `TK A` |
| `grade_level` | Tingkat kelas atau jenjang |
| `wali_kelas` | Nama wali kelas dalam bentuk teks |
| `academic_year` | Tahun ajaran |
| `siswa_count` | Jumlah siswa pada kelas tersebut |
| `room` | Nama atau nomor ruangan kelas |
| `dibuat_pada` | Waktu data dibuat |
| `diperbarui_pada` | Waktu data terakhir diperbarui |

Relasi penting:

- Satu kelas memiliki banyak siswa.
- Satu kelas dapat memiliki banyak profil guru wali/mapel.
- Satu kelas dapat memiliki banyak jadwal mengajar.
- Satu kelas dapat memiliki banyak data absensi siswa.

Catatan desain:

- Kolom `wali_kelas` masih berupa teks.
- Relasi wali kelas yang lebih terstruktur sebenarnya ada di `profil_guru.kelas_id` dengan `tipe_guru = 'wali_kelas'`.

### 3.3 `siswa` - Siswa

Tabel ini menyimpan data siswa aktif maupun nonaktif.

| Kolom | Fungsi |
|---|---|
| `id` | Primary key siswa |
| `national_siswa_id` | NISN siswa, bersifat unik |
| `name` | Nama siswa |
| `kelas_id` | Foreign key ke tabel `kelas` |
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
| `dibuat_pada` | Waktu data dibuat |
| `diperbarui_pada` | Waktu data terakhir diperbarui |

Relasi penting:

- Banyak siswa dapat berada dalam satu kelas.
- Satu siswa dapat memiliki banyak data absensi.
- Satu siswa dapat dihubungkan dengan banyak akun portal melalui `tautan_akun_portal`.

Contoh penggunaan:

- Jika satu siswa memiliki akun sendiri dan orang tua juga memiliki akun, maka tabel `tautan_akun_portal` dapat menyimpan dua baris untuk siswa yang sama dengan `link_type` berbeda.

### 3.4 `profil_guru` - Profil Guru Portal

Tabel ini menyimpan profil guru yang terhubung dengan akun login.

| Kolom | Fungsi |
|---|---|
| `id` | Primary key profil guru |
| `akun_pengguna_id` | Foreign key ke `akun_pengguna.id`, bersifat unik |
| `tipe_guru` | Jenis guru: `wali_kelas` atau `mapel` |
| `mata_pelajaran` | Mata pelajaran yang diajar |
| `kelas_id` | Foreign key ke kelas jika guru menjadi wali kelas atau terkait kelas tertentu |
| `verification_status` | Status verifikasi: `pending`, `approved`, atau `rejected` |
| `note` | Catatan verifikasi |
| `disetujui_oleh_akun_pengguna_id` | Pengguna/administrator yang menyetujui profil guru |
| `approved_at` | Waktu profil disetujui |
| `dibuat_pada` | Waktu data dibuat |
| `diperbarui_pada` | Waktu data terakhir diperbarui |

Relasi penting:

- Satu akun guru hanya dapat memiliki satu profil guru karena `akun_pengguna_id` bersifat unik.
- Satu admin/user dapat menyetujui banyak profil guru.
- Satu kelas dapat terhubung ke banyak profil guru.

Makna relasi:

```text
akun_pengguna 1 ---- 1 profil_guru
```

Artinya satu akun guru hanya memiliki satu profil guru portal.

```text
akun_pengguna 1 ----< N profil_guru
```

Artinya satu user/admin dapat menjadi approver untuk banyak profil guru.

### 3.5 `jadwal_mengajar` - Jadwal Mengajar

Tabel ini menyimpan jadwal mengajar guru per kelas dan mata pelajaran.

| Kolom | Fungsi |
|---|---|
| `id` | Primary key jadwal mengajar |
| `guru_akun_pengguna_id` | Foreign key ke akun guru di `akun_pengguna` |
| `kelas_id` | Foreign key ke kelas |
| `mata_pelajaran` | Mata pelajaran |
| `day_name` | Hari jadwal: `senin` sampai `minggu` |
| `start_time` | Jam mulai |
| `end_time` | Jam selesai |
| `status` | Status jadwal: `aktif` atau `non-aktif` |
| `dibuat_pada` | Waktu data dibuat |
| `diperbarui_pada` | Waktu data terakhir diperbarui |

Relasi penting:

- Satu guru dapat memiliki banyak jadwal mengajar.
- Satu kelas dapat memiliki banyak jadwal mengajar.
- Satu jadwal mengajar dapat digunakan oleh banyak data absensi siswa.

Contoh:

Jika guru matematika mengajar kelas `7A` setiap Senin pukul 08:00, maka data tersebut masuk ke tabel `jadwal_mengajar`.

### 3.6 `absensi_siswa` - Absensi Siswa

Tabel ini menyimpan catatan kehadiran siswa.

| Kolom | Fungsi |
|---|---|
| `id` | Primary key absensi |
| `siswa_id` | Foreign key ke siswa |
| `kelas_id` | Foreign key ke kelas |
| `guru_akun_pengguna_id` | Foreign key ke akun guru pencatat absensi |
| `jadwal_mengajar_id` | Foreign key opsional ke jadwal mengajar |
| `attendance_date` | Tanggal absensi |
| `day_name` | Nama hari absensi |
| `tipe_guru` | Jenis guru yang mencatat: `wali_kelas` atau `mapel` |
| `mata_pelajaran` | Mata pelajaran jika absensi berdasarkan mapel |
| `status` | Status kehadiran: `hadir`, `izin`, `sakit`, atau `alpha` |
| `note` | Catatan absensi |
| `dibuat_pada` | Waktu data dibuat |
| `diperbarui_pada` | Waktu data terakhir diperbarui |

Relasi penting:

- Satu siswa dapat memiliki banyak catatan absensi.
- Satu kelas dapat memiliki banyak catatan absensi.
- Satu guru dapat mencatat banyak absensi.
- Satu jadwal mengajar dapat memiliki banyak catatan absensi.

Catatan:

- `jadwal_mengajar_id` bersifat opsional, sehingga absensi tetap bisa dibuat tanpa terhubung langsung ke jadwal.
- Data `kelas_id`, `guru_akun_pengguna_id`, dan `mata_pelajaran` disimpan juga di absensi agar riwayat tetap jelas walaupun data jadwal berubah.

### 3.7 `tautan_akun_portal` - Link Akun Portal

Tabel ini menjadi penghubung antara akun login dengan siswa.

| Kolom | Fungsi |
|---|---|
| `id` | Primary key link akun portal |
| `akun_pengguna_id` | Foreign key ke akun pengguna |
| `siswa_id` | Foreign key ke siswa |
| `link_type` | Jenis link: `siswa` atau `orangtua` |
| `dibuat_pada` | Waktu data dibuat |
| `diperbarui_pada` | Waktu data terakhir diperbarui |

Relasi penting:

- Satu akun pengguna dapat memiliki banyak link ke siswa.
- Satu siswa dapat memiliki banyak akun portal terkait.

Contoh:

- Akun siswa: `link_type = 'siswa'`
- Akun orang tua: `link_type = 'orangtua'`

Dengan desain ini, satu siswa bisa diakses oleh akun siswa dan akun orang tua.

## 4. Entitas Konten Situs Web

### 4.1 `guru` - Data Guru

Tabel ini menyimpan data guru untuk kebutuhan informasi sekolah atau halaman publik.

| Kolom | Fungsi |
|---|---|
| `id` | Primary key data guru |
| `employee_number` | NIP guru, bersifat unik |
| `name` | Nama guru |
| `email` | Email guru |
| `phone_number` | Nomor telepon |
| `mata_pelajaran` | Mata pelajaran |
| `last_education` | Pendidikan terakhir |
| `photo` | Foto guru |
| `address` | Alamat guru |
| `birth_date` | Tanggal lahir |
| `gender` | Jenis kelamin |
| `status` | Status guru: `aktif` atau `non-aktif` |
| `dibuat_pada` | Waktu data dibuat |
| `diperbarui_pada` | Waktu data terakhir diperbarui |

Catatan:

- Tabel ini belum memiliki relasi langsung ke `akun_pengguna` atau `profil_guru`.
- Jika ingin menyatukan data guru publik dengan akun guru, perlu ditambahkan FK seperti `akun_pengguna_id` atau `profil_guru_id`.

### 4.2 `kepala_sekolah` - Kepala Sekolah

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
| `dibuat_pada` | Waktu data dibuat |
| `diperbarui_pada` | Waktu data terakhir diperbarui |

Tabel ini berdiri sendiri dan belum memiliki FK ke tabel lain.

### 4.3 `profil_sekolah` - Profil Sekolah

Tabel ini menyimpan informasi umum sekolah.

| Kolom | Fungsi |
|---|---|
| `id` | Primary key profil sekolah |
| `school_name` | Nama sekolah |
| `npsn` | Nomor Pokok Sekolah Nasional |
| `address` | Alamat sekolah |
| `phone_number` | Nomor telepon sekolah |
| `email` | Email sekolah |
| `website` | Situs web sekolah |
| `logo` | Logo sekolah |
| `vision` | Visi sekolah |
| `mission` | Misi sekolah |
| `history` | Sejarah sekolah |
| `facility` | Fasilitas sekolah |
| `school_structure` | Struktur organisasi sekolah |
| `accreditation` | Akreditasi sekolah |
| `dibuat_pada` | Waktu data dibuat |
| `diperbarui_pada` | Waktu data terakhir diperbarui |

Catatan:

- Biasanya tabel ini hanya berisi satu data aktif, tetapi schema saat ini belum membatasi jumlah baris menjadi satu.

### 4.4 `kegiatan` - Kegiatan

Tabel ini menyimpan data kegiatan sekolah.

| Kolom | Fungsi |
|---|---|
| `id` | Primary key kegiatan |
| `title` | Judul kegiatan |
| `date` | Tanggal kegiatan |
| `description` | Deskripsi kegiatan |
| `image` | Gambar kegiatan |
| `dibuat_pada` | Waktu data dibuat |
| `diperbarui_pada` | Waktu data terakhir diperbarui |

### 4.5 `pengumuman` - Pengumuman

Tabel ini menyimpan pengumuman sekolah.

| Kolom | Fungsi |
|---|---|
| `id` | Primary key pengumuman |
| `title` | Judul pengumuman |
| `date` | Tanggal pengumuman |
| `content` | Isi pengumuman |
| `category` | Kategori pengumuman |
| `image` | Gambar pengumuman |
| `dibuat_pada` | Waktu data dibuat |
| `diperbarui_pada` | Waktu data terakhir diperbarui |

### 4.6 `galeri` - Galeri

Tabel ini menyimpan dokumentasi foto atau gambar sekolah.

| Kolom | Fungsi |
|---|---|
| `id` | Primary key galeri |
| `title` | Judul galeri |
| `image` | Gambar galeri |
| `description` | Deskripsi gambar |
| `category` | Kategori galeri |
| `dibuat_pada` | Waktu data dibuat |
| `diperbarui_pada` | Waktu data terakhir diperbarui |

## 5. Entitas PPDB

### 5.1 `pendaftaran_ppdb` - Pendaftaran PPDB

Tabel ini menyimpan data calon siswa yang mendaftar melalui PPDB.

| Kolom | Fungsi |
|---|---|
| `id` | Primary key pendaftaran |
| `registration_type` | Jenis pendaftaran: `pendaftaran_baru` atau `siswa_pindahan` |
| `target_level` | Target jenjang: `tk`, `sd`, atau `smp` |
| `full_name` | Nama lengkap calon siswa |
| `national_siswa_id` | NISN calon siswa, jika ada |
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
| `siswa_photo_file` | Foto calon siswa |
| `transfer_letter_file` | Surat pindah untuk siswa pindahan |
| `notification_note` | Catatan notifikasi atau keputusan |
| `dibuat_pada` | Waktu data dibuat |
| `diperbarui_pada` | Waktu data terakhir diperbarui |

Catatan relasi:

- Tabel ini belum memiliki FK ke `siswa`.
- Jika pendaftaran diterima dan calon siswa menjadi siswa aktif, proses konversi dari `pendaftaran_ppdb` ke `siswa` dilakukan di level aplikasi.
- Jika ingin relasi lebih eksplisit, dapat ditambahkan kolom seperti `siswa_id` pada `pendaftaran_ppdb` setelah calon siswa diterima.

## 6. Detail Relasi Antar Tabel

### 6.1 `kelas` ke `siswa`

```text
kelas 1 ----< N siswa
```

- Foreign key: `siswa.kelas_id`
- Referensi: `kelas.id`
- Kardinalitas: satu kelas memiliki banyak siswa.
- Ketika kelas dihapus: `siswa.kelas_id` menjadi `NULL`.
- Ketika ID kelas berubah: ikut `CASCADE`.

Makna bisnis:

Siswa boleh belum memiliki kelas, misalnya saat baru dibuat atau sedang proses penempatan kelas.

### 6.2 `akun_pengguna` ke `profil_guru`

```text
akun_pengguna 1 ---- 1 profil_guru
```

- Foreign key: `profil_guru.akun_pengguna_id`
- Referensi: `akun_pengguna.id`
- Kardinalitas: satu akun guru memiliki satu profil guru.
- Constraint: `profil_guru.akun_pengguna_id` unik.
- Ketika akun dihapus: profil guru ikut terhapus.

Makna bisnis:

Akun dengan role guru dapat melengkapi profil guru portal hanya satu kali.

### 6.3 `akun_pengguna` sebagai approver `profil_guru`

```text
akun_pengguna 1 ----< N profil_guru
```

- Foreign key: `profil_guru.disetujui_oleh_akun_pengguna_id`
- Referensi: `akun_pengguna.id`
- Kardinalitas: satu user/admin dapat menyetujui banyak profil guru.
- Ketika approver dihapus: kolom approver menjadi `NULL`.

Makna bisnis:

Riwayat profil tetap tersimpan walaupun akun admin/verifikator dihapus.

### 6.4 `kelas` ke `profil_guru`

```text
kelas 1 ----< N profil_guru
```

- Foreign key: `profil_guru.kelas_id`
- Referensi: `kelas.id`
- Kardinalitas: satu kelas dapat terkait dengan banyak profil guru.
- Ketika kelas dihapus: `profil_guru.kelas_id` menjadi `NULL`.

Makna bisnis:

Relasi ini dipakai terutama untuk guru wali kelas atau guru yang terkait dengan kelas tertentu.

### 6.5 `akun_pengguna` ke `jadwal_mengajar`

```text
akun_pengguna 1 ----< N jadwal_mengajar
```

- Foreign key: `jadwal_mengajar.guru_akun_pengguna_id`
- Referensi: `akun_pengguna.id`
- Kardinalitas: satu guru dapat memiliki banyak jadwal mengajar.
- Ketika akun guru dihapus: jadwal mengajar ikut terhapus.

Makna bisnis:

Jadwal mengajar bergantung pada akun guru.

### 6.6 `kelas` ke `jadwal_mengajar`

```text
kelas 1 ----< N jadwal_mengajar
```

- Foreign key: `jadwal_mengajar.kelas_id`
- Referensi: `kelas.id`
- Kardinalitas: satu kelas dapat memiliki banyak jadwal mengajar.
- Ketika kelas dihapus: jadwal mengajar ikut terhapus.

Makna bisnis:

Jadwal tidak dapat berdiri tanpa kelas.

### 6.7 `siswa` ke `absensi_siswa`

```text
siswa 1 ----< N absensi_siswa
```

- Foreign key: `absensi_siswa.siswa_id`
- Referensi: `siswa.id`
- Kardinalitas: satu siswa memiliki banyak catatan absensi.
- Ketika siswa dihapus: absensi siswa ikut terhapus.

Makna bisnis:

Absensi adalah riwayat milik siswa tertentu.

### 6.8 `kelas` ke `absensi_siswa`

```text
kelas 1 ----< N absensi_siswa
```

- Foreign key: `absensi_siswa.kelas_id`
- Referensi: `kelas.id`
- Kardinalitas: satu kelas memiliki banyak catatan absensi.
- Ketika kelas dihapus: absensi kelas ikut terhapus.

Makna bisnis:

Absensi disimpan berdasarkan kelas saat absensi dibuat.

### 6.9 `akun_pengguna` ke `absensi_siswa`

```text
akun_pengguna 1 ----< N absensi_siswa
```

- Foreign key: `absensi_siswa.guru_akun_pengguna_id`
- Referensi: `akun_pengguna.id`
- Kardinalitas: satu guru dapat mencatat banyak absensi.
- Ketika akun guru dihapus: absensi yang dicatat guru ikut terhapus.

Makna bisnis:

Setiap catatan absensi memiliki informasi guru yang mencatat.

### 6.10 `jadwal_mengajar` ke `absensi_siswa`

```text
jadwal_mengajar 1 ----< N absensi_siswa
```

- Foreign key: `absensi_siswa.jadwal_mengajar_id`
- Referensi: `jadwal_mengajar.id`
- Kardinalitas: satu jadwal dapat digunakan pada banyak catatan absensi.
- Ketika jadwal dihapus: `absensi_siswa.jadwal_mengajar_id` menjadi `NULL`.

Makna bisnis:

Absensi tetap ada walaupun jadwal asalnya dihapus, karena jadwal hanya referensi tambahan.

### 6.11 `akun_pengguna` ke `tautan_akun_portal`

```text
akun_pengguna 1 ----< N tautan_akun_portal
```

- Foreign key: `tautan_akun_portal.akun_pengguna_id`
- Referensi: `akun_pengguna.id`
- Kardinalitas: satu akun dapat memiliki banyak link portal.
- Ketika akun dihapus: link portal ikut terhapus.

Makna bisnis:

Akun orang tua dapat dihubungkan ke satu atau beberapa siswa.

### 6.12 `siswa` ke `tautan_akun_portal`

```text
siswa 1 ----< N tautan_akun_portal
```

- Foreign key: `tautan_akun_portal.siswa_id`
- Referensi: `siswa.id`
- Kardinalitas: satu siswa dapat memiliki banyak link akun portal.
- Ketika siswa dihapus: link portal ikut terhapus.

Makna bisnis:

Satu siswa bisa memiliki akun siswa sendiri dan akun orang tua yang terhubung.

## 7. Alur Data Utama

### 7.1 Alur Akun Guru

1. Data akun dibuat di `akun_pengguna` dengan `role = 'guru'`.
2. Guru mengisi profil di `profil_guru`.
3. Profil guru diverifikasi oleh admin melalui `disetujui_oleh_akun_pengguna_id`.
4. Setelah disetujui, guru dapat memiliki jadwal di `jadwal_mengajar`.
5. Guru dapat mencatat absensi siswa di `absensi_siswa`.

### 7.2 Alur Data Siswa

1. Data siswa disimpan di `siswa`.
2. Siswa ditempatkan pada kelas melalui `siswa.kelas_id`.
3. Jika siswa/orang tua memiliki akun portal, relasi dibuat di `tautan_akun_portal`.
4. Kehadiran siswa dicatat di `absensi_siswa`.

### 7.3 Alur Jadwal dan Absensi

1. Administrator/guru membuat jadwal mengajar di `jadwal_mengajar`.
2. Jadwal mengajar menghubungkan guru, kelas, mata pelajaran, hari, dan jam.
3. Saat absensi dilakukan, sistem membuat data di `absensi_siswa`.
4. Absensi dapat terhubung ke jadwal melalui `jadwal_mengajar_id`.

### 7.4 Alur PPDB

1. Calon siswa mengisi formulir pendaftaran.
2. Data masuk ke `pendaftaran_ppdb`.
3. Administrator memproses status menjadi `pending`, `diterima`, atau `ditolak`.
4. Jika diterima, data calon siswa dapat dibuat menjadi data siswa di `siswa`.
5. Saat ini relasi PPDB ke siswa belum otomatis menggunakan FK.

### 7.5 Alur Konten Situs Web

1. Administrator mengelola profil sekolah di `profil_sekolah`.
2. Administrator mengelola data guru publik di `guru`.
3. Administrator mengelola kepala sekolah di `kepala_sekolah`.
4. Administrator mengelola kegiatan di `kegiatan`.
5. Administrator mengelola pengumuman di `pengumuman`.
6. Administrator mengelola galeri di `galeri`.

## 8. Tabel yang Berdiri Sendiri

Beberapa tabel belum memiliki foreign key langsung ke tabel lain.

| Tabel | Fungsi | Catatan |
|---|---|---|
| `guru` | Data guru untuk informasi sekolah | Belum terhubung ke akun guru |
| `kepala_sekolah` | Data kepala sekolah | Belum terhubung ke user/admin |
| `pendaftaran_ppdb` | Data pendaftaran PPDB | Belum terhubung ke `siswa` |
| `profil_sekolah` | Profil umum sekolah | Biasanya satu data aktif |
| `kegiatan` | Data kegiatan | Konten mandiri |
| `pengumuman` | Data pengumuman | Konten mandiri |
| `galeri` | Data galeri | Konten mandiri |

## 9. Ringkasan Kardinalitas

| Relasi | Kardinalitas | Penjelasan Singkat |
|---|---|---|
| `kelas` ke `siswa` | 1:N | Satu kelas punya banyak siswa |
| `akun_pengguna` ke `profil_guru` | 1:1 | Satu akun guru punya satu profil guru |
| `akun_pengguna` ke `profil_guru` sebagai approver | 1:N | Satu admin menyetujui banyak profil guru |
| `kelas` ke `profil_guru` | 1:N | Satu kelas bisa terkait banyak profil guru |
| `akun_pengguna` ke `jadwal_mengajar` | 1:N | Satu guru punya banyak jadwal |
| `kelas` ke `jadwal_mengajar` | 1:N | Satu kelas punya banyak jadwal |
| `siswa` ke `absensi_siswa` | 1:N | Satu siswa punya banyak absensi |
| `kelas` ke `absensi_siswa` | 1:N | Satu kelas punya banyak absensi |
| `akun_pengguna` ke `absensi_siswa` | 1:N | Satu guru mencatat banyak absensi |
| `jadwal_mengajar` ke `absensi_siswa` | 1:N | Satu jadwal punya banyak absensi |
| `akun_pengguna` ke `tautan_akun_portal` | 1:N | Satu akun punya banyak link portal |
| `siswa` ke `tautan_akun_portal` | 1:N | Satu siswa punya banyak akun portal terkait |

## 10. Catatan Integritas Data

### 10.1 Hapus Berantai

Beberapa relasi menggunakan `onDelete: CASCADE`. Artinya jika data induk dihapus, data anak ikut terhapus.

Contoh:

- Jika `siswa` dihapus, maka `absensi_siswa` siswa tersebut ikut terhapus.
- Jika `akun_pengguna` guru dihapus, maka `jadwal_mengajar` guru tersebut ikut terhapus.
- Jika `akun_pengguna` dihapus, maka `tautan_akun_portal` ikut terhapus.

### 10.2 Set Null

Beberapa relasi menggunakan `onDelete: SET NULL`. Artinya jika data induk dihapus, foreign key pada data anak diubah menjadi `NULL`.

Contoh:

- Jika `kelas` dihapus, `siswa.kelas_id` menjadi `NULL`.
- Jika `jadwal_mengajar` dihapus, `absensi_siswa.jadwal_mengajar_id` menjadi `NULL`.
- Jika approver dihapus, `profil_guru.disetujui_oleh_akun_pengguna_id` menjadi `NULL`.

### 10.3 Unique Key

Beberapa kolom dibuat unik agar tidak terjadi duplikasi data penting.

| Tabel | Kolom Unique | Fungsi |
|---|---|---|
| `akun_pengguna` | `email` | Satu email hanya untuk satu akun |
| `siswa` | `national_siswa_id` | Satu NISN hanya untuk satu siswa |
| `profil_guru` | `akun_pengguna_id` | Satu akun hanya punya satu profil guru |
| `guru` | `employee_number` | Satu NIP hanya untuk satu guru |
| `kepala_sekolah` | `employee_number` | Satu NIP hanya untuk satu kepala sekolah |

## 11. Catatan Perbaikan Desain Database

Bagian ini bukan error, tetapi rekomendasi jika database ingin dibuat lebih konsisten dan production-ready.

### 11.1 Hubungkan `guru` dengan `akun_pengguna`

Saat ini tabel `guru` dan `profil_guru` terpisah. Jika data guru publik dan akun guru ingin disatukan, bisa tambahkan salah satu:

- `guru.akun_pengguna_id`
- atau `profil_guru.guru_id`

Manfaat:

- Menghindari data guru ganda.
- Mempermudah sinkronisasi profil guru dan akun login.

### 11.2 Hubungkan `pendaftaran_ppdb` dengan `siswa`

Saat calon siswa diterima, data PPDB dapat dikonversi menjadi siswa. Agar riwayat tetap jelas, bisa ditambahkan:

```text
pendaftaran_ppdb.siswa_id -> siswa.id
```

Manfaat:

- Riwayat asal siswa dari PPDB jelas.
- Administrator bisa melacak pendaftaran mana yang menghasilkan data siswa.

### 11.3 Batasi `profil_sekolah` Menjadi Satu Data Aktif

Jika sistem hanya membutuhkan satu profil sekolah aktif, dapat ditambahkan mekanisme:

- Kolom `is_active`
- Validasi aplikasi agar hanya satu data aktif
- Atau konfigurasi singleton di level service

### 11.4 Tambahkan Constraint pada `tautan_akun_portal`

Untuk menghindari link duplikat, bisa ditambahkan unique composite:

```text
UNIQUE(akun_pengguna_id, siswa_id, link_type)
```

Manfaat:

- Akun yang sama tidak terhubung berkali-kali ke siswa yang sama dengan tipe link yang sama.

## 12. Kesimpulan

ERD Portal CNB terdiri dari 14 tabel utama. Pusat relasi sistem berada pada tabel `akun_pengguna`, `kelas`, dan `siswa`.

- `akun_pengguna` menjadi pusat akun login, guru, approver, absensi, dan portal siswa/orang tua.
- `kelas` menjadi pusat data akademik kelas, siswa, jadwal, dan absensi.
- `siswa` menjadi pusat data siswa, absensi, dan akun portal terkait.
- Tabel konten seperti `kegiatan`, `pengumuman`, dan `galeri` berdiri sendiri untuk kebutuhan website sekolah.
- Tabel `pendaftaran_ppdb` menyimpan proses PPDB, tetapi belum memiliki relasi langsung ke tabel `siswa`.

Dengan struktur ini, sistem sudah dapat mendukung fitur utama portal sekolah: manajemen akun, data siswa, kelas, jadwal mengajar, absensi, PPDB, dan konten website sekolah.
