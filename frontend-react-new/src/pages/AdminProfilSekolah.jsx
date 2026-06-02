import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getProfilSekolah,
  createProfilSekolah,
  updateProfilSekolah,
  logout
} from "../services/api";

function AdminProfilSekolah() {
  const navigate = useNavigate();
  const [isEdit, setIsEdit] = useState(false);

  const [formData, setFormData] = useState({
    nama_sekolah: "",
    npsn: "",
    alamat: "",
    telepon: "",
    email: "",
    website: "",
    logo: "",
    visi: "",
    misi: "",
    sejarah: "",
    akreditasi: ""
  });

  const loadProfil = async () => {
    const result = await getProfilSekolah();
    if (result.success && result.data) {
      setFormData({ ...result.data, logo: result.data.logo || "" });
      setIsEdit(true);
    }
  };

  useEffect(() => {
    (async () => {
      await loadProfil();
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
      setFormData({ ...formData, logo: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const result = isEdit
      ? await updateProfilSekolah(formData)
      : await createProfilSekolah(formData);

    if (!result.success) {
      alert(result.message);
      return;
    }

    alert(result.message);
    loadProfil();
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
          <Link to="/admin/kepala-sekolah">Kepala Sekolah</Link>
          <Link to="/admin/kelas">Kelas</Link>
          <Link to="/admin/siswa">Siswa</Link>
          <Link to="/admin/akun-siswa">Akun Siswa</Link>
          <Link className="active" to="/admin/profil-sekolah">Profil Sekolah</Link>
        </nav>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Profil Sekolah</h1>
            <p>Kelola profil sekolah.</p>
          </div>

          <div className="dashboard-actions">
            <Link to="/" className="btn secondary">Website</Link>
            <button onClick={handleLogout} className="btn primary">Logout</button>
          </div>
        </div>

        <section className="admin-kegiatan-card">
          <div className="kegiatan-form-area" style={{ maxWidth: "100%" }}>
            <h2>{isEdit ? "Edit Profil Sekolah" : "Buat Profil Sekolah"}</h2>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nama Sekolah</label>
                <input type="text" name="nama_sekolah" value={formData.nama_sekolah} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label>NPSN</label>
                <input type="text" name="npsn" value={formData.npsn} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Alamat</label>
                <textarea name="alamat" value={formData.alamat} onChange={handleChange} rows="2" />
              </div>

              <div className="form-group">
                <label>Telepon</label>
                <input type="text" name="telepon" value={formData.telepon} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Website</label>
                <input type="text" name="website" value={formData.website} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Akreditasi</label>
                <input type="text" name="akreditasi" placeholder="Contoh: A" value={formData.akreditasi} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Visi</label>
                <textarea name="visi" value={formData.visi} onChange={handleChange} rows="3" />
              </div>

              <div className="form-group">
                <label>Misi</label>
                <textarea name="misi" value={formData.misi} onChange={handleChange} rows="5" />
              </div>

              <div className="form-group">
                <label>Sejarah</label>
                <textarea name="sejarah" value={formData.sejarah} onChange={handleChange} rows="5" />
              </div>

              <div className="form-group">
                <label>Logo (opsional)</label>
                <label className="upload-box">
                  {formData.logo ? (
                    <img src={formData.logo} alt="Preview" />
                  ) : (
                    <div>
                      <strong>Upload Logo</strong>
                      <span>JPG / PNG</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleImage} />
                </label>
              </div>

              <div className="button-row">
                <button type="submit" className="save-btn">
                  {isEdit ? "Simpan Perubahan" : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}

export default AdminProfilSekolah;
