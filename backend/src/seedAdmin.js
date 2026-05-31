require("dotenv").config();

const bcrypt = require("bcryptjs");
const db = require("./models");

const User = db.User;

async function seedAdmin() {
  try {
    await db.sequelize.authenticate();
    await db.sequelize.sync();

    const existingAdmin = await User.findOne({
      where: {
        email: "admin@cnb.sch.id"
      }
    });

    if (existingAdmin) {
      console.log("Admin sudah ada");
      process.exit();
    }

    const hashedPassword = await bcrypt.hash("admin123", 10);

    await User.create({
      name: "Administrator",
      email: "admin@cnb.sch.id",
      password: hashedPassword,
      role: "admin",
      profession: "Admin Sekolah"
    });

    console.log("Admin berhasil dibuat");
    console.log("Email: admin@cnb.sch.id");
    console.log("Password: admin123");

    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

seedAdmin();