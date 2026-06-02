import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getGaleri,
  createGaleri,
  updateGaleri,
  deleteGaleri,
  logout
} from "../services/api";

function AdminGaleri() {
  const navigate = useNavigate();
  const [galeri, setGaleri] = useState([]);
  const [editId, setEditId] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    image: "",
    description: "",
    category: ""
  });

  const loadGaleri = async () => {
    const result = await getGaleri();
    if (result.success) setGaleri(result.data);
  };

  useEffect(() => {
    (async () => {
      await loadGaleri();
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
    setFormData({ title: "", image: "", description: "", category: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const result = editId
      ? await updateGaleri(editId, formData)
      : await createGaleri(formData);

    if (!result.success) {
      alert(result.message);
      return;
    }

    alert(result.message);
    resetForm();
    loadGaleri();
  };

  const handleEdit = (item) => {
    setEditId(item.id);
    setFormData({
      title: item.title,
      image: item.image || "",
      description: item.description || "",
      category: item.category || ""
    });
  };

  const handleDelete = async (id) => {
    if (!confirm("Yakin ingin menghapus galeri ini?")) return;
    const result = await deleteGaleri(id);
    alert(result.message);
    loadGaleri();
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
          <Link className="active" to="/admin/galeri">Galeri</Link>
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
            <h1>Galeri</h1>
            <p>Kelola galeri foto sekolah.</p>
          </div>

          <div className="dashboard-actions">
            <Link to="/" className="btn secondary">Website</Link>
            <button onClick={handleLogout} className="btn primary">Logout</button>
          </div>
        </div>

        <section className="admin-kegiatan-card">
          <div className="kegiatan-form-area">
            <h2>{editId ? "Edit Galeri" : "Tambah Galeri"}</h2>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Judul</label>
                <input
                  type="text"
                  name="title"
                  placeholder="Masukkan judul foto"
                  value={formData.title}
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
                <label>Deskripsi</label>
                <textarea
                  name="description"
                  placeholder="Masukkan deskripsi (opsional)"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Foto</label>
                <label className="upload-box">
                  {formData.image ? (
                    <img src={formData.image} alt="Preview" />
                  ) : (
                    <div>
                      <strong>Upload Foto</strong>
                      <span>JPG / PNG</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleImage} required={!editId} />
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
            <h2>Daftar Galeri</h2>

            <div className="activity-admin-list">
              {galeri.length === 0 ? (
                <p className="empty-text">Belum ada galeri.</p>
              ) : (
                galeri.map((item, index) => (
                  <div className="activity-admin-item" key={item.id}>
                    <span>{index + 1}</span>
                    <img src={item.image} alt={item.title} />
                    <div>
                      <h4>{item.title}</h4>
                      <p>{item.category || "Tanpa kategori"}</p>
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

export default AdminGaleri;
