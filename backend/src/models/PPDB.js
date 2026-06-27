const { DataTypes } = require("sequelize");

/**
 * Model PPDB (tabel: "pendaftaran_ppdb")
 * --------------------------------------
 * Tabel ini menyimpan data pendaftaran PPDB (Penerimaan Peserta Didik Baru).
 * Setiap baris mewakili satu formulir pendaftaran calon siswa, mencakup data
 * diri calon, data orang tua, berkas pendukung yang diunggah, jenis & target
 * jenjang pendaftaran, serta status proses seleksi (pending/diterima/ditolak).
 */
module.exports = (sequelize) => {
  return sequelize.define(
    "pendaftaran_ppdb",
    {
      // Primary key auto-increment, identitas unik tiap pendaftaran
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      // Enum jenis pendaftaran: "pendaftaran_baru" atau "siswa_pindahan" (default baru)
      jenis_pendaftaran: {
        type: DataTypes.ENUM("pendaftaran_baru", "siswa_pindahan"),
        allowNull: false,
        defaultValue: "pendaftaran_baru",
        field: "jenis_pendaftaran"
      },
      // Enum jenjang tujuan pendaftaran: "tk" / "sd" / "smp" (default "tk")
      target_jenjang: {
        type: DataTypes.ENUM("tk", "sd", "smp"),
        allowNull: false,
        defaultValue: "tk",
        field: "target_jenjang"
      },
      // Nama lengkap calon siswa (wajib)
      nama_lengkap: { type: DataTypes.STRING, allowNull: false, field: "nama_lengkap" },
      // NISN calon siswa (opsional)
      nisn: { type: DataTypes.STRING, allowNull: true, field: "nisn" },
      // Tempat lahir calon siswa (opsional)
      tempat_lahir: { type: DataTypes.STRING, allowNull: true, field: "tempat_lahir" },
      // Tanggal lahir calon siswa (wajib, hanya tanggal)
      tanggal_lahir: { type: DataTypes.DATEONLY, allowNull: false, field: "tanggal_lahir" },
      // Enum jenis kelamin: "L" (laki-laki) atau "P" (perempuan), wajib
      jenis_kelamin: { type: DataTypes.ENUM("L", "P"), allowNull: false, field: "jenis_kelamin" },
      // Agama calon siswa (opsional)
      agama: { type: DataTypes.STRING, allowNull: true, field: "agama" },
      // Alamat calon siswa (wajib)
      alamat: { type: DataTypes.TEXT, allowNull: false, field: "alamat" },
      // Nama orang tua/wali utama (wajib)
      nama_orang_tua: { type: DataTypes.STRING, allowNull: false, field: "nama_orang_tua" },
      // Nama ayah (opsional)
      nama_ayah: { type: DataTypes.STRING, allowNull: true, field: "nama_ayah" },
      // Nama ibu (opsional)
      nama_ibu: { type: DataTypes.STRING, allowNull: true, field: "nama_ibu" },
      // Pekerjaan ayah (opsional)
      pekerjaan_ayah: { type: DataTypes.STRING, allowNull: true, field: "pekerjaan_ayah" },
      // Pekerjaan ibu (opsional)
      pekerjaan_ibu: { type: DataTypes.STRING, allowNull: true, field: "pekerjaan_ibu" },
      // Nomor telepon yang bisa dihubungi (wajib)
      no_telepon: { type: DataTypes.STRING, allowNull: false, field: "no_telepon" },
      // Email kontak pendaftaran (wajib), dipakai untuk notifikasi
      email: { type: DataTypes.STRING, allowNull: false },
      // Asal sekolah calon siswa (opsional)
      asal_sekolah: { type: DataTypes.STRING, allowNull: true, field: "asal_sekolah" },
      // Enum status proses seleksi: pending / diterima / ditolak (default "pending")
      status: { type: DataTypes.ENUM("pending", "diterima", "ditolak"), defaultValue: "pending" },
      // Tahun ajaran tujuan pendaftaran (wajib)
      tahun_ajaran: { type: DataTypes.STRING, allowNull: false, field: "tahun_ajaran" },
      // Berkas Kartu Keluarga (LONGTEXT base64/path), opsional
      berkas_kk: { type: DataTypes.TEXT("long"), allowNull: true, field: "berkas_kk" },
      // Berkas rapor (LONGTEXT base64/path), opsional
      berkas_raport: { type: DataTypes.TEXT("long"), allowNull: true, field: "berkas_raport" },
      // Foto calon siswa (LONGTEXT base64/path), opsional
      foto_siswa: { type: DataTypes.TEXT("long"), allowNull: true, field: "foto_siswa" },
      // Berkas surat pindah (LONGTEXT base64/path), relevan untuk siswa pindahan, opsional
      berkas_surat_pindah: { type: DataTypes.TEXT("long"), allowNull: true, field: "berkas_surat_pindah" },
      // Catatan notifikasi ke pendaftar (mis. alasan diterima/ditolak), opsional
      notification_note: { type: DataTypes.TEXT, allowNull: true, field: "catatan_notifikasi" },
      // Timestamp pembuatan baris, dipetakan ke kolom "dibuat_pada"
      createdAt: { type: DataTypes.DATE, allowNull: false, field: "dibuat_pada" },
      // Timestamp pembaruan terakhir, dipetakan ke kolom "diperbarui_pada"
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: "diperbarui_pada" }
    },
    {
      tableName: "pendaftaran_ppdb",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
