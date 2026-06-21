import schoolLogo from "../assets/logo-transparent.png";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getGuru,
  createGuru,
  updateGuru,
  deleteGuru,
  logout
} from "../services/api";

function AdminGuru() {
  const navigate = useNavigate();
  const [guru, setGuru] = useState([]);
  const [editId, setEditId] = useState(null);

  const [formData, setFormData] = useState({
    nip: "",
    nama: "",
    email: "",
    no_telepon: "",
    mata_pelajaran: "",
    pendidikan_terakhir: "",
    foto: "",
    alamat: "",
    tanggal_lahir: "",
    jenis_kelamin: "L",
    status: "aktif"
  });

  const loadGuru = async () => {
    const result = await getGuru();
    if (result.success) setGuru(result.data);
  };

  useEffect(() => {
    (async () => {
      await loadGuru();
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
      mata_pelajaran: "",
      pendidikan_terakhir: "",
      foto: "",
      alamat: "",
      tanggal_lahir: "",
      jenis_kelamin: "L",
      status: "aktif"
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const result = editId
      ? await updateGuru(editId, formData)
      : await createGuru(formData);

    if (!result.success) {
      alert(result.message);
      return;
    }

    alert(result.message);
    resetForm();
    loadGuru();
  };

  const handleEdit = (item) => {
    setEditId(item.id);
    setFormData({ ...item, foto: item.foto || "" });
  };

  const handleDelete = async (id) => {
    if (!confirm("Yakin ingin menghapus data guru ini?")) return;
    const result = await deleteGuru(id);
    alert(result.message);
    loadGuru();
  };

  const handleLogout = () => {
    logout();
    navigate("/admin-login");
  };

  return (
    <div className="dashboard-layout">
      <aside className="admin-sidebar-card">
        <span className="sidebar-title">Dasbor</span>
        <h3>Administrator</h3>

        <nav className="admin-menu">
          <Link to="/dashboard-admin">Dasbor</Link>
          <Link to="/admin/kegiatan">Kegiatan</Link>
          <Link to="/admin/pengumuman">Pengumuman</Link>
          <Link to="/admin/galeri">Galeri</Link>
          <Link to="/admin/ppdb">PPDB</Link>
          <Link className="active" to="/admin/guru">Guru</Link>
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
            <h1>Guru</h1>
            <p>Kelola data guru.</p>
          </div>

          <div className="dashboard-actions">
            <Link to="/" className="btn secondary">Situs web</Link>
            <button onClick={handleLogout} className="btn primary">Keluar</button>
          </div>
        </div>

        <section className="admin-kegiatan-card">
          <div className="kegiatan-form-area">
            <h2>{editId ? "Ubah Data Guru" : "Tambah Data Guru"}</h2>

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
                <label>Mata Pelajaran</label>
                <input type="text" name="mata_pelajaran" value={formData.mata_pelajaran} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Pendidikan Terakhir</label>
                <input type="text" name="pendidikan_terakhir" value={formData.pendidikan_terakhir} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Tanggal Lahir</label>
                <input type="date" name="tanggal_lahir" value={formData.tanggal_lahir} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Jenis Kelamin</label>
                <select name="jenis_kelamin" value={formData.jenis_kelamin} onChange={handleChange}>
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
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
                    <img src={formData.foto} alt="Pratinjau" />
                  ) : (
                    <div>
                      <strong>Unggah Foto</strong>
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
            <h2>Daftar Guru</h2>

            <div className="activity-admin-list">
              {guru.length === 0 ? (
                <p className="empty-text">Belum ada data guru.</p>
              ) : (
                guru.map((item, index) => (
                  <div className="activity-admin-item" key={item.id}>
                    <span>{index + 1}</span>
                    <img src={item.foto || schoolLogo} alt={item.nama} />
                    <div>
                      <h4>{item.nama}</h4>
                      <p>{item.nip} • {item.mata_pelajaran || "Belum ada mapel"}</p>
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

export default AdminGuru;
