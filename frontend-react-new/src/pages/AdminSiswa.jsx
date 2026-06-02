import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getSiswa,
  createSiswa,
  updateSiswa,
  deleteSiswa,
  logout
} from "../services/api";

function AdminSiswa() {
  const navigate = useNavigate();
  const [siswa, setSiswa] = useState([]);
  const [editId, setEditId] = useState(null);

  const [formData, setFormData] = useState({
    nisn: "",
    nama: "",
    kelas_id: "",
    tempat_lahir: "",
    tanggal_lahir: "",
    jenis_kelamin: "L",
    agama: "",
    alamat: "",
    nama_ayah: "",
    nama_ibu: "",
    no_telepon: "",
    email: "",
    foto: "",
    status: "aktif"
  });

  const loadSiswa = async () => {
    const result = await getSiswa();
    if (result.success) setSiswa(result.data);
  };

  useEffect(() => {
    (async () => {
      await loadSiswa();
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
      nisn: "",
      nama: "",
      kelas_id: "",
      tempat_lahir: "",
      tanggal_lahir: "",
      jenis_kelamin: "L",
      agama: "",
      alamat: "",
      nama_ayah: "",
      nama_ibu: "",
      no_telepon: "",
      email: "",
      foto: "",
      status: "aktif"
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const result = editId
      ? await updateSiswa(editId, formData)
      : await createSiswa(formData);

    if (!result.success) {
      alert(result.message);
      return;
    }

    alert(result.message);
    resetForm();
    loadSiswa();
  };

  const handleEdit = (item) => {
    setEditId(item.id);
    setFormData({ ...item, foto: item.foto || "" });
  };

  const handleDelete = async (id) => {
    if (!confirm("Yakin ingin menghapus data siswa ini?")) return;
    const result = await deleteSiswa(id);
    alert(result.message);
    loadSiswa();
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
          <Link className="active" to="/admin/siswa">Siswa</Link>
          <Link to="/admin/akun-siswa">Akun Siswa</Link>
          <Link to="/admin/profil-sekolah">Profil Sekolah</Link>
        </nav>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Siswa</h1>
            <p>Kelola data siswa.</p>
          </div>

          <div className="dashboard-actions">
            <Link to="/" className="btn secondary">Website</Link>
            <button onClick={handleLogout} className="btn primary">Logout</button>
          </div>
        </div>

        <section className="admin-kegiatan-card">
          <div className="kegiatan-form-area">
            <h2>{editId ? "Edit Data Siswa" : "Tambah Data Siswa"}</h2>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>NISN</label>
                <input type="text" name="nisn" value={formData.nisn} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label>Nama</label>
                <input type="text" name="nama" value={formData.nama} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label>Kelas ID</label>
                <input type="number" name="kelas_id" value={formData.kelas_id} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Tempat Lahir</label>
                <input type="text" name="tempat_lahir" value={formData.tempat_lahir} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Tanggal Lahir</label>
                <input type="date" name="tanggal_lahir" value={formData.tanggal_lahir} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Jenis Kelamin</label>
                <select name="jenis_kelamin" value={formData.jenis_kelamin} onChange={handleChange} required>
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>

              <div className="form-group">
                <label>Agama</label>
                <input type="text" name="agama" value={formData.agama} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Alamat</label>
                <textarea name="alamat" value={formData.alamat} onChange={handleChange} rows="2" />
              </div>

              <div className="form-group">
                <label>Nama Ayah</label>
                <input type="text" name="nama_ayah" value={formData.nama_ayah} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Nama Ibu</label>
                <input type="text" name="nama_ibu" value={formData.nama_ibu} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>No Telepon</label>
                <input type="text" name="no_telepon" value={formData.no_telepon} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Status</label>
                <select name="status" value={formData.status} onChange={handleChange}>
                  <option value="aktif">Aktif</option>
                  <option value="lulus">Lulus</option>
                  <option value="pindah">Pindah</option>
                  <option value="keluar">Keluar</option>
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
            <h2>Daftar Siswa</h2>

            <div className="activity-admin-list">
              {siswa.length === 0 ? (
                <p className="empty-text">Belum ada data siswa.</p>
              ) : (
                siswa.map((item, index) => (
                  <div className="activity-admin-item" key={item.id}>
                    <span>{index + 1}</span>
                    <img src={item.foto || "/logo.svg"} alt={item.nama} />
                    <div>
                      <h4>{item.nama}</h4>
                      <p>{item.nisn} • {item.status}</p>
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

export default AdminSiswa;
