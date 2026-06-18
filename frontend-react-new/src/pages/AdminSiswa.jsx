import schoolLogo from "../assets/logo.jpeg";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import {
  getSiswa,
  getKelas,
  createSiswa,
  updateSiswa,
  deleteSiswa,
  logout,
  resolveMediaUrl
} from "../services/api";

const emptyForm = {
  nisn: "",
  nama: "",
  kelas_id: "",
  tanggal_lahir: "",
  jenis_kelamin: "L",
  alamat: "",
  nama_ayah: "",
  no_telepon: "",
  email: "",
  parent_email: "",
  tempat_lahir: "",
  agama: "",
  nama_ibu: "",
  foto: "",
  status: "aktif"
};

function classLabel(item) {
  return [item.nama_kelas, item.tingkat ? `Tingkat ${item.tingkat}` : null, item.tahun_ajaran].filter(Boolean).join(" - ");
}

function AdminSiswa() {
  const navigate = useNavigate();
  const [siswa, setSiswa] = useState([]);
  const [kelas, setKelas] = useState([]);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [fotoPreview, setFotoPreview] = useState("");
  const [search, setSearch] = useState("");
  const [credentials, setCredentials] = useState(null);

  const loadSiswa = async () => {
    const [result, kelasResult] = await Promise.all([getSiswa(), getKelas()]);
    if (result.success) setSiswa(result.data || []);
    if (kelasResult.success) setKelas(kelasResult.data || []);
  };

  useEffect(() => { (async () => { await loadSiswa(); })(); }, []);

  const filteredSiswa = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return siswa;
    return siswa.filter((item) => [item.nisn, item.nama, item.kelas?.nama_kelas, item.status]
      .some((value) => String(value || "").toLowerCase().includes(keyword)));
  }, [search, siswa]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFormData({ ...formData, foto: file });
    setFotoPreview(URL.createObjectURL(file));
  };

  const resetForm = () => {
    setEditId(null);
    setFormData(emptyForm);
    setFotoPreview("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCredentials(null);

    const result = editId ? await updateSiswa(editId, formData) : await createSiswa(formData);
    if (!result.success) {
      alert(result.message);
      return;
    }

    if (result.credentials) setCredentials(result.credentials);
    alert(result.message);
    resetForm();
    loadSiswa();
  };

  const handleEdit = (item) => {
    setEditId(item.id);
    setFormData({ ...emptyForm, ...item, foto: item.foto || "" });
    setFotoPreview(resolveMediaUrl(item.foto, schoolLogo));
    setCredentials(null);
  };

  const handleDelete = async (id) => {
    if (!confirm("Yakin ingin menghapus data siswa dan akun terhubung?")) return;
    const result = await deleteSiswa(id);
    alert(result.message);
    loadSiswa();
  };

  const handleLogout = () => { logout(); navigate("/admin-login"); };

  return (
    <div className="dashboard-layout">
      <AdminSidebar active="/admin/siswa" />

      <main className="dashboard-content student-admin-page">
        <div className="dashboard-header">
          <div>
            <h1>Siswa</h1>
            <p>Kelola data siswa, akun siswa, dan akun orang tua secara terpadu.</p>
          </div>
          <div className="dashboard-actions">
            <Link to="/" className="btn secondary">Website</Link>
            <button onClick={handleLogout} className="btn primary">Keluar</button>
          </div>
        </div>

        {credentials && (
          <section className="dashboard-card credential-card">
            <h3>Akun awal berhasil dibuat</h3>
            <p>Simpan password ini sekarang. Password tidak ditampilkan lagi setelah halaman berubah.</p>
            <div className="credential-grid">
              <div><strong>Siswa</strong><span>{credentials.siswa.email}</span><code>{credentials.siswa.password}</code></div>
              <div><strong>Orang Tua</strong><span>{credentials.orangtua.email}</span><code>{credentials.orangtua.password}</code></div>
            </div>
          </section>
        )}

        <section className="admin-kegiatan-card student-admin-card">
          <div className="kegiatan-form-area">
            <h2>{editId ? "Edit Data Siswa" : "Tambah Data Siswa"}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-section-title">Data Siswa</div>
              <div className="student-form-grid">
                <div className="form-group"><label>Nama Siswa</label><input name="nama" value={formData.nama} onChange={handleChange} required /></div>
                <div className="form-group"><label>NIS/NISN</label><input name="nisn" value={formData.nisn} onChange={handleChange} required /></div>
                <div className="form-group"><label>Kelas</label><select name="kelas_id" value={formData.kelas_id || ""} onChange={handleChange} required><option value="">Pilih kelas</option>{kelas.map((item) => <option key={item.id} value={item.id}>{classLabel(item)}</option>)}</select></div>
                <div className="form-group"><label>Jenis Kelamin</label><select name="jenis_kelamin" value={formData.jenis_kelamin} onChange={handleChange} required><option value="L">Laki-laki</option><option value="P">Perempuan</option></select></div>
                <div className="form-group"><label>Tanggal Lahir</label><input type="date" name="tanggal_lahir" value={formData.tanggal_lahir || ""} onChange={handleChange} required /></div>
                <div className="form-group full"><label>Alamat Siswa</label><textarea name="alamat" value={formData.alamat || ""} onChange={handleChange} rows="2" required /></div>
              </div>

              <div className="form-section-title">Data Orang Tua</div>
              <div className="student-form-grid">
                <div className="form-group"><label>Nama Orang Tua</label><input name="nama_ayah" value={formData.nama_ayah || ""} onChange={handleChange} required /></div>
                <div className="form-group"><label>Nomor HP</label><input name="no_telepon" value={formData.no_telepon || ""} onChange={handleChange} required /></div>
                <div className="form-group"><label>Email Siswa (opsional)</label><input type="email" name="email" value={formData.email || ""} onChange={handleChange} placeholder="Jika kosong, sistem membuat email portal" /></div>
                <div className="form-group"><label>Email Orang Tua (opsional)</label><input type="email" name="parent_email" value={formData.parent_email || ""} onChange={handleChange} placeholder="Jika kosong, sistem membuat email portal" /></div>
              </div>

              <details className="advanced-fields">
                <summary>Field tambahan</summary>
                <div className="student-form-grid">
                  <div className="form-group"><label>Tempat Lahir</label><input name="tempat_lahir" value={formData.tempat_lahir || ""} onChange={handleChange} /></div>
                  <div className="form-group"><label>Agama</label><input name="agama" value={formData.agama || ""} onChange={handleChange} /></div>
                  <div className="form-group"><label>Nama Ibu</label><input name="nama_ibu" value={formData.nama_ibu || ""} onChange={handleChange} /></div>
                  <div className="form-group"><label>Status</label><select name="status" value={formData.status || "aktif"} onChange={handleChange}><option value="aktif">Aktif</option><option value="lulus">Lulus</option><option value="pindah">Pindah</option><option value="keluar">Keluar</option></select></div>
                  <div className="form-group full"><label>Foto</label><label className="upload-box">{fotoPreview || formData.foto ? <img src={fotoPreview || resolveMediaUrl(formData.foto, schoolLogo)} alt="Preview" /> : <div><strong>Upload Foto</strong><span>JPG / PNG / WebP</span></div>}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImage} /></label></div>
                </div>
              </details>

              <div className="button-row">
                <button type="submit" className="save-btn">{editId ? "Simpan Perubahan" : "Simpan & Buat Akun"}</button>
                {editId && <button type="button" onClick={resetForm} className="cancel-btn">Batal</button>}
              </div>
            </form>
          </div>

          <div className="kegiatan-list-area">
            <div className="student-list-head">
              <h2>Daftar Siswa</h2>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama, NISN, kelas..." />
            </div>

            <div className="teacher-table-wrap">
              <table className="teacher-table student-table">
                <thead><tr><th>No</th><th>NIS/NISN</th><th>Nama</th><th>Kelas</th><th>Gender</th><th>Status</th><th>Aksi</th></tr></thead>
                <tbody>
                  {filteredSiswa.length === 0 ? <tr><td colSpan="7" className="teacher-empty-cell">Belum ada data siswa.</td></tr> : filteredSiswa.map((item, index) => (
                    <tr key={item.id}>
                      <td>{index + 1}</td>
                      <td>{item.nisn}</td>
                      <td>{item.nama}</td>
                      <td>{item.kelas?.nama_kelas || kelas.find((kelasItem) => Number(kelasItem.id) === Number(item.kelas_id))?.nama_kelas || "-"}</td>
                      <td>{item.jenis_kelamin === "P" ? "Perempuan" : "Laki-laki"}</td>
                      <td><span className={item.status === "aktif" ? "teacher-badge active" : "teacher-badge"}>{item.status}</span></td>
                      <td><div className="admin-action compact"><button type="button" onClick={() => handleEdit(item)}>Edit</button><button type="button" onClick={() => handleDelete(item.id)}>Hapus</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default AdminSiswa;
