require("dotenv").config();

const { Op } = require("sequelize");
const db = require("./models");

const APPLY_CHANGES = process.argv.includes("--apply");

const Siswa = db.Siswa;
const User = db.User;
const PortalAccountLink = db.PortalAccountLink;

function normalizePhoneNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("62")) return `0${digits.slice(2)}`;
  return digits;
}

function describeUser(user) {
  return `#${user.id} ${user.name} <${user.email}>`;
}

function describeStudent(student) {
  return `#${student.id} ${student.nama} (${student.nisn || "tanpa NISN"})`;
}

async function buildMergePlan(transaction) {
  const links = await PortalAccountLink.findAll({ where: { link_type: "orangtua" }, transaction });
  const studentIds = [...new Set(links.map((link) => Number(link.siswa_id)).filter(Boolean))];
  const userIds = [...new Set(links.map((link) => Number(link.user_id)).filter(Boolean))];

  const [students, users] = await Promise.all([
    studentIds.length ? Siswa.findAll({ where: { id: { [Op.in]: studentIds } }, transaction }) : [],
    userIds.length ? User.findAll({ where: { id: { [Op.in]: userIds }, role: "orangtua" }, transaction }) : []
  ]);

  const studentMap = new Map(students.map((student) => [Number(student.id), student]));
  const userMap = new Map(users.map((user) => [Number(user.id), user]));
  const rowsByPhone = new Map();

  links.forEach((link) => {
    const student = studentMap.get(Number(link.siswa_id));
    const user = userMap.get(Number(link.user_id));
    const phone = normalizePhoneNumber(student?.no_telepon);
    if (!student || !user || !phone) return;

    const rows = rowsByPhone.get(phone) || [];
    rows.push({ link, student, user });
    rowsByPhone.set(phone, rows);
  });

  const groups = [];
  rowsByPhone.forEach((rows, phone) => {
    const parentUsers = [...new Map(rows.map((row) => [Number(row.user.id), row.user])).values()];
    if (parentUsers.length <= 1) return;

    const canonicalUser = [...parentUsers].sort((first, second) => Number(first.id) - Number(second.id))[0];
    const duplicateUsers = parentUsers.filter((user) => Number(user.id) !== Number(canonicalUser.id));
    const movedRows = rows.filter((row) => Number(row.user.id) !== Number(canonicalUser.id));

    groups.push({ phone, canonicalUser, duplicateUsers, movedRows, allRows: rows });
  });

  return { groups, allLinks: links };
}

async function applyMergePlan(groups, transaction) {
  const movedLinkIds = new Set();
  const duplicateUserIds = new Set();

  for (const group of groups) {
    group.duplicateUsers.forEach((user) => duplicateUserIds.add(Number(user.id)));

    for (const row of group.movedRows) {
      const existingCanonicalLink = await PortalAccountLink.findOne({
        where: {
          user_id: group.canonicalUser.id,
          siswa_id: row.student.id,
          link_type: "orangtua"
        },
        transaction
      });

      if (existingCanonicalLink) {
        await row.link.destroy({ transaction });
      } else {
        await row.link.update({ user_id: group.canonicalUser.id }, { transaction });
      }
      movedLinkIds.add(Number(row.link.id));
    }
  }

  const deletedUsers = [];
  for (const userId of duplicateUserIds) {
    const remainingLinks = await PortalAccountLink.count({ where: { user_id: userId }, transaction });
    if (remainingLinks > 0) continue;

    const deleted = await User.destroy({ where: { id: userId, role: "orangtua" }, transaction });
    if (deleted) deletedUsers.push(userId);
  }

  return { movedLinkCount: movedLinkIds.size, deletedUsers };
}

function printPlan(groups) {
  if (!groups.length) {
    console.log("Tidak ada akun orang tua duplikat berdasarkan nomor HP siswa.");
    return;
  }

  console.log(`Ditemukan ${groups.length} nomor HP dengan akun orang tua duplikat.`);
  groups.forEach((group, index) => {
    console.log("\n" + `${index + 1}. Nomor HP: ${group.phone}`);
    console.log(`   Dipertahankan: ${describeUser(group.canonicalUser)}`);
    console.log(`   Duplikat: ${group.duplicateUsers.map(describeUser).join(", ")}`);
    console.log(`   Siswa dipindahkan: ${group.movedRows.map((row) => describeStudent(row.student)).join(", ")}`);
  });
}

async function main() {
  await db.sequelize.authenticate();
  const transaction = await db.sequelize.transaction();

  try {
    const { groups } = await buildMergePlan(transaction);
    printPlan(groups);

    if (!APPLY_CHANGES) {
      await transaction.rollback();
      console.log("\nMode dry-run. Jalankan dengan --apply untuk benar-benar menggabungkan data.");
      return;
    }

    const result = await applyMergePlan(groups, transaction);
    await transaction.commit();
    console.log("\nCleanup selesai.");
    console.log(`Link dipindahkan: ${result.movedLinkCount}`);
    console.log(`Akun duplikat dihapus: ${result.deletedUsers.length ? result.deletedUsers.join(", ") : "tidak ada"}`);
  } catch (error) {
    await transaction.rollback();
    throw error;
  } finally {
    await db.sequelize.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
