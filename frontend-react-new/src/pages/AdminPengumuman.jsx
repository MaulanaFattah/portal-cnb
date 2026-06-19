import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import { getPengumuman, createPengumuman, updatePengumuman, deletePengumuman, logout } from "../services/api";

const emptyForm = { title: "", date: "", content: "" };

function AdminPengumuman() {
  const navigate = useNavigate();
  const [pengumuman, setPengumuman] = useState([]);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const loadPengumuman = async () => {
    const result = await getPengumuman();
    if (result.success) setPengumuman(result.data || []);
  };

  useEffect(() => { (async () => { await loadPengumuman(); })(); }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const resetForm = () => { setEditId(null); setFormData(emptyForm); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = editId ? await updatePengumuman(editId, formData) : await createPengumuman(formData);
    alert(result.message);
    if (result.success) { resetForm(); loadPengumuman(); }
  };

  const handleEdit = (item) => {
    setEditId(item.id);
    setFormData({ title: item.title || "", date: item.date || "", content: item.content || "" });
  };

  const handleDelete = async (id) => {
    if (!confirm("Yakin ingin menghapus pengumuman ini?")) return;
    const result = await deletePengumuman(id);
    alert(result.message);
    loadPengumuman();
  };

  const handleLogout = () => { logout(); navigate("/admin-login"); };

  return (
    <div className="dashboard-layout">
      <AdminSidebar active="/admin/pengumuman" />
      <main className="dashboard-content">
        <div className="dashboard-header">
          <div><h1>Pengumuman</h1><p>Kelola judul, tanggal, dan deskripsi pengumuman.</p></div>
          <div className="dashboard-actions"><Link to="/pengumuman" className="btn secondary">Lihat Halaman</Link><button onClick={handleLogout} className="btn primary">Keluar</button></div>
        </div>
        <section className="admin-kegiatan-card announcement-admin-card">
          <div className="kegiatan-form-area">
            <h2>{editId ? "Ubah Pengumuman" : "Tambah Pengumuman"}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group"><label>Judul</label><input name="title" value={formData.title} onChange={handleChange} required /></div>
              <div className="form-group"><label>Tanggal</label><input type="date" name="date" value={formData.date} onChange={handleChange} required /></div>
              <div className="form-group"><label>Deskripsi</label><textarea name="content" value={formData.content} onChange={handleChange} rows="5" required /></div>
              <div className="button-row"><button type="submit" className="save-btn">{editId ? "Simpan Perubahan" : "Simpan"}</button>{editId && <button type="button" onClick={resetForm} className="cancel-btn">Batal</button>}</div>
            </form>
          </div>
          <div className="kegiatan-list-area">
            <h2>Daftar Pengumuman</h2>
            <div className="activity-admin-list">
              {pengumuman.length === 0 ? <p className="empty-text">Belum ada pengumuman.</p> : pengumuman.map((item, index) => (
                <div className="activity-admin-item announcement-admin-item" key={item.id}><span>{index + 1}</span><div><h4>{item.title}</h4><p>{item.date} • {item.content}</p></div><div className="admin-action"><button onClick={() => handleEdit(item)}>Ubah</button><button onClick={() => handleDelete(item.id)}>Hapus</button></div></div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default AdminPengumuman;
