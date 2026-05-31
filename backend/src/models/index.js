const sequelize = require("../config/database");

const User = require("./User");
const Kegiatan = require("./Kegiatan");


const db = {};

db.sequelize = sequelize;

db.User = User(sequelize);
db.Kegiatan = Kegiatan(sequelize);


module.exports = db;