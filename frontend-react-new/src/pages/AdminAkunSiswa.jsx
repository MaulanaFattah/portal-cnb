import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
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
    const [siswaResult, orangTuaResult] = await Promise.all([getUsersByRole("siswa"), getUsersByRole("orangtua")]);
    setUsers([...(siswaResult.data || []), ...(orangTuaResult.data || [])]);
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
    if (!confirm("Yakin ingin menghapus akun ini?")) return;
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
      <AdminSidebar active="/admin/akun-siswa" />

<main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Akun Siswa & Orang Tua</h1>
            <p>Kelola akun login siswa dan orang tua dari dashboard admin.</p>
          </div>

          <div className="dashboard-actions">
            <Link to="/" className="btn secondary">Website</Link>
            <button onClick={handleLogout} className="btn primary">Logout</button>
          </div>
        </div>

        <section className="admin-kegiatan-card">
          <div className="kegiatan-form-area">
            <h2>{editId ? "Edit Akun" : "Tambah Akun"}</h2>

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

              <div className="form-group">
                <label>Jenis Akun</label>
                <select name="role" value={formData.role} onChange={handleChange}>
                  <option value="siswa">Siswa</option>
                  <option value="orangtua">Orang Tua</option>
                </select>
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
            <h2>Daftar Akun Siswa & Orang Tua</h2>

            <div className="activity-admin-list">
              {users.length === 0 ? (
                <p className="empty-text">Belum ada akun siswa/orang tua.</p>
              ) : (
                users.map((item, index) => (
                  <div className="activity-admin-item" key={item.id}>
                    <span>{index + 1}</span>
                    <div>
                      <h4>{item.name}</h4>
                      <p>{item.email} • {item.role === "orangtua" ? "Orang Tua" : "Siswa"}</p>
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
