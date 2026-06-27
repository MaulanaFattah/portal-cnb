const { DataTypes } = require("sequelize");

/**
 * Model AbsensiSiswa (tabel: "absensi_siswa")
 * --------------------------------------------
 * Tabel ini menyimpan catatan kehadiran (absensi) setiap siswa pada
 * pertemuan tertentu. Satu baris mewakili satu siswa yang diabsen oleh
 * seorang guru pada tanggal dan jadwal tertentu.
 *
 * Tabel ini dipakai untuk merekap kehadiran siswa, baik oleh wali kelas
 * (absensi harian) maupun oleh guru mata pelajaran (absensi per jadwal/mapel).
 * Setiap catatan terhubung ke siswa, kelas, guru yang mengabsen, dan
 * (opsional) ke jadwal mengajar yang menjadi dasar absensi.
 */
module.exports = (sequelize) => {
  return sequelize.define(
    "absensi_siswa",
    {
      // Primary key auto-increment, identitas unik tiap baris absensi
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      // Foreign key ke tabel "siswa": siswa yang diabsen (wajib diisi)
      siswa_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "siswa_id",
        references: { model: "siswa", key: "id" }
      },
      // Foreign key ke tabel "kelas": kelas tempat absensi dilakukan (wajib)
      kelas_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "kelas_id",
        references: { model: "kelas", key: "id" }
      },
      // Foreign key ke tabel "akun_pengguna": akun guru yang melakukan absensi (wajib)
      guru_user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "guru_akun_pengguna_id",
        references: { model: "akun_pengguna", key: "id" }
      },
      // Foreign key opsional ke tabel "jadwal_mengajar": jadwal yang menjadi dasar
      // absensi (boleh kosong untuk absensi harian wali kelas yang tidak terikat jadwal)
      jadwal_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "jadwal_mengajar_id",
        references: { model: "jadwal_mengajar", key: "id" }
      },
      // Tanggal absensi (hanya tanggal, tanpa jam)
      tanggal: { type: DataTypes.DATEONLY, allowNull: false },
      // Nama hari saat absensi (mis. "Senin"), disimpan untuk memudahkan pelaporan
      hari: { type: DataTypes.STRING, allowNull: false },
      // Enum tipe guru yang mengabsen: "wali_kelas" (absensi harian) atau "mapel" (per mata pelajaran)
      tipe_guru: { type: DataTypes.ENUM("wali_kelas", "mapel"), allowNull: false },
      // Nama mata pelajaran terkait absensi (opsional, relevan untuk tipe "mapel")
      mapel: { type: DataTypes.STRING, allowNull: true, field: "mata_pelajaran" },
      // Enum status kehadiran siswa: hadir / izin / sakit / alpha (wajib diisi)
      status: {
        type: DataTypes.ENUM("hadir", "izin", "sakit", "alpha"),
        allowNull: false
      },
      // Keterangan tambahan (mis. alasan izin/sakit), opsional
      keterangan: { type: DataTypes.TEXT, allowNull: true },
      // Timestamp pembuatan baris, dipetakan ke kolom "dibuat_pada"
      createdAt: { type: DataTypes.DATE, allowNull: false, field: "dibuat_pada" },
      // Timestamp pembaruan terakhir, dipetakan ke kolom "diperbarui_pada"
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: "diperbarui_pada" }
    },
    {
      tableName: "absensi_siswa",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
