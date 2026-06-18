import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import { getGaleri, createGaleri, updateGaleri, deleteGaleri, logout } from "../services/api";

const emptyForm = { title: "", image: "", description: "" };

function AdminGaleri() {
  const navigate = useNavigate();
  const [galeri, setGaleri] = useState([]);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isReadingImage, setIsReadingImage] = useState(false);

  const loadGaleri = async () => {
    const result = await getGaleri();
    if (result.success) setGaleri(result.data || []);
  };

  useEffect(() => { (async () => { await loadGaleri(); })(); }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsReadingImage(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((current) => ({ ...current, image: reader.result }));
      setIsReadingImage(false);
    };
    reader.onerror = () => {
      setIsReadingImage(false);
      alert("Gagal membaca file foto. Coba pilih gambar lain.");
    };
    reader.readAsDataURL(file);
  };
  const resetForm = () => { setEditId(null); setFormData(emptyForm); setIsReadingImage(false); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.image) {
      alert("Foto wajib dipilih terlebih dahulu.");
      return;
    }

    const payload = { ...formData, category: "" };
    const result = editId ? await updateGaleri(editId, payload) : await createGaleri(payload);
    alert(result.error ? `${result.message}: ${result.error}` : result.message);
    if (result.success) { resetForm(); loadGaleri(); }
  };

  const handleEdit = (item) => {
    setEditId(item.id);
    setFormData({ title: item.title || "", image: item.image || "", description: item.description || "" });
  };

  const handleDelete = async (id) => {
    if (!confirm("Yakin ingin menghapus galeri ini?")) return;
    const result = await deleteGaleri(id);
    alert(result.message);
    loadGaleri();
  };

  const handleLogout = () => { logout(); navigate("/admin-login"); };

  return (
    <div className="dashboard-layout">
      <AdminSidebar active="/admin/galeri" />
      <main className="dashboard-content">
        <div className="dashboard-header">
          <div><h1>Galeri</h1><p>Kelola judul, deskripsi, dan foto galeri.</p></div>
          <div className="dashboard-actions"><Link to="/galeri" className="btn secondary">Lihat Galeri</Link><button onClick={handleLogout} className="btn primary">Keluar</button></div>
        </div>
        <section className="admin-kegiatan-card">
          <div className="kegiatan-form-area">
            <h2>{editId ? "Edit Galeri" : "Tambah Galeri"}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group"><label>Judul</label><input name="title" value={formData.title} onChange={handleChange} required /></div>
              <div className="form-group"><label>Deskripsi</label><textarea name="description" value={formData.description} onChange={handleChange} rows="3" /></div>
              <div className="form-group"><label>Foto</label><label className="upload-box">{formData.image ? <img src={formData.image} alt="Preview" /> : <div><strong>Upload Foto</strong><span>JPG / PNG</span></div>}<input type="file" accept="image/*" onChange={handleImage} required={!editId} /></label></div>
              <div className="button-row"><button type="submit" className="save-btn" disabled={isReadingImage || !formData.image}>{isReadingImage ? "Memuat Foto..." : editId ? "Simpan Perubahan" : "Simpan"}</button>{editId && <button type="button" onClick={resetForm} className="cancel-btn">Batal</button>}</div>
            </form>
          </div>
          <div className="kegiatan-list-area">
            <h2>Daftar Galeri</h2>
            <div className="activity-admin-list">
              {galeri.length === 0 ? <p className="empty-text">Belum ada galeri.</p> : galeri.map((item, index) => (
                <div className="activity-admin-item" key={item.id}><span>{index + 1}</span><img src={item.image} alt={item.title} /><div><h4>{item.title}</h4><p>{item.description || "Tanpa deskripsi"}</p></div><div className="admin-action"><button onClick={() => handleEdit(item)}>Edit</button><button onClick={() => handleDelete(item.id)}>Hapus</button></div></div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default AdminGaleri;
