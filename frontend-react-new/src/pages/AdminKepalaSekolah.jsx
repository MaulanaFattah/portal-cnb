import schoolLogo from "../assets/logo-transparent.png";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import PasswordField from "../components/PasswordField";
import {
  getKepalaSekolah,
  createKepalaSekolah,
  updateKepalaSekolah,
  deleteKepalaSekolah,
  logout
} from "../services/api";

const emptyForm = {
  nip: "",
  nama: "",
  email: "",
  no_telepon: "",
  jenjang: "sd",
  password: "",
  foto: ""
};

function getStatusLabel(status) {
  return status === "aktif" ? "Terverifikasi" : "Menunggu verifikasi";
}

function AdminKepalaSekolah() {
  const navigate = useNavigate();
  const [kepalaSekolah, setKepalaSekolah] = useState([]);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const pendingKepalaSekolah = kepalaSekolah.filter((item) => item.status !== "aktif");

  const loadKepalaSekolah = async () => {
    const result = await getKepalaSekolah();
    if (result.success) setKepalaSekolah(result.data || []);
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
    setFormData(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      nip: formData.nip,
      nama: formData.nama,
      email: formData.email,
      no_telepon: formData.no_telepon,
      jenjang: formData.jenjang,
      password: formData.password,
      foto: formData.foto,
      status: editId ? formData.status || "aktif" : "aktif"
    };

    const result = editId
      ? await updateKepalaSekolah(editId, payload)
      : await createKepalaSekolah(payload);

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
    setFormData({ ...emptyForm, ...item, foto: item.foto || "", password: "", jenjang: item.jenjang || "sd" });
  };

  const handleVerify = async (item) => {
    if (!confirm(`Verifikasi akun kepala sekolah ${item.nama}?`)) return;

    const result = await updateKepalaSekolah(item.id, { status: "aktif" });
    alert(result.message);

    if (result.success) {
      await loadKepalaSekolah();
    }
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
      <AdminSidebar active="/admin/kepala-sekolah" />

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Kepala Sekolah</h1>
            <p>Kelola data, akun, dan verifikasi kepala sekolah sesuai jenjang.</p>
          </div>

          <div className="dashboard-actions">
            <Link to="/" className="btn secondary">Situs web</Link>
            <button onClick={handleLogout} className="btn primary">Keluar</button>
          </div>
        </div>

        <section className="dashboard-card admin-stack">
          <div>
            <h3>Permintaan Verifikasi Kepala Sekolah</h3>
            <p className="empty-text">Registrasi dari halaman kepala sekolah masuk ke sini dulu. Akun baru bisa login setelah admin klik verifikasi.</p>
          </div>

          {pendingKepalaSekolah.length === 0 ? (
            <p className="empty-text">Belum ada registrasi kepala sekolah yang menunggu verifikasi.</p>
          ) : (
            pendingKepalaSekolah.map((item) => (
              <div className="verify-card" key={item.id}>
                <div className="verify-card-head">
                  <div>
                    <h4>{item.nama}</h4>
                    <p>{item.email} • Kepala Sekolah {(item.jenjang || "-").toUpperCase()}</p>
                  </div>
                  <span className="status-badge pending">Menunggu</span>
                </div>

                <div className="verify-grid">
                  <div className="verify-info">
                    <span>NIP</span>
                    <strong>{item.nip || "-"}</strong>
                  </div>
                  <div className="verify-info">
                    <span>No. Telepon</span>
                    <strong>{item.no_telepon || "-"}</strong>
                  </div>
                  <div className="verify-info full">
                    <span>Status Login</span>
                    <strong>Belum bisa masuk sebelum admin memverifikasi akun ini.</strong>
                  </div>
                </div>

                <div className="ppdb-verify-actions">
                  <button type="button" className="verify-accept" onClick={() => handleVerify(item)}>Verifikasi</button>
                  <button type="button" className="verify-pending" onClick={() => handleEdit(item)}>Ubah Data</button>
                  <button type="button" className="verify-delete" onClick={() => handleDelete(item.id)}>Hapus</button>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="admin-kegiatan-card">
          <div className="kegiatan-form-area">
            <h2>{editId ? "Ubah Data Kepala Sekolah" : "Tambah Data Kepala Sekolah"}</h2>
            <p className="empty-text">Isi data inti saja. Kepala sekolah yang ditambahkan admin otomatis aktif/terverifikasi.</p>

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
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Masukkan nama@cnb.sch.id" required />
              </div>

              <div className="form-group">
                <label>No Telepon</label>
                <input type="text" name="no_telepon" value={formData.no_telepon} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Jenjang</label>
                <select name="jenjang" value={formData.jenjang} onChange={handleChange} required>
                  <option value="sd">SD</option>
                  <option value="smp">SMP</option>
                </select>
              </div>

              <div className="form-group">
                <label>{editId ? "Password Baru (opsional)" : "Password Akun"}</label>
                <PasswordField
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={editId ? "Kosongkan jika tidak diubah" : "Minimal 6 karakter"}
                  autoComplete="new-password"
                  required={!editId}
                />
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
                      <p>{(item.jenjang || "-").toUpperCase()} • {item.email || "Email belum diisi"}</p>
                      <span className={`status-badge ${item.status === "aktif" ? "approved" : "pending"}`}>{getStatusLabel(item.status)}</span>
                    </div>
                    <div className="admin-action">
                      {item.status !== "aktif" && <button onClick={() => handleVerify(item)}>Verifikasi</button>}
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

export default AdminKepalaSekolah;
