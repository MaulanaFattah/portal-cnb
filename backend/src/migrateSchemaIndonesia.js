require("dotenv").config();

const { DataTypes } = require("sequelize");
const sequelize = require("./config/database");
const { ensureUploadFolders } = require("./utils/uploadStorage");

const queryInterface = sequelize.getQueryInterface();

const tableRenamePlan = [
  ["user_account", "akun_pengguna"],
  ["users", "akun_pengguna"],
  ["activity", "kegiatan"],
  ["kegiatans", "kegiatan"],
  ["announcement", "pengumuman"],
  ["pengumumans", "pengumuman"],
  ["gallery", "galeri"],
  ["galeris", "galeri"],
  ["admission_application", "pendaftaran_ppdb"],
  ["ppdbs", "pendaftaran_ppdb"],
  ["teacher", "guru"],
  ["gurus", "guru"],
  ["principal", "kepala_sekolah"],
  ["kepala_sekolahs", "kepala_sekolah"],
  ["classroom", "kelas"],
  ["student", "siswa"],
  ["siswas", "siswa"],
  ["school_profile", "profil_sekolah"],
  ["profil_sekolahs", "profil_sekolah"],
  ["teacher_profile", "profil_guru"],
  ["guru_profiles", "profil_guru"],
  ["teaching_schedule", "jadwal_mengajar"],
  ["jadwal_mengajars", "jadwal_mengajar"],
  ["student_attendance", "absensi_siswa"],
  ["absensi_siswas", "absensi_siswa"],
  ["portal_account_link", "tautan_akun_portal"],
  ["portal_account_links", "tautan_akun_portal"],
  ["audit_log", "log_audit"]
];

const timestampColumnMap = {
  createdAt: "dibuat_pada",
  created_at: "dibuat_pada",
  updatedAt: "diperbarui_pada",
  updated_at: "diperbarui_pada"
};

const columnRenamePlan = {
  akun_pengguna: {
    name: "nama",
    password: "kata_sandi",
    role: "peran",
    profession: "profesi",
    must_change_password: "wajib_ganti_kata_sandi",
    ...timestampColumnMap
  },
  kegiatan: {
    title: "judul",
    date: "tanggal",
    description: "deskripsi",
    image: "gambar",
    ...timestampColumnMap
  },
  pengumuman: {
    title: "judul",
    date: "tanggal",
    content: "isi",
    category: "kategori",
    image: "gambar",
    ...timestampColumnMap
  },
  galeri: {
    title: "judul",
    image: "gambar",
    description: "deskripsi",
    category: "kategori",
    ...timestampColumnMap
  },
  pendaftaran_ppdb: {
    registration_type: "jenis_pendaftaran",
    target_level: "target_jenjang",
    full_name: "nama_lengkap",
    national_student_id: "nisn",
    birthplace: "tempat_lahir",
    birth_date: "tanggal_lahir",
    gender: "jenis_kelamin",
    religion: "agama",
    address: "alamat",
    parent_name: "nama_orang_tua",
    father_name: "nama_ayah",
    mother_name: "nama_ibu",
    father_occupation: "pekerjaan_ayah",
    mother_occupation: "pekerjaan_ibu",
    phone_number: "no_telepon",
    previous_school: "asal_sekolah",
    academic_year: "tahun_ajaran",
    family_card_file: "berkas_kk",
    report_file: "berkas_raport",
    student_photo_file: "foto_siswa",
    transfer_letter_file: "berkas_surat_pindah",
    notification_note: "catatan_notifikasi",
    ...timestampColumnMap
  },
  guru: {
    employee_number: "nip",
    name: "nama",
    phone_number: "no_telepon",
    subject: "mata_pelajaran",
    last_education: "pendidikan_terakhir",
    photo: "foto",
    address: "alamat",
    birth_date: "tanggal_lahir",
    gender: "jenis_kelamin",
    ...timestampColumnMap
  },
  kepala_sekolah: {
    employee_number: "nip",
    name: "nama",
    phone_number: "no_telepon",
    photo: "foto",
    start_period: "periode_mulai",
    end_period: "periode_akhir",
    address: "alamat",
    last_education: "pendidikan_terakhir",
    ...timestampColumnMap
  },
  kelas: {
    class_name: "nama_kelas",
    grade_level: "tingkat",
    homeroom_teacher: "wali_kelas",
    academic_year: "tahun_ajaran",
    student_count: "jumlah_siswa",
    room: "ruangan",
    ...timestampColumnMap
  },
  siswa: {
    national_student_id: "nisn",
    name: "nama",
    classroom_id: "kelas_id",
    birthplace: "tempat_lahir",
    birth_date: "tanggal_lahir",
    gender: "jenis_kelamin",
    religion: "agama",
    address: "alamat",
    father_name: "nama_ayah",
    mother_name: "nama_ibu",
    phone_number: "no_telepon",
    photo: "foto",
    ...timestampColumnMap
  },
  profil_sekolah: {
    school_name: "nama_sekolah",
    phone_number: "telepon",
    address: "alamat",
    vision: "visi",
    mission: "misi",
    history: "sejarah",
    facility: "fasilitas",
    school_structure: "struktur_sekolah",
    accreditation: "akreditasi",
    ...timestampColumnMap
  },
  profil_guru: {
    user_id: "akun_pengguna_id",
    user_account_id: "akun_pengguna_id",
    teacher_type: "tipe_guru",
    subject: "mata_pelajaran",
    is_homeroom: "wali_kelas",
    classroom_id: "kelas_id",
    verification_status: "status_verifikasi",
    notes: "catatan",
    note: "catatan",
    approved_by: "disetujui_oleh_akun_pengguna_id",
    approved_by_user_account_id: "disetujui_oleh_akun_pengguna_id",
    approved_at: "disetujui_pada",
    ...timestampColumnMap
  },
  jadwal_mengajar: {
    guru_user_id: "guru_akun_pengguna_id",
    teacher_user_account_id: "guru_akun_pengguna_id",
    classroom_id: "kelas_id",
    mapel: "mata_pelajaran",
    subject: "mata_pelajaran",
    day_name: "hari",
    start_time: "jam_mulai",
    end_time: "jam_selesai",
    ...timestampColumnMap
  },
  absensi_siswa: {
    student_id: "siswa_id",
    classroom_id: "kelas_id",
    guru_user_id: "guru_akun_pengguna_id",
    teacher_user_account_id: "guru_akun_pengguna_id",
    jadwal_id: "jadwal_mengajar_id",
    teaching_schedule_id: "jadwal_mengajar_id",
    attendance_date: "tanggal",
    day_name: "hari",
    teacher_type: "tipe_guru",
    mapel: "mata_pelajaran",
    subject: "mata_pelajaran",
    note: "keterangan",
    ...timestampColumnMap
  },
  tautan_akun_portal: {
    user_id: "akun_pengguna_id",
    user_account_id: "akun_pengguna_id",
    student_id: "siswa_id",
    link_type: "jenis_tautan",
    ...timestampColumnMap
  },
  log_audit: {
    actor_user_account_id: "pelaku_akun_pengguna_id",
    action: "aksi",
    entity_type: "jenis_entitas",
    entity_id: "entitas_id",
    ip_address: "alamat_ip",
    user_agent: "agen_pengguna",
    createdAt: "dibuat_pada",
    created_at: "dibuat_pada"
  }
};

const finalTables = [...new Set(tableRenamePlan.map(([, finalName]) => finalName))];
const allKnownTables = [...new Set(tableRenamePlan.flat())];

const orphanCheckPlan = [
  {
    label: "siswa.kelas_id",
    table: "siswa",
    sql: "SELECT COUNT(*) AS count FROM siswa s LEFT JOIN kelas k ON s.kelas_id = k.id WHERE s.kelas_id IS NOT NULL AND k.id IS NULL"
  },
  {
    label: "profil_guru.akun_pengguna_id",
    table: "profil_guru",
    sql: "SELECT COUNT(*) AS count FROM profil_guru pg LEFT JOIN akun_pengguna ap ON pg.akun_pengguna_id = ap.id WHERE ap.id IS NULL"
  },
  {
    label: "profil_guru.kelas_id",
    table: "profil_guru",
    sql: "SELECT COUNT(*) AS count FROM profil_guru pg LEFT JOIN kelas k ON pg.kelas_id = k.id WHERE pg.kelas_id IS NOT NULL AND k.id IS NULL"
  },
  {
    label: "profil_guru.disetujui_oleh_akun_pengguna_id",
    table: "profil_guru",
    sql: "SELECT COUNT(*) AS count FROM profil_guru pg LEFT JOIN akun_pengguna ap ON pg.disetujui_oleh_akun_pengguna_id = ap.id WHERE pg.disetujui_oleh_akun_pengguna_id IS NOT NULL AND ap.id IS NULL"
  },
  {
    label: "jadwal_mengajar.guru_akun_pengguna_id",
    table: "jadwal_mengajar",
    sql: "SELECT COUNT(*) AS count FROM jadwal_mengajar jm LEFT JOIN akun_pengguna ap ON jm.guru_akun_pengguna_id = ap.id WHERE ap.id IS NULL"
  },
  {
    label: "jadwal_mengajar.kelas_id",
    table: "jadwal_mengajar",
    sql: "SELECT COUNT(*) AS count FROM jadwal_mengajar jm LEFT JOIN kelas k ON jm.kelas_id = k.id WHERE k.id IS NULL"
  },
  {
    label: "absensi_siswa.siswa_id",
    table: "absensi_siswa",
    sql: "SELECT COUNT(*) AS count FROM absensi_siswa a LEFT JOIN siswa s ON a.siswa_id = s.id WHERE s.id IS NULL"
  },
  {
    label: "absensi_siswa.kelas_id",
    table: "absensi_siswa",
    sql: "SELECT COUNT(*) AS count FROM absensi_siswa a LEFT JOIN kelas k ON a.kelas_id = k.id WHERE k.id IS NULL"
  },
  {
    label: "absensi_siswa.guru_akun_pengguna_id",
    table: "absensi_siswa",
    sql: "SELECT COUNT(*) AS count FROM absensi_siswa a LEFT JOIN akun_pengguna ap ON a.guru_akun_pengguna_id = ap.id WHERE ap.id IS NULL"
  },
  {
    label: "absensi_siswa.jadwal_mengajar_id",
    table: "absensi_siswa",
    sql: "SELECT COUNT(*) AS count FROM absensi_siswa a LEFT JOIN jadwal_mengajar jm ON a.jadwal_mengajar_id = jm.id WHERE a.jadwal_mengajar_id IS NOT NULL AND jm.id IS NULL"
  },
  {
    label: "tautan_akun_portal.akun_pengguna_id",
    table: "tautan_akun_portal",
    sql: "SELECT COUNT(*) AS count FROM tautan_akun_portal t LEFT JOIN akun_pengguna ap ON t.akun_pengguna_id = ap.id WHERE ap.id IS NULL"
  },
  {
    label: "tautan_akun_portal.siswa_id",
    table: "tautan_akun_portal",
    sql: "SELECT COUNT(*) AS count FROM tautan_akun_portal t LEFT JOIN siswa s ON t.siswa_id = s.id WHERE s.id IS NULL"
  },
  {
    label: "log_audit.pelaku_akun_pengguna_id",
    table: "log_audit",
    sql: "SELECT COUNT(*) AS count FROM log_audit l LEFT JOIN akun_pengguna ap ON l.pelaku_akun_pengguna_id = ap.id WHERE l.pelaku_akun_pengguna_id IS NOT NULL AND ap.id IS NULL"
  }
];

const foreignKeyPlan = [
  { name: "fk_siswa_kelas", table: "siswa", column: "kelas_id", references: { table: "kelas", column: "id" }, onDelete: "SET NULL" },
  { name: "fk_profil_guru_akun_pengguna", table: "profil_guru", column: "akun_pengguna_id", references: { table: "akun_pengguna", column: "id" }, onDelete: "CASCADE" },
  { name: "fk_profil_guru_kelas", table: "profil_guru", column: "kelas_id", references: { table: "kelas", column: "id" }, onDelete: "SET NULL" },
  { name: "fk_profil_guru_penyetuju", table: "profil_guru", column: "disetujui_oleh_akun_pengguna_id", references: { table: "akun_pengguna", column: "id" }, onDelete: "SET NULL" },
  { name: "fk_jadwal_mengajar_guru", table: "jadwal_mengajar", column: "guru_akun_pengguna_id", references: { table: "akun_pengguna", column: "id" }, onDelete: "CASCADE" },
  { name: "fk_jadwal_mengajar_kelas", table: "jadwal_mengajar", column: "kelas_id", references: { table: "kelas", column: "id" }, onDelete: "CASCADE" },
  { name: "fk_absensi_siswa_siswa", table: "absensi_siswa", column: "siswa_id", references: { table: "siswa", column: "id" }, onDelete: "CASCADE" },
  { name: "fk_absensi_siswa_kelas", table: "absensi_siswa", column: "kelas_id", references: { table: "kelas", column: "id" }, onDelete: "CASCADE" },
  { name: "fk_absensi_siswa_guru", table: "absensi_siswa", column: "guru_akun_pengguna_id", references: { table: "akun_pengguna", column: "id" }, onDelete: "CASCADE" },
  { name: "fk_absensi_siswa_jadwal", table: "absensi_siswa", column: "jadwal_mengajar_id", references: { table: "jadwal_mengajar", column: "id" }, onDelete: "SET NULL" },
  { name: "fk_tautan_akun_portal_akun", table: "tautan_akun_portal", column: "akun_pengguna_id", references: { table: "akun_pengguna", column: "id" }, onDelete: "CASCADE" },
  { name: "fk_tautan_akun_portal_siswa", table: "tautan_akun_portal", column: "siswa_id", references: { table: "siswa", column: "id" }, onDelete: "CASCADE" },
  { name: "fk_log_audit_pelaku", table: "log_audit", column: "pelaku_akun_pengguna_id", references: { table: "akun_pengguna", column: "id" }, onDelete: "SET NULL" }
];

function quoteIdentifier(identifier) {
  return `\`${String(identifier).replace(/`/g, "``")}\``;
}

async function tableExists(tableName) {
  const [rows] = await sequelize.query(
    "SELECT COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
    { replacements: [tableName] }
  );
  return Number(rows[0].count) > 0;
}

async function columnExists(tableName, columnName) {
  const [rows] = await sequelize.query(
    "SELECT COUNT(*) AS count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    { replacements: [tableName, columnName] }
  );
  return Number(rows[0].count) > 0;
}

async function rowCount(tableName) {
  const [rows] = await sequelize.query(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(tableName)}`);
  return Number(rows[0].count);
}

async function columnSet(tableName) {
  const [rows] = await sequelize.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
    { replacements: [tableName] }
  );
  return new Set(rows.map((row) => row.COLUMN_NAME));
}

async function listForeignKeyNames(tableName) {
  const [rows] = await sequelize.query(
    `SELECT CONSTRAINT_NAME
     FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    { replacements: [tableName] }
  );
  return rows.map((row) => row.CONSTRAINT_NAME);
}

async function indexExistsForColumn(tableName, columnName) {
  const [rows] = await sequelize.query(
    "SELECT COUNT(*) AS count FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    { replacements: [tableName, columnName] }
  );
  return Number(rows[0].count) > 0;
}

async function foreignKeyExists(item) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
       AND REFERENCED_TABLE_NAME = ?
       AND REFERENCED_COLUMN_NAME = ?`,
    { replacements: [item.table, item.column, item.references.table, item.references.column] }
  );
  return Number(rows[0].count) > 0;
}

async function dropForeignKeysForKnownTables() {
  for (const tableName of allKnownTables) {
    if (!(await tableExists(tableName))) continue;
    const constraintNames = await listForeignKeyNames(tableName);
    for (const constraintName of constraintNames) {
      console.log(`Menghapus foreign key lama ${tableName}.${constraintName}`);
      await queryInterface.removeConstraint(tableName, constraintName);
    }
  }
}

async function renameTables() {
  for (const [oldName, newName] of tableRenamePlan) {
    const oldExists = await tableExists(oldName);
    const newExists = await tableExists(newName);

    if (oldName === newName || !oldExists) {
      if (newExists) console.log(`Tabel ${newName} sudah ada`);
      continue;
    }

    if (newExists) {
      const oldCount = await rowCount(oldName);
      const newCount = await rowCount(newName);

      if (oldCount === 0) {
        console.log(`Menghapus tabel lama kosong ${oldName}`);
        await queryInterface.dropTable(oldName);
        continue;
      }

      if (newCount === 0) {
        console.log(`Menghapus tabel duplikat kosong ${newName}`);
        await queryInterface.dropTable(newName);
      } else {
        throw new Error(`Tabel ${oldName} dan ${newName} sama-sama berisi data. Gabungkan data secara manual sebelum migrasi.`);
      }
    }

    console.log(`Mengubah nama tabel ${oldName} -> ${newName}`);
    await queryInterface.renameTable(oldName, newName);
  }
}

async function renameColumns() {
  for (const [tableName, columnMap] of Object.entries(columnRenamePlan)) {
    if (!(await tableExists(tableName))) continue;

    for (const [oldName, newName] of Object.entries(columnMap)) {
      const columns = await columnSet(tableName);
      const hasOldColumn = columns.has(oldName);
      const hasNewColumn = columns.has(newName);

      if (hasOldColumn && hasNewColumn) {
        throw new Error(`Kolom ${tableName}.${oldName} dan ${tableName}.${newName} sama-sama ada. Gabungkan data secara manual sebelum migrasi.`);
      }

      if (hasOldColumn) {
        console.log(`Mengubah nama kolom ${tableName}.${oldName} -> ${newName}`);
        await queryInterface.renameColumn(tableName, oldName, newName);
      }
    }
  }
}

async function addColumnIfMissing(tableName, columnName, definition) {
  if (!(await tableExists(tableName)) || await columnExists(tableName, columnName)) return;
  console.log(`Menambahkan kolom ${tableName}.${columnName}`);
  await queryInterface.addColumn(tableName, columnName, definition);
}

async function changeColumnIfExists(tableName, columnName, definition) {
  if (!(await tableExists(tableName)) || !(await columnExists(tableName, columnName))) return;
  console.log(`Menyesuaikan kolom ${tableName}.${columnName}`);
  await queryInterface.changeColumn(tableName, columnName, definition);
}

async function ensureTimestampColumns() {
  for (const tableName of finalTables) {
    if (!(await tableExists(tableName))) continue;
    await addColumnIfMissing(tableName, "dibuat_pada", {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP")
    });

    if (tableName !== "log_audit") {
      await addColumnIfMissing(tableName, "diperbarui_pada", {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal("CURRENT_TIMESTAMP")
      });
    }
  }
}

async function createAuditLogIfMissing() {
  if (await tableExists("log_audit")) return;

  console.log("Membuat tabel log_audit");
  await queryInterface.createTable("log_audit", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    pelaku_akun_pengguna_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "akun_pengguna", key: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE"
    },
    aksi: { type: DataTypes.STRING, allowNull: false },
    jenis_entitas: { type: DataTypes.STRING, allowNull: false },
    entitas_id: { type: DataTypes.STRING, allowNull: true },
    metadata: { type: DataTypes.TEXT, allowNull: true },
    alamat_ip: { type: DataTypes.STRING, allowNull: true },
    agen_pengguna: { type: DataTypes.TEXT, allowNull: true },
    dibuat_pada: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP")
    }
  });
}

async function ensureRequiredColumns() {
  if (await tableExists("akun_pengguna")) {
    await addColumnIfMissing("akun_pengguna", "wajib_ganti_kata_sandi", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await sequelize.query("ALTER TABLE `akun_pengguna` MODIFY `peran` ENUM('admin','guru','siswa','orangtua','kepala_sekolah') NOT NULL DEFAULT 'siswa'");
  }

  if (await tableExists("kegiatan")) {
    await addColumnIfMissing("kegiatan", "status", {
      type: DataTypes.ENUM("tampil", "tidak_tampil"),
      allowNull: false,
      defaultValue: "tampil"
    });
    await changeColumnIfExists("kegiatan", "gambar", { type: DataTypes.TEXT("long"), allowNull: true });
  }

  if (await tableExists("absensi_siswa")) {
    await sequelize.query("ALTER TABLE `absensi_siswa` MODIFY `status` ENUM('hadir','izin','sakit','alpha') NOT NULL");
  }

  if (await tableExists("profil_guru")) {
    await addColumnIfMissing("profil_guru", "wali_kelas", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await sequelize.query("UPDATE `profil_guru` SET `wali_kelas` = 1 WHERE `tipe_guru` = 'wali_kelas'");
    await sequelize.query("UPDATE `profil_guru` SET `wali_kelas` = 0 WHERE `wali_kelas` IS NULL");
  }

  if (await tableExists("pendaftaran_ppdb")) {
    await addColumnIfMissing("pendaftaran_ppdb", "jenis_pendaftaran", {
      type: DataTypes.ENUM("pendaftaran_baru", "siswa_pindahan"),
      allowNull: false,
      defaultValue: "pendaftaran_baru"
    });
    await addColumnIfMissing("pendaftaran_ppdb", "target_jenjang", {
      type: DataTypes.ENUM("tk", "sd", "smp"),
      allowNull: false,
      defaultValue: "tk"
    });
    await addColumnIfMissing("pendaftaran_ppdb", "nama_orang_tua", { type: DataTypes.STRING, allowNull: true });
    await addColumnIfMissing("pendaftaran_ppdb", "berkas_kk", { type: DataTypes.TEXT("long"), allowNull: true });
    await addColumnIfMissing("pendaftaran_ppdb", "berkas_raport", { type: DataTypes.TEXT("long"), allowNull: true });
    await addColumnIfMissing("pendaftaran_ppdb", "foto_siswa", { type: DataTypes.TEXT("long"), allowNull: true });
    await addColumnIfMissing("pendaftaran_ppdb", "berkas_surat_pindah", { type: DataTypes.TEXT("long"), allowNull: true });
    await addColumnIfMissing("pendaftaran_ppdb", "catatan_notifikasi", { type: DataTypes.TEXT, allowNull: true });
    await sequelize.query("UPDATE `pendaftaran_ppdb` SET `nama_orang_tua` = COALESCE(`nama_orang_tua`, `nama_ayah`, `nama_ibu`, 'Orang Tua/Wali') WHERE `nama_orang_tua` IS NULL");
    await sequelize.query("UPDATE `pendaftaran_ppdb` SET `email` = CONCAT('orangtua-', id, '@example.local') WHERE `email` IS NULL OR `email` = ''");
    await changeColumnIfExists("pendaftaran_ppdb", "nama_orang_tua", { type: DataTypes.STRING, allowNull: false });
    await changeColumnIfExists("pendaftaran_ppdb", "tempat_lahir", { type: DataTypes.STRING, allowNull: true });
    await changeColumnIfExists("pendaftaran_ppdb", "agama", { type: DataTypes.STRING, allowNull: true });
    await changeColumnIfExists("pendaftaran_ppdb", "nama_ayah", { type: DataTypes.STRING, allowNull: true });
    await changeColumnIfExists("pendaftaran_ppdb", "nama_ibu", { type: DataTypes.STRING, allowNull: true });
    await changeColumnIfExists("pendaftaran_ppdb", "email", { type: DataTypes.STRING, allowNull: false });
  }

  await addColumnIfMissing("profil_sekolah", "fasilitas", { type: DataTypes.TEXT, allowNull: true });
  await addColumnIfMissing("profil_sekolah", "struktur_sekolah", { type: DataTypes.TEXT, allowNull: true });
  await changeColumnIfExists("galeri", "gambar", { type: DataTypes.TEXT("long"), allowNull: false });

  await createAuditLogIfMissing();
  await ensureTimestampColumns();
}

async function assertNoOrphans() {
  for (const check of orphanCheckPlan) {
    if (!(await tableExists(check.table))) continue;

    const [rows] = await sequelize.query(check.sql);
    const count = Number(rows[0].count);
    if (count > 0) {
      throw new Error(`Tidak dapat menambahkan foreign key untuk ${check.label}: ada ${count} baris yatim.`);
    }
  }
}

async function ensureForeignKeys() {
  for (const item of foreignKeyPlan) {
    if (!(await tableExists(item.table)) || !(await tableExists(item.references.table))) continue;
    if (!(await columnExists(item.table, item.column))) continue;

    if (await foreignKeyExists(item)) {
      console.log(`Foreign key sudah ada untuk ${item.table}.${item.column}`);
      continue;
    }

    if (!(await indexExistsForColumn(item.table, item.column))) {
      const indexName = `idx_${item.table}_${item.column}`;
      console.log(`Menambahkan indeks ${indexName}`);
      await queryInterface.addIndex(item.table, [item.column], { name: indexName });
    }

    console.log(`Menambahkan foreign key ${item.name}`);
    await queryInterface.addConstraint(item.table, {
      fields: [item.column],
      type: "foreign key",
      name: item.name,
      references: {
        table: item.references.table,
        field: item.references.column
      },
      onDelete: item.onDelete,
      onUpdate: "CASCADE"
    });
  }
}

async function forceInnoDb() {
  for (const tableName of finalTables) {
    if (await tableExists(tableName)) {
      await sequelize.query(`ALTER TABLE ${quoteIdentifier(tableName)} ENGINE=InnoDB`);
    }
  }
}

async function migrate() {
  ensureUploadFolders();
  await sequelize.authenticate();
  console.log(`Terhubung ke database ${sequelize.config.database}`);

  await dropForeignKeysForKnownTables();
  await renameTables();
  await renameColumns();
  await ensureRequiredColumns();
  await forceInnoDb();
  await assertNoOrphans();
  await ensureForeignKeys();

  console.log("Migrasi skema Bahasa Indonesia selesai");
}

migrate()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
