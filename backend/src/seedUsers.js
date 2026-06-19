require("dotenv").config();

const bcrypt = require("bcryptjs");
const db = require("./models");

const User = db.User;
const Siswa = db.Siswa;
const PortalAccountLink = db.PortalAccountLink;

async function seedUsers() {
  try {
    await db.sequelize.authenticate();
    await db.sequelize.sync();

    const users = [
      {
        name: "Siswa Testing",
        email: "siswa@cnb.sch.id",
        password: "siswa123",
        role: "siswa",
        profession: "Siswa"
      },
      {
        name: "Orang Tua Testing",
        email: "orangtua@cnb.sch.id",
        password: "ortu123",
        role: "orangtua",
        profession: "Orang Tua"
      },
      {
        name: "Kepala Sekolah Testing",
        email: "kepsek@cnb.sch.id",
        password: "kepsek123",
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
        const hashedPassword = await bcrypt.hash(item.password, 10);

        user = await User.create({
          name: item.name,
          email: item.email,
          password: hashedPassword,
          role: item.role,
          profession: item.profession
        });

        console.log(`${item.role} berhasil dibuat: ${item.email}`);
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
