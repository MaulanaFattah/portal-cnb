require("dotenv").config();

const db = require("./models");

const User = db.User;
const GuruProfile = db.GuruProfile;
const Kelas = db.Kelas;

async function tableExists(tableName) {
  const [rows] = await db.sequelize.query(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
    { replacements: [tableName] }
  );
  return rows.length > 0;
}

async function findLegacyTeacherProfile(legacyUserId) {
  if (!(await tableExists("teacher_profile"))) return null;
  const [rows] = await db.sequelize.query(
    "SELECT * FROM `teacher_profile` WHERE `user_account_id` = ? LIMIT 1",
    { replacements: [legacyUserId] }
  );
  return rows[0] || null;
}

function isHomeroomSubjectLabel(value) {
  const text = String(value || "").trim().toLowerCase();
  return ["wali kelas", "guru wali kelas", "guru"].includes(text);
}

async function syncLegacyGuruRegistrations() {
  if (!(await tableExists("user_account"))) {
    console.log("Tabel legacy user_account tidak ditemukan. Tidak ada data guru lama yang perlu disinkronkan.");
    return { imported: 0, skipped: 0 };
  }

  const [legacyUsers] = await db.sequelize.query(
    "SELECT * FROM `user_account` WHERE `role` = 'guru' ORDER BY `created_at` ASC"
  );

  let imported = 0;
  let skipped = 0;

  for (const legacyUser of legacyUsers) {
    const email = String(legacyUser.email || "").trim().toLowerCase();
    if (!email) {
      skipped += 1;
      continue;
    }

    let user = await User.findOne({ where: { email } });
    if (!user) {
      user = await User.create({
        name: legacyUser.name || "Guru",
        email,
        password: legacyUser.password,
        role: "guru",
        profession: legacyUser.profession || "Guru",
        must_change_password: false,
        createdAt: legacyUser.created_at || new Date(),
        updatedAt: legacyUser.updated_at || new Date()
      });
      imported += 1;
    } else {
      skipped += 1;
    }

    const existingProfile = await GuruProfile.findOne({ where: { user_id: user.id } });
    if (existingProfile) continue;

    const legacyProfile = await findLegacyTeacherProfile(legacyUser.id);
    const legacyClassId = Number(legacyProfile?.classroom_id || 0);
    const kelas = legacyClassId ? await Kelas.findByPk(legacyClassId) : null;
    const teacherType = legacyProfile?.teacher_type || "mapel";
    const legacySubject = legacyProfile?.subject || legacyUser.profession || null;
    const subject = teacherType === "wali_kelas" || isHomeroomSubjectLabel(legacySubject) ? null : legacySubject;

    await GuruProfile.create({
      user_id: user.id,
      teacher_type: teacherType === "wali_kelas" ? "wali_kelas" : "mapel",
      subject,
      is_homeroom: teacherType === "wali_kelas",
      kelas_id: kelas ? kelas.id : null,
      verification_status: legacyProfile?.verification_status || "pending",
      note: legacyProfile?.note || null,
      approved_at: legacyProfile?.approved_at || null,
      createdAt: legacyProfile?.created_at || legacyUser.created_at || new Date(),
      updatedAt: legacyProfile?.updated_at || legacyUser.updated_at || new Date()
    });
  }

  return { imported, skipped };
}

if (require.main === module) {
  (async () => {
    try {
      await db.sequelize.authenticate();
      const result = await syncLegacyGuruRegistrations();
      console.log(`Sinkronisasi guru legacy selesai. Diimpor: ${result.imported}, dilewati: ${result.skipped}.`);
      await db.sequelize.close();
      process.exit(0);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  })();
}

module.exports = { syncLegacyGuruRegistrations };
