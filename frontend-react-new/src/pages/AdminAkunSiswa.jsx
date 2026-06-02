import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getUsersByRole,
  createUser,
  updateUser,
  deleteUser,
  logout
} from "../services/api";

function AdminAkunSiswa() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [editId, setEditId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "siswa"
  });

  const loadUsers = async () => {
    const result = await getUsersByRole("siswa");
    if (result.success) setUsers(result.data || []);
  };

  useEffect(() => {
    (async () => {
      await loadUsers();
    })();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setEditId(null);
    setFormData({ name: "", email: "", password: "", role: "siswa" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const result = editId
      ? await updateUser(editId, formData)
      : await createUser(formData);

    alert(result.message);

    if (result.success) {
      resetForm();
      loadUsers();
    }
  };

  const handleEdit = (item) => {
    setEditId(item.id);
    setFormData({ name: item.name, email: item.email, password: "", role: item.role });
  };

  const handleDelete = async (id) => {
    if (!confirm("Yakin ingin menghapus akun siswa ini?")) return;
    const result = await deleteUser(id);
    alert(result.message);
    loadUsers();
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
          <Link className="active" to="/admin/akun-siswa">Akun Siswa</Link>
          <Link to="/admin/profil-sekolah">Profil Sekolah</Link>
        </nav>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Akun Siswa</h1>
            <p>Kelola akun login siswa.</p>
          </div>

          <div className="dashboard-actions">
            <Link to="/" className="btn secondary">Website</Link>
            <button onClick={handleLogout} className="btn primary">Logout</button>
          </div>
        </div>

        <section className="admin-kegiatan-card">
          <div className="kegiatan-form-area">
            <h2>{editId ? "Edit Akun Siswa" : "Tambah Akun Siswa"}</h2>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nama</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Password {editId && "(kosongkan jika tidak diubah)"}</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required={!editId}
                />
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
            <h2>Daftar Akun Siswa</h2>

            <div className="activity-admin-list">
              {users.length === 0 ? (
                <p className="empty-text">Belum ada akun siswa.</p>
              ) : (
                users.map((item, index) => (
                  <div className="activity-admin-item" key={item.id}>
                    <span>{index + 1}</span>
                    <div>
                      <h4>{item.name}</h4>
                      <p>{item.email}</p>
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

export default AdminAkunSiswa;
