require("dotenv").config();

const app = require("./app");
const db = require("./models");

const PORT = process.env.APP_PORT || 4000;
const HOST = process.env.APP_HOST || "0.0.0.0";

async function startServer() {
  try {
    await db.sequelize.authenticate();

    console.log("Database terhubung");

    await db.sequelize.sync();

    console.log("Database tersinkronisasi");

    app.listen(PORT, HOST, () => {
      console.log(
        `Backend berjalan di http://${HOST}:${PORT}`
      );
    });

  } catch (error) {
    console.error(error);
  }
}

startServer();