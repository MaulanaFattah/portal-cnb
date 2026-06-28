const { DataTypes } = require("sequelize");

/**
 * Model GuruProfile (tabel: "profil_guru")
 * ----------------------------------------
 * Tabel ini menyimpan profil portal untuk akun pengguna ber-peran guru.
 * Berbeda dengan tabel master "guru" (biodata), tabel ini menghubungkan
 * sebuah akun login (akun_pengguna) dengan atribut pengajaran di portal:
 * tipe guru (wali kelas/mapel), mata pelajaran, jenjang, kelas yang diampu,
 * serta status verifikasi pendaftaran guru oleh admin/kepala sekolah.
 *
 * Tabel ini juga menyimpan jejak persetujuan (siapa menyetujui dan kapan).
 */
module.exports = (sequelize) => {
  return sequelize.define(
    "profil_guru",
    {
      // Primary key auto-increment, identitas unik tiap profil guru
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      // Foreign key unik ke "akun_pengguna": satu akun hanya punya satu profil guru (relasi 1-1)
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        field: "akun_pengguna_id",
        references: { model: "akun_pengguna", key: "id" }
      },
      // Enum tipe guru: "wali_kelas" atau "mapel" (default "mapel"), dipetakan ke "tipe_guru"
      teacher_type: {
        type: DataTypes.ENUM("wali_kelas", "mapel"),
        allowNull: false,
        field: "tipe_guru",
        defaultValue: "mapel"
      },
      // Mata pelajaran yang diampu (opsional), dipetakan ke "mata_pelajaran"
      subject: { type: DataTypes.STRING, allowNull: true, field: "mata_pelajaran" },
      // Enum jenjang yang diampu: "sd" atau "smp" (opsional)
      jenjang: { type: DataTypes.ENUM("sd", "smp"), allowNull: true, field: "jenjang" },
      // Data pribadi yang dapat diedit guru sendiri lewat halaman Profil Guru
      no_telepon: { type: DataTypes.STRING, allowNull: true, field: "no_telepon" },
      alamat: { type: DataTypes.TEXT, allowNull: true, field: "alamat" },
      jenis_kelamin: { type: DataTypes.ENUM("L", "P"), allowNull: true, field: "jenis_kelamin" },
      foto: { type: DataTypes.TEXT, allowNull: true, field: "foto" },
      // Penanda apakah guru ini berperan sebagai wali kelas (default false), dipetakan ke "wali_kelas"
      is_homeroom: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: "wali_kelas" },
      // Foreign key opsional ke "kelas": kelas yang diampu/diwalikan (boleh kosong)
      kelas_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "kelas_id",
        references: { model: "kelas", key: "id" }
      },
      // Enum status verifikasi profil guru: pending / approved / rejected (default "pending"),
      // dipakai untuk alur persetujuan pendaftaran guru oleh admin
      verification_status: {
        type: DataTypes.ENUM("pending", "approved", "rejected"),
        field: "status_verifikasi",
        defaultValue: "pending"
      },
      // Catatan tambahan terkait verifikasi (mis. alasan), opsional, dipetakan ke "catatan"
      note: { type: DataTypes.TEXT, allowNull: true, field: "catatan" },
      // Foreign key opsional ke "akun_pengguna": akun yang menyetujui profil ini (boleh kosong)
      approved_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "disetujui_oleh_akun_pengguna_id",
        references: { model: "akun_pengguna", key: "id" }
      },
      // Timestamp kapan profil disetujui (opsional), dipetakan ke "disetujui_pada"
      approved_at: { type: DataTypes.DATE, allowNull: true, field: "disetujui_pada" },
      // Timestamp pembuatan baris, dipetakan ke kolom "dibuat_pada"
      createdAt: { type: DataTypes.DATE, allowNull: false, field: "dibuat_pada" },
      // Timestamp pembaruan terakhir, dipetakan ke kolom "diperbarui_pada"
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: "diperbarui_pada" }
    },
    {
      tableName: "profil_guru",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
