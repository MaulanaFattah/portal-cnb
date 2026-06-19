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

function AdminKelas() {
  const navigate = useNavigate();
  const [kelas, setKelas] = useState([]);
  const [editId, setEditId] = useState(null);

  const [formData, setFormData] = useState({
    nama_kelas: "",
    tingkat: "",
    wali_kelas: "",
    tahun_ajaran: "",
    jumlah_siswa: 0,
    ruangan: ""
  });

  const loadKelas = async () => {
    const result = await getKelas();
    if (result.success) setKelas(result.data);
  };

  useEffect(() => {
    (async () => {
      await loadKelas();
    })();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setEditId(null);
    setFormData({
      nama_kelas: "",
      tingkat: "",
      wali_kelas: "",
      tahun_ajaran: "",
      jumlah_siswa: 0,
      ruangan: ""
    });
  };

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

  const handleEdit = (item) => {
    setEditId(item.id);
    setFormData({ ...item });
  };

  const handleDelete = async (id) => {
    if (!confirm("Yakin ingin menghapus data kelas ini?")) return;
    const result = await deleteKelas(id);
    alert(result.message);
    loadKelas();
  };

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
            <p>Kelola data kelas.</p>
          </div>

          <div className="dashboard-actions">
            <Link to="/" className="btn secondary">Situs web</Link>
            <button onClick={handleLogout} className="btn primary">Keluar</button>
          </div>
        </div>

        <section className="admin-kegiatan-card">
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

              <div className="form-group">
                <label>Jumlah Siswa</label>
                <input
                  type="number"
                  name="jumlah_siswa"
                  value={formData.jumlah_siswa}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Ruangan</label>
                <input
                  type="text"
                  name="ruangan"
                  placeholder="Contoh: R.101"
                  value={formData.ruangan}
                  onChange={handleChange}
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
