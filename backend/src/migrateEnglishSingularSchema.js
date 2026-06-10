require("dotenv").config();

const sequelize = require("./config/database");

const queryInterface = sequelize.getQueryInterface();

const tableRenamePlan = [
  ["users", "user_account"],
  ["kegiatans", "activity"],
  ["pengumumans", "announcement"],
  ["galeris", "gallery"],
  ["ppdbs", "admission_application"],
  ["gurus", "teacher"],
  ["kepala_sekolahs", "principal"],
  ["kelas", "classroom"],
  ["siswas", "student"],
  ["profil_sekolahs", "school_profile"],
  ["guru_profiles", "teacher_profile"],
  ["jadwal_mengajars", "teaching_schedule"],
  ["absensi_siswas", "student_attendance"],
  ["portal_account_links", "portal_account_link"]
];

const timestampColumnMap = {
  createdAt: "created_at",
  updatedAt: "updated_at"
};

const columnRenamePlan = {
  user_account: timestampColumnMap,
  activity: timestampColumnMap,
  announcement: timestampColumnMap,
  gallery: timestampColumnMap,
  admission_application: {
    nama_lengkap: "full_name",
    nisn: "national_student_id",
    tempat_lahir: "birthplace",
    tanggal_lahir: "birth_date",
    jenis_kelamin: "gender",
    agama: "religion",
    alamat: "address",
    nama_ayah: "father_name",
    nama_ibu: "mother_name",
    pekerjaan_ayah: "father_occupation",
    pekerjaan_ibu: "mother_occupation",
    no_telepon: "phone_number",
    asal_sekolah: "previous_school",
    tahun_ajaran: "academic_year",
    ...timestampColumnMap
  },
  teacher: {
    nip: "employee_number",
    nama: "name",
    no_telepon: "phone_number",
    mata_pelajaran: "subject",
    pendidikan_terakhir: "last_education",
    foto: "photo",
    alamat: "address",
    tanggal_lahir: "birth_date",
    jenis_kelamin: "gender",
    ...timestampColumnMap
  },
  principal: {
    nip: "employee_number",
    nama: "name",
    no_telepon: "phone_number",
    foto: "photo",
    periode_mulai: "start_period",
    periode_akhir: "end_period",
    alamat: "address",
    pendidikan_terakhir: "last_education",
    ...timestampColumnMap
  },
  classroom: {
    nama_kelas: "class_name",
    tingkat: "grade_level",
    wali_kelas: "homeroom_teacher",
    tahun_ajaran: "academic_year",
    jumlah_siswa: "student_count",
    ruangan: "room",
    ...timestampColumnMap
  },
  student: {
    nisn: "national_student_id",
    nama: "name",
    kelas_id: "classroom_id",
    tempat_lahir: "birthplace",
    tanggal_lahir: "birth_date",
    jenis_kelamin: "gender",
    agama: "religion",
    alamat: "address",
    nama_ayah: "father_name",
    nama_ibu: "mother_name",
    no_telepon: "phone_number",
    foto: "photo",
    ...timestampColumnMap
  },
  school_profile: {
    nama_sekolah: "school_name",
    alamat: "address",
    telepon: "phone_number",
    visi: "vision",
    misi: "mission",
    sejarah: "history",
    akreditasi: "accreditation",
    ...timestampColumnMap
  },
  teacher_profile: {
    user_id: "user_account_id",
    kelas_id: "classroom_id",
    notes: "note",
    approved_by: "approved_by_user_account_id",
    ...timestampColumnMap
  },
  teaching_schedule: {
    guru_user_id: "teacher_user_account_id",
    kelas_id: "classroom_id",
    mapel: "subject",
    hari: "day_name",
    jam_mulai: "start_time",
    jam_selesai: "end_time",
    ...timestampColumnMap
  },
  student_attendance: {
    siswa_id: "student_id",
    kelas_id: "classroom_id",
    guru_user_id: "teacher_user_account_id",
    jadwal_id: "teaching_schedule_id",
    tanggal: "attendance_date",
    hari: "day_name",
    tipe_guru: "teacher_type",
    mapel: "subject",
    keterangan: "note",
    ...timestampColumnMap
  },
  portal_account_link: {
    user_id: "user_account_id",
    siswa_id: "student_id",
    ...timestampColumnMap
  }
};

const orphanCheckPlan = [
  {
    label: "student.classroom_id",
    sql: "SELECT COUNT(*) AS count FROM student s LEFT JOIN classroom c ON s.classroom_id = c.id WHERE s.classroom_id IS NOT NULL AND c.id IS NULL"
  },
  {
    label: "teacher_profile.user_account_id",
    sql: "SELECT COUNT(*) AS count FROM teacher_profile tp LEFT JOIN user_account ua ON tp.user_account_id = ua.id WHERE ua.id IS NULL"
  },
  {
    label: "teacher_profile.classroom_id",
    sql: "SELECT COUNT(*) AS count FROM teacher_profile tp LEFT JOIN classroom c ON tp.classroom_id = c.id WHERE tp.classroom_id IS NOT NULL AND c.id IS NULL"
  },
  {
    label: "teacher_profile.approved_by_user_account_id",
    sql: "SELECT COUNT(*) AS count FROM teacher_profile tp LEFT JOIN user_account ua ON tp.approved_by_user_account_id = ua.id WHERE tp.approved_by_user_account_id IS NOT NULL AND ua.id IS NULL"
  },
  {
    label: "teaching_schedule.teacher_user_account_id",
    sql: "SELECT COUNT(*) AS count FROM teaching_schedule ts LEFT JOIN user_account ua ON ts.teacher_user_account_id = ua.id WHERE ua.id IS NULL"
  },
  {
    label: "teaching_schedule.classroom_id",
    sql: "SELECT COUNT(*) AS count FROM teaching_schedule ts LEFT JOIN classroom c ON ts.classroom_id = c.id WHERE c.id IS NULL"
  },
  {
    label: "student_attendance.student_id",
    sql: "SELECT COUNT(*) AS count FROM student_attendance sa LEFT JOIN student s ON sa.student_id = s.id WHERE s.id IS NULL"
  },
  {
    label: "student_attendance.classroom_id",
    sql: "SELECT COUNT(*) AS count FROM student_attendance sa LEFT JOIN classroom c ON sa.classroom_id = c.id WHERE c.id IS NULL"
  },
  {
    label: "student_attendance.teacher_user_account_id",
    sql: "SELECT COUNT(*) AS count FROM student_attendance sa LEFT JOIN user_account ua ON sa.teacher_user_account_id = ua.id WHERE ua.id IS NULL"
  },
  {
    label: "student_attendance.teaching_schedule_id",
    sql: "SELECT COUNT(*) AS count FROM student_attendance sa LEFT JOIN teaching_schedule ts ON sa.teaching_schedule_id = ts.id WHERE sa.teaching_schedule_id IS NOT NULL AND ts.id IS NULL"
  },
  {
    label: "portal_account_link.user_account_id",
    sql: "SELECT COUNT(*) AS count FROM portal_account_link pal LEFT JOIN user_account ua ON pal.user_account_id = ua.id WHERE ua.id IS NULL"
  },
  {
    label: "portal_account_link.student_id",
    sql: "SELECT COUNT(*) AS count FROM portal_account_link pal LEFT JOIN student s ON pal.student_id = s.id WHERE s.id IS NULL"
  }
];

const foreignKeyPlan = [
  {
    name: "fk_student_classroom",
    table: "student",
    column: "classroom_id",
    references: { table: "classroom", column: "id" },
    onDelete: "SET NULL"
  },
  {
    name: "fk_teacher_profile_user_account",
    table: "teacher_profile",
    column: "user_account_id",
    references: { table: "user_account", column: "id" },
    onDelete: "CASCADE"
  },
  {
    name: "fk_teacher_profile_classroom",
    table: "teacher_profile",
    column: "classroom_id",
    references: { table: "classroom", column: "id" },
    onDelete: "SET NULL"
  },
  {
    name: "fk_teacher_profile_approver",
    table: "teacher_profile",
    column: "approved_by_user_account_id",
    references: { table: "user_account", column: "id" },
    onDelete: "SET NULL"
  },
  {
    name: "fk_teaching_schedule_teacher_account",
    table: "teaching_schedule",
    column: "teacher_user_account_id",
    references: { table: "user_account", column: "id" },
    onDelete: "CASCADE"
  },
  {
    name: "fk_teaching_schedule_classroom",
    table: "teaching_schedule",
    column: "classroom_id",
    references: { table: "classroom", column: "id" },
    onDelete: "CASCADE"
  },
  {
    name: "fk_student_attendance_student",
    table: "student_attendance",
    column: "student_id",
    references: { table: "student", column: "id" },
    onDelete: "CASCADE"
  },
  {
    name: "fk_student_attendance_classroom",
    table: "student_attendance",
    column: "classroom_id",
    references: { table: "classroom", column: "id" },
    onDelete: "CASCADE"
  },
  {
    name: "fk_student_attendance_teacher_account",
    table: "student_attendance",
    column: "teacher_user_account_id",
    references: { table: "user_account", column: "id" },
    onDelete: "CASCADE"
  },
  {
    name: "fk_student_attendance_schedule",
    table: "student_attendance",
    column: "teaching_schedule_id",
    references: { table: "teaching_schedule", column: "id" },
    onDelete: "SET NULL"
  },
  {
    name: "fk_portal_account_link_user_account",
    table: "portal_account_link",
    column: "user_account_id",
    references: { table: "user_account", column: "id" },
    onDelete: "CASCADE"
  },
  {
    name: "fk_portal_account_link_student",
    table: "portal_account_link",
    column: "student_id",
    references: { table: "student", column: "id" },
    onDelete: "CASCADE"
  }
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

async function renameTables() {
  for (const [oldName, newName] of tableRenamePlan) {
    const oldExists = await tableExists(oldName);
    const newExists = await tableExists(newName);

    if (oldExists && newExists) {
      const oldCount = await rowCount(oldName);
      const newCount = await rowCount(newName);

      if (newCount === 0) {
        console.log(`Drop empty duplicate table ${newName}`);
        await queryInterface.dropTable(newName);
      } else if (oldCount === 0) {
        console.log(`Drop empty legacy table ${oldName}`);
        await queryInterface.dropTable(oldName);
        continue;
      } else {
        throw new Error(`Both ${oldName} and ${newName} contain data. Merge manually before migration.`);
      }
    }

    if (await tableExists(oldName)) {
      console.log(`Rename table ${oldName} -> ${newName}`);
      await queryInterface.renameTable(oldName, newName);
    } else if (await tableExists(newName)) {
      console.log(`Table ${newName} already exists`);
    } else {
      console.log(`Skip missing table ${oldName}`);
    }
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
        throw new Error(`Both ${tableName}.${oldName} and ${tableName}.${newName} exist. Merge manually before migration.`);
      }

      if (hasOldColumn) {
        console.log(`Rename column ${tableName}.${oldName} -> ${newName}`);
        await queryInterface.renameColumn(tableName, oldName, newName);
      }
    }
  }
}

async function assertNoOrphans() {
  for (const check of orphanCheckPlan) {
    const [rows] = await sequelize.query(check.sql);
    const count = Number(rows[0].count);
    if (count > 0) {
      throw new Error(`Cannot add foreign key for ${check.label}: ${count} orphan row(s) found.`);
    }
  }
}

async function ensureForeignKeys() {
  for (const item of foreignKeyPlan) {
    if (await foreignKeyExists(item)) {
      console.log(`Foreign key exists for ${item.table}.${item.column}`);
      continue;
    }

    if (!(await indexExistsForColumn(item.table, item.column))) {
      const indexName = `idx_${item.table}_${item.column}`;
      console.log(`Add index ${indexName}`);
      await queryInterface.addIndex(item.table, [item.column], { name: indexName });
    }

    console.log(`Add foreign key ${item.name}`);
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
  for (const [, tableName] of tableRenamePlan) {
    if (await tableExists(tableName)) {
      await sequelize.query(`ALTER TABLE ${quoteIdentifier(tableName)} ENGINE=InnoDB`);
    }
  }
}

async function migrate() {
  await sequelize.authenticate();
  console.log(`Connected to database ${sequelize.config.database}`);
  await renameTables();
  await renameColumns();
  await forceInnoDb();
  await assertNoOrphans();
  await ensureForeignKeys();
  console.log("English singular schema migration completed");
}

migrate()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
