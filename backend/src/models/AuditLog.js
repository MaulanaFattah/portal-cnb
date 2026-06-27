const { DataTypes } = require("sequelize");

/**
 * Model AuditLog (tabel: "log_audit")
 * -----------------------------------
 * Tabel ini menyimpan jejak audit (audit trail) atas aksi-aksi penting yang
 * terjadi di dalam sistem, seperti membuat, mengubah, atau menghapus data.
 *
 * Tujuannya untuk keperluan keamanan dan pelacakan: siapa (pelaku) melakukan
 * aksi apa, terhadap entitas mana, kapan, serta dari alamat IP dan perangkat apa.
 * Tabel ini bersifat hanya-catat (append-only): tidak memakai kolom waktu
 * pembaruan karena baris log tidak pernah diperbarui setelah dibuat.
 */
module.exports = (sequelize) => {
  return sequelize.define(
    "log_audit",
    {
      // Primary key auto-increment, identitas unik tiap entri log
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      // Foreign key opsional ke "akun_pengguna": pelaku aksi. Boleh kosong jika
      // aksi dilakukan oleh sistem atau pengguna anonim/tidak terautentikasi
      actor_user_account_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "pelaku_akun_pengguna_id",
        references: { model: "akun_pengguna", key: "id" }
      },
      // Nama aksi yang dilakukan (mis. "create", "update", "delete", "login")
      action: { type: DataTypes.STRING, allowNull: false, field: "aksi" },
      // Jenis entitas yang terdampak aksi (mis. "siswa", "guru", "ppdb")
      entity_type: { type: DataTypes.STRING, allowNull: false, field: "jenis_entitas" },
      // ID entitas yang terdampak (disimpan sebagai string agar fleksibel), opsional
      entity_id: { type: DataTypes.STRING, allowNull: true, field: "entitas_id" },
      // Data tambahan terkait aksi dalam bentuk teks/JSON (mis. nilai sebelum-sesudah)
      metadata: { type: DataTypes.TEXT, allowNull: true },
      // Alamat IP asal permintaan, untuk keperluan keamanan
      ip_address: { type: DataTypes.STRING, allowNull: true, field: "alamat_ip" },
      // User-Agent (informasi browser/perangkat) asal permintaan
      user_agent: { type: DataTypes.TEXT, allowNull: true, field: "agen_pengguna" },
      // Timestamp pembuatan log, dipetakan ke kolom "dibuat_pada"
      createdAt: { type: DataTypes.DATE, allowNull: false, field: "dibuat_pada" }
    },
    {
      tableName: "log_audit",
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      updatedAt: false
    }
  );
};
