import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getPengumuman,
  createPengumuman,
  updatePengumuman,
  deletePengumuman,
  logout
} from "../services/api";

function AdminPengumuman() {
  const navigate = useNavigate();
  const [pengumuman, setPengumuman] = useState([]);
  const [editId, setEditId] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    date: "",
    content: "",
    category: "",
    image: ""
  });

  const loadPengumuman = async () => {
    const result = await getPengumuman();
    if (result.success) setPengumuman(result.data);
  };

  useEffect(() => {
    (async () => {
      await loadPengumuman();
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
      setFormData({ ...formData, image: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setEditId(null);
    setFormData({ title: "", date: "", content: "", category: "", image: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const result = editId
      ? await updatePengumuman(editId, formData)
      : await createPengumuman(formData);

    if (!result.success) {
      alert(result.message);
      return;
    }

    alert(result.message);
    resetForm();
    loadPengumuman();
  };

  const handleEdit = (item) => {
    setEditId(item.id);
    setFormData({
      title: item.title,
      date: item.date,
      content: item.content,
      category: item.category || "",
      image: item.image || ""
    });
  };

  const handleDelete = async (id) => {
    if (!confirm("Yakin ingin menghapus pengumuman ini?")) return;
    const result = await deletePengumuman(id);
    alert(result.message);
    loadPengumuman();
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
          <Link className="active" to="/admin/pengumuman">Pengumuman</Link>
          <Link to="/admin/galeri">Galeri</Link>
          <Link to="/admin/ppdb">PPDB</Link>
          <Link to="/admin/guru">Guru</Link>
          <Link to="/admin/kepala-sekolah">Kepala Sekolah</Link>
          <Link to="/admin/kelas">Kelas</Link>
          <Link to="/admin/siswa">Siswa</Link>
          <Link to="/admin/akun-siswa">Akun Siswa</Link>
          <Link to="/admin/profil-sekolah">Profil Sekolah</Link>
        </nav>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Pengumuman</h1>
            <p>Kelola data pengumuman sekolah.</p>
          </div>

          <div className="dashboard-actions">
            <Link to="/" className="btn secondary">Website</Link>
            <button onClick={handleLogout} className="btn primary">Logout</button>
          </div>
        </div>

        <section className="admin-kegiatan-card">
          <div className="kegiatan-form-area">
            <h2>{editId ? "Edit Pengumuman" : "Tambah Pengumuman"}</h2>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Judul</label>
                <input
                  type="text"
                  name="title"
                  placeholder="Masukkan judul pengumuman"
                  value={formData.title}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Tanggal</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Kategori</label>
                <input
                  type="text"
                  name="category"
                  placeholder="Masukkan kategori (opsional)"
                  value={formData.category}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Konten</label>
                <textarea
                  name="content"
                  placeholder="Masukkan konten pengumuman"
                  value={formData.content}
                  onChange={handleChange}
                  rows="5"
                  required
                />
              </div>

              <div className="form-group">
                <label>Gambar (opsional)</label>
                <label className="upload-box">
                  {formData.image ? (
                    <img src={formData.image} alt="Preview" />
                  ) : (
                    <div>
                      <strong>Upload Gambar</strong>
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
                  <button type="button" onClick={resetForm} className="cancel-btn">
                    Batal
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="kegiatan-list-area">
            <h2>Daftar Pengumuman</h2>

            <div className="activity-admin-list">
              {pengumuman.length === 0 ? (
                <p className="empty-text">Belum ada pengumuman.</p>
              ) : (
                pengumuman.map((item, index) => (
                  <div className="activity-admin-item" key={item.id}>
                    <span>{index + 1}</span>
                    <img src={item.image || "/logo.svg"} alt={item.title} />
                    <div>
                      <h4>{item.title}</h4>
                      <p>{item.date} {item.category && `• ${item.category}`}</p>
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

export default AdminPengumuman;
