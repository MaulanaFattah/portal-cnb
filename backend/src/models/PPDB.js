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
      // ===== Data calon peserta didik (tambahan form mitra) =====
      nik: { type: DataTypes.STRING, allowNull: true },
      no_kk: { type: DataTypes.STRING, allowNull: true },
      anak_ke: { type: DataTypes.INTEGER, allowNull: true },
      jumlah_saudara_kandung: { type: DataTypes.INTEGER, allowNull: true },
      jumlah_saudara_tiri: { type: DataTypes.INTEGER, allowNull: true },
      jumlah_saudara_angkat: { type: DataTypes.INTEGER, allowNull: true },
      // ===== Data orang tua kandung (tambahan form mitra) =====
      tempat_lahir_ayah: { type: DataTypes.STRING, allowNull: true },
      tanggal_lahir_ayah: { type: DataTypes.DATEONLY, allowNull: true },
      tempat_lahir_ibu: { type: DataTypes.STRING, allowNull: true },
      tanggal_lahir_ibu: { type: DataTypes.DATEONLY, allowNull: true },
      pendidikan_ayah: { type: DataTypes.STRING, allowNull: true },
      pendidikan_ibu: { type: DataTypes.STRING, allowNull: true },
      penghasilan_ayah: { type: DataTypes.STRING, allowNull: true },
      penghasilan_ibu: { type: DataTypes.STRING, allowNull: true },
      // ===== Data wali (tambahan form mitra) =====
      nama_wali: { type: DataTypes.STRING, allowNull: true },
      jenis_kelamin_wali: { type: DataTypes.STRING, allowNull: true },
      tempat_lahir_wali: { type: DataTypes.STRING, allowNull: true },
      tanggal_lahir_wali: { type: DataTypes.DATEONLY, allowNull: true },
      pendidikan_wali: { type: DataTypes.STRING, allowNull: true },
      pekerjaan_wali: { type: DataTypes.STRING, allowNull: true },
      alamat_wali: { type: DataTypes.TEXT, allowNull: true },
      // ===== Berkas tambahan (base64/path) =====
      berkas_akta: { type: DataTypes.TEXT("long"), allowNull: true },
      berkas_ktp_ortu: { type: DataTypes.TEXT("long"), allowNull: true },
      // ===== Registrasi & daftar ulang =====
      // Nomor registrasi/ID sementara dipakai siswa untuk login sebelum NIS terbit
      nomor_registrasi: { type: DataTypes.STRING, allowNull: true },
      // Status daftar ulang: "belum" / "sudah"
      status_daftar_ulang: { type: DataTypes.STRING, allowNull: false, defaultValue: "belum" },
      tanggal_daftar_ulang: { type: DataTypes.DATE, allowNull: true },
      // Enum status proses seleksi: pending / diterima / ditolak / revisi_berkas (default "pending")
      // "revisi_berkas" = berkas tidak valid, pendaftar diminta mengunggah ulang berkas tertentu.
      status: { type: DataTypes.ENUM("pending", "diterima", "ditolak", "revisi_berkas"), defaultValue: "pending" },
      // Catatan revisi dari admin (alasan berkas tidak valid), tampil ke pendaftar saat cek status.
      catatan_revisi: { type: DataTypes.TEXT, allowNull: true, field: "catatan_revisi" },
      // Daftar key berkas yang diminta diperbaiki (JSON string array, mis. '["berkas_kk","foto_siswa"]').
      berkas_revisi: { type: DataTypes.TEXT, allowNull: true, field: "berkas_revisi" },
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
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: "diperbarui_pada" },
      // Timestamp soft delete (paranoid). Null = belum dihapus.
      deletedAt: { type: DataTypes.DATE, allowNull: true, field: "dihapus_pada" }
    },
    {
      tableName: "pendaftaran_ppdb",
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      paranoid: true
    }
  );
};
