const sequelize = require("../config/database");

const User = require("./User");
const Kegiatan = require("./Kegiatan");
const Pengumuman = require("./Pengumuman");

const db = {};

db.sequelize = sequelize;

db.User = User(sequelize);
db.Kegiatan = Kegiatan(sequelize);
db.Pengumuman = Pengumuman(sequelize);

module.exports = db;