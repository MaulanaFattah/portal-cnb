require("dotenv").config();

const app = require("./app");
const db = require("./models");

const PORT = process.env.APP_PORT || 4000;

async function startServer() {
  try {
    await db.sequelize.authenticate();

    console.log("Database Connected");

    await db.sequelize.sync();

    console.log("Database Synced");

    app.listen(PORT, () => {
      console.log(
        `Backend berjalan di http://localhost:${PORT}`
      );
    });

  } catch (error) {
    console.error(error);
  }
}

startServer();