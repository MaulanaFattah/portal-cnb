import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import {
  getKelas,
  createKelas,
  updateKelas,
  deleteKelas,
  logout
} from "../services/api";

const emptyKelasForm = {
  nama_kelas: "",
  tingkat: "",
  wali_kelas: "",
  tahun_ajaran: ""
};

/**
 * Halaman Admin Kelas.
 *
 * Halaman ini dipakai admin untuk mengelola data kelas: nama kelas, tingkat,
 * wali kelas, dan tahun ajaran. Jumlah siswa per kelas dihitung otomatis dari
 * data siswa. Admin dapat menambah, mengubah, dan menghapus kelas.
 *
 * Peran/akses: hanya admin (area dashboard admin, butuh sesi login admin).
 */
function AdminKelas() {
  const navigate = useNavigate();
  const [kelas, setKelas] = useState([]);
  const [editId, setEditId] = useState(null);

  const [formData, setFormData] = useState(emptyKelasForm);

  /**
   * Memuat daftar kelas dari server.
   * Efek: memanggil API getKelas(); mengisi state kelas bila sukses.
   */
  const loadKelas = async () => {
    const result = await getKelas();
    if (result.success) setKelas(result.data);
  };

  // Memuat data kelas sekali saat komponen dipasang.
  useEffect(() => {
    (async () => {
      await loadKelas();
    })();
  }, []);

  /**
   * Menangani perubahan input pada form kelas.
   * Parameter: e - event input (memakai name & value).
   * Efek: memperbarui field terkait pada formData.
   */
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  /**
   * Mengembalikan form ke kondisi kosong (mode tambah).
   * Efek: mereset editId dan formData ke nilai default.
   */
  const resetForm = () => {
    setEditId(null);
    setFormData(emptyKelasForm);
  };

  /**
   * Menyimpan data kelas (tambah baru atau perbarui).
   * Parameter: e - event submit form (dicegah reload-nya).
   * Efek: memanggil API updateKelas (bila editId) atau createKelas; alert;
   * bila sukses mereset form dan memuat ulang daftar kelas.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const result = editId
      ? await updateKelas(editId, formData)
      : await createKelas(formData);

    if (!result.success) {
      alert(result.message);
      return;
    }

    alert(result.message);
    resetForm();
    loadKelas();
  };

  /**
   * Mengisi form dengan data kelas terpilih untuk diubah (mode edit).
   * Parameter: item - objek kelas.
   * Efek: mengeset editId dan mengisi formData dari item.
   */
  const handleEdit = (item) => {
    setEditId(item.id);
    setFormData({
      nama_kelas: item.nama_kelas || "",
      tingkat: item.tingkat || "",
      wali_kelas: item.wali_kelas || "",
      tahun_ajaran: item.tahun_ajaran || ""
    });
  };

  /**
   * Menghapus data kelas setelah konfirmasi.
   * Parameter: id - id kelas.
   * Efek: konfirmasi; memanggil API deleteKelas; alert; memuat ulang daftar.
   */
  const handleDelete = async (id) => {
    if (!confirm("Yakin ingin menghapus data kelas ini?")) return;
    const result = await deleteKelas(id);
    alert(result.message);
    loadKelas();
  };

  /**
   * Keluar dari sesi admin.
   * Efek: memanggil logout() lalu mengarahkan ke halaman login admin.
   */
  const handleLogout = () => {
    logout();
    navigate("/admin-login");
  };

  return (
    <div className="dashboard-layout">
      <AdminSidebar active="/admin/kelas" />

<main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Kelas</h1>
            <p>Kelola nama kelas, tingkat, wali kelas, dan tahun ajaran. Jumlah siswa dihitung otomatis dari data siswa.</p>
          </div>

          <div className="dashboard-actions">
            <Link to="/" className="btn secondary">Situs web</Link>
            <button onClick={handleLogout} className="btn primary">Keluar</button>
          </div>
        </div>

        <section className="admin-kegiatan-card class-admin-card">
          <div className="kegiatan-form-area">
            <h2>{editId ? "Ubah Data Kelas" : "Tambah Data Kelas"}</h2>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nama Kelas</label>
                <input
                  type="text"
                  name="nama_kelas"
                  placeholder="Contoh: X IPA 1"
                  value={formData.nama_kelas}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Tingkat</label>
                <input
                  type="text"
                  name="tingkat"
                  placeholder="Contoh: 10"
                  value={formData.tingkat}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Wali Kelas</label>
                <input
                  type="text"
                  name="wali_kelas"
                  placeholder="Nama wali kelas"
                  value={formData.wali_kelas}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Tahun Ajaran</label>
                <input
                  type="text"
                  name="tahun_ajaran"
                  placeholder="2024/2025"
                  value={formData.tahun_ajaran}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="button-row">
                <button type="submit" className="save-btn">
                  {editId ? "Simpan Perubahan" : "Simpan"}
                </button>
                {editId && (
                  <button type="button" onClick={resetForm} className="cancel-btn">
                    Batal
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="kegiatan-list-area">
            <h2>Daftar Kelas</h2>

            <div className="activity-admin-list">
              {kelas.length === 0 ? (
                <p className="empty-text">Belum ada data kelas.</p>
              ) : (
                kelas.map((item, index) => (
                  <div className="activity-admin-item" key={item.id}>
                    <span>{index + 1}</span>
                    <div>
                      <h4>{item.nama_kelas}</h4>
                      <p>Tingkat {item.tingkat} • {item.tahun_ajaran} • {item.jumlah_siswa} siswa</p>
                    </div>
                    <div className="admin-action">
                      <button onClick={() => handleEdit(item)}>Ubah</button>
                      <button onClick={() => handleDelete(item.id)}>Hapus</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default AdminKelas;
