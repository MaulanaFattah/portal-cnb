require("dotenv").config();

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("./models");

const User = db.User;

function generateTemporaryPassword() {
  return `ADMIN-${crypto.randomBytes(9).toString("base64url")}`;
}

async function seedAdmin() {
  try {
    await db.sequelize.authenticate();
    await db.sequelize.sync();

    const adminEmail = process.env.ADMIN_EMAIL || "admin@cnb.sch.id";
    const adminPassword = process.env.ADMIN_PASSWORD || generateTemporaryPassword();
    const isGeneratedPassword = !process.env.ADMIN_PASSWORD;

    const existingAdmin = await User.findOne({
      where: {
        email: adminEmail
      }
    });

    if (existingAdmin) {
      console.log("Administrator sudah ada");
      process.exit();
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await User.create({
      name: "Administrator",
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
      profession: "Administrator Sekolah",
      must_change_password: true
    });

    console.log("Administrator berhasil dibuat");
    console.log(`Email: ${adminEmail}`);
    if (isGeneratedPassword) {
      console.log(`Kata sandi sementara: ${adminPassword}`);
      console.log("Simpan kata sandi ini dan ganti setelah login pertama.");
    } else {
      console.log("Kata sandi memakai ADMIN_PASSWORD dari environment.");
    }

    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

seedAdmin();