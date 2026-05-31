require("dotenv").config();

const bcrypt = require("bcryptjs");
const db = require("./models");

const User = db.User;

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
      }
    ];

    for (const item of users) {
      const existingUser = await User.findOne({
        where: { email: item.email }
      });

      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(item.password, 10);

        await User.create({
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
    }

    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

seedUsers();