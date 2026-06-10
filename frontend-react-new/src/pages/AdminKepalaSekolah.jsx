import schoolLogo from "../assets/logo.jpeg";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getKepalaSekolah,
  createKepalaSekolah,
  updateKepalaSekolah,
  deleteKepalaSekolah,
  logout
} from "../services/api";

function AdminKepalaSekolah() {
  const navigate = useNavigate();
  const [kepalaSekolah, setKepalaSekolah] = useState([]);
  const [editId, setEditId] = useState(null);

  const [formData, setFormData] = useState({
    nip: "",
    nama: "",
    email: "",
    no_telepon: "",
    foto: "",
    periode_mulai: "",
    periode_akhir: "",
    alamat: "",
    pendidikan_terakhir: "",
    status: "aktif"
  });

  const loadKepalaSekolah = async () => {
    const result = await getKepalaSekolah();
    if (result.success) setKepalaSekolah(result.data);
  };

  useEffect(() => {
    (async () => {
      await loadKepalaSekolah();
    })();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, foto: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setEditId(null);
    setFormData({
      nip: "",
      nama: "",
      email: "",
      no_telepon: "",
      foto: "",
      periode_mulai: "",
      periode_akhir: "",
      alamat: "",
      pendidikan_terakhir: "",
      status: "aktif"
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const result = editId
      ? await updateKepalaSekolah(editId, formData)
      : await createKepalaSekolah(formData);

    if (!result.success) {
      alert(result.message);
      return;
    }

    alert(result.message);
    resetForm();
    loadKepalaSekolah();
  };

  const handleEdit = (item) => {
    setEditId(item.id);
    setFormData({ ...item, foto: item.foto || "" });
  };

  const handleDelete = async (id) => {
    if (!confirm("Yakin ingin menghapus data kepala sekolah ini?")) return;
    const result = await deleteKepalaSekolah(id);
    alert(result.message);
    loadKepalaSekolah();
  };

  const handleLogout = () => {
    logout();
    navigate("/admin-login");
  };

  return (
    <div className="dashboard-layout">
      <aside className="admin-sidebar-card">
        <span className="sidebar-title">Dashboard</span>
        <h3>Admin</h3>

        <nav className="admin-menu">
          <Link to="/dashboard-admin">Dashboard</Link>
          <Link to="/admin/kegiatan">Kegiatan</Link>
          <Link to="/admin/pengumuman">Pengumuman</Link>
          <Link to="/admin/galeri">Galeri</Link>
          <Link to="/admin/ppdb">PPDB</Link>
          <Link to="/admin/guru">Guru</Link>
          <Link className="active" to="/admin/kepala-sekolah">Kepala Sekolah</Link>
          <Link to="/admin/kelas">Kelas</Link>
          <Link to="/admin/siswa">Siswa</Link>
          <Link to="/admin/akun-siswa">Akun Siswa</Link>
          <Link to="/admin/profil-sekolah">Profil Sekolah</Link>
        </nav>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Kepala Sekolah</h1>
            <p>Kelola data kepala sekolah.</p>
          </div>

          <div className="dashboard-actions">
            <Link to="/" className="btn secondary">Website</Link>
            <button onClick={handleLogout} className="btn primary">Logout</button>
          </div>
        </div>

        <section className="admin-kegiatan-card">
          <div className="kegiatan-form-area">
            <h2>{editId ? "Edit Data Kepala Sekolah" : "Tambah Data Kepala Sekolah"}</h2>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>NIP</label>
                <input type="text" name="nip" value={formData.nip} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label>Nama</label>
                <input type="text" name="nama" value={formData.nama} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>No Telepon</label>
                <input type="text" name="no_telepon" value={formData.no_telepon} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Periode Mulai</label>
                <input type="date" name="periode_mulai" value={formData.periode_mulai} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label>Periode Akhir</label>
                <input type="date" name="periode_akhir" value={formData.periode_akhir} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Pendidikan Terakhir</label>
                <input type="text" name="pendidikan_terakhir" value={formData.pendidikan_terakhir} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Alamat</label>
                <textarea name="alamat" value={formData.alamat} onChange={handleChange} rows="2" />
              </div>

              <div className="form-group">
                <label>Status</label>
                <select name="status" value={formData.status} onChange={handleChange}>
                  <option value="aktif">Aktif</option>
                  <option value="non-aktif">Non-Aktif</option>
                </select>
              </div>

              <div className="form-group">
                <label>Foto (opsional)</label>
                <label className="upload-box">
                  {formData.foto ? (
                    <img src={formData.foto} alt="Preview" />
                  ) : (
                    <div>
                      <strong>Upload Foto</strong>
                      <span>JPG / PNG</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleImage} />
                </label>
              </div>

              <div className="button-row">
                <button type="submit" className="save-btn">
                  {editId ? "Simpan Perubahan" : "Simpan"}
                </button>
                {editId && (
                  <button type="button" onClick={resetForm} className="cancel-btn">Batal</button>
                )}
              </div>
            </form>
          </div>

          <div className="kegiatan-list-area">
            <h2>Daftar Kepala Sekolah</h2>

            <div className="activity-admin-list">
              {kepalaSekolah.length === 0 ? (
                <p className="empty-text">Belum ada data kepala sekolah.</p>
              ) : (
                kepalaSekolah.map((item, index) => (
                  <div className="activity-admin-item" key={item.id}>
                    <span>{index + 1}</span>
                    <img src={item.foto || schoolLogo} alt={item.nama} />
                    <div>
                      <h4>{item.nama}</h4>
                      <p>{item.periode_mulai} - {item.periode_akhir || "Sekarang"}</p>
                    </div>
                    <div className="admin-action">
                      <button onClick={() => handleEdit(item)}>✎</button>
                      <button onClick={() => handleDelete(item.id)}>🗑</button>
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

export default AdminKepalaSekolah;
