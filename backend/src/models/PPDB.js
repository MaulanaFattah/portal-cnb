const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "admission_application",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      jenis_pendaftaran: {
        type: DataTypes.ENUM("pendaftaran_baru", "siswa_pindahan"),
        allowNull: false,
        defaultValue: "pendaftaran_baru",
        field: "registration_type"
      },
      target_jenjang: {
        type: DataTypes.ENUM("tk", "sd", "smp"),
        allowNull: false,
        defaultValue: "tk",
        field: "target_level"
      },
      nama_lengkap: { type: DataTypes.STRING, allowNull: false, field: "full_name" },
      nisn: { type: DataTypes.STRING, allowNull: true, field: "national_student_id" },
      tempat_lahir: { type: DataTypes.STRING, allowNull: true, field: "birthplace" },
      tanggal_lahir: { type: DataTypes.DATEONLY, allowNull: false, field: "birth_date" },
      jenis_kelamin: { type: DataTypes.ENUM("L", "P"), allowNull: false, field: "gender" },
      agama: { type: DataTypes.STRING, allowNull: true, field: "religion" },
      alamat: { type: DataTypes.TEXT, allowNull: false, field: "address" },
      nama_orang_tua: { type: DataTypes.STRING, allowNull: false, field: "parent_name" },
      nama_ayah: { type: DataTypes.STRING, allowNull: true, field: "father_name" },
      nama_ibu: { type: DataTypes.STRING, allowNull: true, field: "mother_name" },
      pekerjaan_ayah: { type: DataTypes.STRING, allowNull: true, field: "father_occupation" },
      pekerjaan_ibu: { type: DataTypes.STRING, allowNull: true, field: "mother_occupation" },
      no_telepon: { type: DataTypes.STRING, allowNull: false, field: "phone_number" },
      email: { type: DataTypes.STRING, allowNull: false },
      asal_sekolah: { type: DataTypes.STRING, allowNull: true, field: "previous_school" },
      status: { type: DataTypes.ENUM("pending", "diterima", "ditolak"), defaultValue: "pending" },
      tahun_ajaran: { type: DataTypes.STRING, allowNull: false, field: "academic_year" },
      berkas_kk: { type: DataTypes.TEXT("long"), allowNull: true, field: "family_card_file" },
      berkas_raport: { type: DataTypes.TEXT("long"), allowNull: true, field: "report_file" },
      foto_siswa: { type: DataTypes.TEXT("long"), allowNull: true, field: "student_photo_file" },
      berkas_surat_pindah: { type: DataTypes.TEXT("long"), allowNull: true, field: "transfer_letter_file" },
      notification_note: { type: DataTypes.TEXT, allowNull: true }
    },
    {
      tableName: "admission_application",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
