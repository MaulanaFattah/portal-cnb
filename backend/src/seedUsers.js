require("dotenv").config();

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("./models");

const User = db.User;
const Siswa = db.Siswa;
const PortalAccountLink = db.PortalAccountLink;

function generateTemporaryPassword(prefix) {
  return `${prefix}-${crypto.randomBytes(8).toString("base64url")}`;
}

function seedPassword(envName, prefix) {
  return {
    value: process.env[envName] || generateTemporaryPassword(prefix),
    envName,
    generated: !process.env[envName]
  };
}

async function seedUsers() {
  try {
    await db.sequelize.authenticate();
    await db.sequelize.sync();

    const siswaPassword = seedPassword("SEED_SISWA_PASSWORD", "SISWA");
    const orangtuaPassword = seedPassword("SEED_ORANGTUA_PASSWORD", "ORTU");
    const kepsekPassword = seedPassword("SEED_KEPSEK_PASSWORD", "KEPSEK");

    const users = [
      {
        name: "Siswa Testing",
        email: process.env.SEED_SISWA_EMAIL || "siswa@cnb.sch.id",
        password: siswaPassword,
        role: "siswa",
        profession: "Siswa"
      },
      {
        name: "Orang Tua Testing",
        email: process.env.SEED_ORANGTUA_EMAIL || "orangtua@cnb.sch.id",
        password: orangtuaPassword,
        role: "orangtua",
        profession: "Orang Tua"
      },
      {
        name: "Kepala Sekolah Testing",
        email: process.env.SEED_KEPSEK_EMAIL || "kepsek@cnb.sch.id",
        password: kepsekPassword,
        role: "kepala_sekolah",
        profession: "Kepala Sekolah"
      }
    ];

    const firstStudent = await Siswa.findOne({ order: [["nama", "ASC"]] });

    for (const item of users) {
      const existingUser = await User.findOne({
        where: { email: item.email }
      });
      let user = existingUser;

      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(item.password.value, 10);

        user = await User.create({
          name: item.name,
          email: item.email,
          password: hashedPassword,
          role: item.role,
          profession: item.profession,
          must_change_password: true
        });

        console.log(`${item.role} berhasil dibuat: ${item.email}`);
        if (item.password.generated) {
          console.log(`Kata sandi sementara ${item.role}: ${item.password.value}`);
        } else {
          console.log(`Kata sandi ${item.role} memakai ${item.password.envName} dari environment.`);
        }
      } else {
        console.log(`${item.role} sudah ada: ${item.email}`);
      }

      if (firstStudent && ["siswa", "orangtua"].includes(item.role)) {
        const existingLink = await PortalAccountLink.findOne({ where: { user_id: user.id, link_type: item.role } });
        if (!existingLink) {
          await PortalAccountLink.create({ user_id: user.id, siswa_id: firstStudent.id, link_type: item.role });
          console.log(`Tautan ${item.role} -> ${firstStudent.nama} dibuat`);
        }
      }
    }

    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

seedUsers();