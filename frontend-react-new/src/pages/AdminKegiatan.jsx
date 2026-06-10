import schoolLogo from "../assets/logo.jpeg";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import {
  getKegiatan,
  createKegiatan,
  updateKegiatan,
  deleteKegiatan,
  logout
} from "../services/api";

function AdminKegiatan() {
  const navigate = useNavigate();
  const [kegiatan, setKegiatan] = useState([]);
  const [editId, setEditId] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    date: "",
    description: "",
    image: ""
  });

  const loadKegiatan = async () => {
    const result = await getKegiatan();
    if (result.success) setKegiatan(result.data);
  };

  useEffect(() => {
    (async () => {
      await loadKegiatan();
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
    setFormData({ title: "", date: "", description: "", image: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const result = editId
      ? await updateKegiatan(editId, formData)
      : await createKegiatan(formData);

    if (!result.success) {
      alert(result.message);
      return;
    }

    alert(result.message);
    resetForm();
    loadKegiatan();
  };

  const handleEdit = (item) => {
    setEditId(item.id);
    setFormData({
      title: item.title,
      date: item.date,
      description: item.description,
      image: item.image || ""
    });
  };

  const handleDelete = async (id) => {
    if (!confirm("Yakin ingin menghapus kegiatan ini?")) return;
    const result = await deleteKegiatan(id);
    alert(result.message);
    loadKegiatan();
  };

  const handleLogout = () => {
    logout();
    navigate("/admin-login");
  };

  return (
    <div className="dashboard-layout">
      <AdminSidebar active="/admin/kegiatan" />

<main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Kegiatan</h1>
            <p>Kelola data kegiatan sekolah.</p>
          </div>

          <div className="dashboard-actions">
            <Link to="/" className="btn secondary">Website</Link>
            <button onClick={handleLogout} className="btn primary">Logout</button>
          </div>
        </div>

        <section className="admin-kegiatan-card">
          <div className="kegiatan-form-area">
            <h2>{editId ? "Edit Kegiatan" : "Tambah Kegiatan"}</h2>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Judul</label>
                <input
                  type="text"
                  name="title"
                  placeholder="Masukkan judul kegiatan"
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
                <label>Deskripsi</label>
                <textarea
                  name="description"
                  placeholder="Masukkan deskripsi kegiatan"
                  value={formData.description}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Foto Kegiatan</label>
                <label className="upload-box">
                  {formData.image ? (
                    <img src={formData.image} alt="Preview" />
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
                  <button type="button" onClick={resetForm} className="cancel-btn">
                    Batal
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="kegiatan-list-area">
            <h2>Daftar Kegiatan</h2>

            <div className="activity-admin-list">
              {kegiatan.length === 0 ? (
                <p className="empty-text">Belum ada kegiatan.</p>
              ) : (
                kegiatan.map((item, index) => (
                  <div className="activity-admin-item" key={item.id}>
                    <span>{index + 1}</span>
                    <img src={item.image || schoolLogo} alt={item.title} />
                    <div>
                      <h4>{item.title}</h4>
                      <p>{item.date}</p>
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

export default AdminKegiatan;
