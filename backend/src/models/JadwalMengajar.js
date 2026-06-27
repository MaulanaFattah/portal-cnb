const { DataTypes } = require("sequelize");

/**
 * Model JadwalMengajar (tabel: "jadwal_mengajar")
 * -----------------------------------------------
 * Tabel ini menyimpan jadwal mengajar guru. Setiap baris mewakili satu slot
 * pengajaran: seorang guru mengajar mata pelajaran tertentu di sebuah kelas
 * pada hari dan rentang jam tertentu.
 *
 * Tabel ini menjadi acuan untuk pembuatan absensi per mata pelajaran dan
 * penyusunan jadwal pelajaran kelas.
 */
module.exports = (sequelize) => {
  return sequelize.define(
    "jadwal_mengajar",
    {
      // Primary key auto-increment, identitas unik tiap slot jadwal
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      // Foreign key ke "akun_pengguna": akun guru yang mengajar pada slot ini (wajib)
      guru_user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "guru_akun_pengguna_id",
        references: { model: "akun_pengguna", key: "id" }
      },
      // Foreign key ke "kelas": kelas yang diajar pada slot ini (wajib)
      kelas_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "kelas_id",
        references: { model: "kelas", key: "id" }
      },
      // Nama mata pelajaran yang diajar (wajib), dipetakan ke "mata_pelajaran"
      mapel: { type: DataTypes.STRING, allowNull: false, field: "mata_pelajaran" },
      // Enum hari pelaksanaan jadwal: senin..minggu (wajib)
      hari: {
        type: DataTypes.ENUM("senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"),
        allowNull: false,
        field: "hari"
      },
      // Jam mulai pelajaran (format waktu, wajib)
      jam_mulai: { type: DataTypes.TIME, allowNull: false },
      // Jam selesai pelajaran (format waktu, wajib)
      jam_selesai: { type: DataTypes.TIME, allowNull: false },
      // Enum status jadwal: "aktif" atau "non-aktif" (default "aktif")
      status: { type: DataTypes.ENUM("aktif", "non-aktif"), defaultValue: "aktif" },
      // Timestamp pembuatan baris, dipetakan ke kolom "dibuat_pada"
      createdAt: { type: DataTypes.DATE, allowNull: false, field: "dibuat_pada" },
      // Timestamp pembaruan terakhir, dipetakan ke kolom "diperbarui_pada"
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: "diperbarui_pada" }
    },
    {
      tableName: "jadwal_mengajar",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
