import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import {
  getUsersByRole,
  getSiswa,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  logout
} from "../services/api";

const roleLabels = {
  siswa: "Siswa",
  orangtua: "Orang Tua",
  kepala_sekolah: "Kepala Sekolah"
};

function getAccountClassName(item) {
  return item.siswa?.kelas?.nama_kelas || "Belum terhubung kelas";
}

function getAccountClassId(item) {
  return String(item.siswa?.kelas?.id || item.siswa?.kelas_id || "");
}

function getLinkedStudentName(item) {
  return item.siswa?.nama || "Belum terhubung siswa";
}

function getParentName(item) {
  if (item.role === "orangtua") return item.name;
  return item.siswa?.nama_ayah || item.siswa?.nama_ibu || "Belum ada data orang tua";
}

function AdminAkunSiswa() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [siswaList, setSiswaList] = useState([]);
  const [editId, setEditId] = useState(null);
  const [resetCredential, setResetCredential] = useState(null);
  const [activeClassId, setActiveClassId] = useState("all");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "siswa",
    siswa_id: "",
    profession: ""
  });

  const loadUsers = async () => {
    const [siswaResult, orangTuaResult, kepalaResult, studentResult] = await Promise.all([
      getUsersByRole("siswa"),
      getUsersByRole("orangtua"),
      getUsersByRole("kepala_sekolah"),
      getSiswa()
    ]);
    setUsers([...(siswaResult.data || []), ...(orangTuaResult.data || []), ...(kepalaResult.data || [])]);
    if (studentResult.success) setSiswaList(studentResult.data || []);
  };

  useEffect(() => {
    (async () => {
      await loadUsers();
    })();
  }, []);

  const accountClassOptions = useMemo(() => {
    const classMap = new Map();
    siswaList.forEach((siswa) => {
      const id = String(siswa.kelas?.id || siswa.kelas_id || "");
      if (id) classMap.set(id, siswa.kelas?.nama_kelas || `Kelas ${id}`);
    });
    return [...classMap.entries()].map(([id, name]) => ({ id, name }));
  }, [siswaList]);

  const filteredUsers = useMemo(() => users.filter((item) => (
    activeClassId === "all" || getAccountClassId(item) === activeClassId
  )), [activeClassId, users]);

  const sortedUsers = useMemo(() => [...filteredUsers].sort((a, b) => {
    const classCompare = getAccountClassName(a).localeCompare(getAccountClassName(b), "id-ID");
    if (classCompare !== 0) return classCompare;
    return (a.name || "").localeCompare(b.name || "", "id-ID");
  }), [filteredUsers]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setEditId(null);
    setFormData({ name: "", email: "", password: "", role: "siswa", siswa_id: "", profession: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (["siswa", "orangtua"].includes(formData.role) && !formData.siswa_id) {
      alert("Pilih siswa yang akan dihubungkan dengan akun ini.");
      return;
    }

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
    setFormData({
      name: item.name,
      email: item.email,
      password: "",
      role: item.role,
      siswa_id: item.portalLink?.siswa_id || "",
      profession: item.profession || ""
    });
  };

  const handleDelete = async (id) => {
    if (!confirm("Yakin ingin menghapus akun ini?")) return;
    const result = await deleteUser(id);
    alert(result.message);
    loadUsers();
  };

  const handleResetPassword = async (item) => {
    const customPassword = prompt("Masukkan kata sandi baru, atau kosongkan untuk dibuat otomatis:");
    if (customPassword === null) return;
    const result = await resetUserPassword(item.id, customPassword ? { password: customPassword } : {});
    alert(result.message);
    if (result.success && result.data?.generated_password) {
      setResetCredential({ email: item.email, password: result.data.generated_password });
    }
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
            <p>Kelola akun masuk siswa dan orang tua dari dasbor administrator.</p>
          </div>

          <div className="dashboard-actions">
            <Link to="/" className="btn secondary">Situs web</Link>
            <button onClick={handleLogout} className="btn primary">Keluar</button>
          </div>
        </div>

        {resetCredential && (
          <section className="dashboard-card credential-card">
            <h3>Kata sandi baru berhasil dibuat</h3>
            <p>Simpan kata sandi ini sekarang dan berikan ke pemilik akun.</p>
            <div className="credential-grid"><div><strong>{resetCredential.email}</strong><code>{resetCredential.password}</code></div></div>
          </section>
        )}

        <section className="admin-kegiatan-card portal-account-admin-card">
          <div className="kegiatan-form-area">
            <h2>{editId ? "Ubah Akun Portal" : "Tambah Akun Portal"}</h2>

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
                <label>Kata Sandi {editId && "(kosongkan jika tidak diubah)"}</label>
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
                  <option value="kepala_sekolah">Kepala Sekolah</option>
                </select>
              </div>

              {["siswa", "orangtua"].includes(formData.role) && (
                <div className="form-group">
                  <label>Hubungkan ke Siswa</label>
                  <select name="siswa_id" value={formData.siswa_id} onChange={handleChange} required>
                    <option value="">Pilih siswa berdasarkan kelas dan orang tua</option>
                    {siswaList.map((siswa) => (
                      <option key={siswa.id} value={siswa.id}>
                        {siswa.nama} • {siswa.kelas?.nama_kelas || "Kelas -"} • Orang tua: {siswa.nama_ayah || siswa.nama_ibu || "-"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.role === "kepala_sekolah" && (
                <div className="form-group">
                  <label>Keterangan Jabatan</label>
                  <input name="profession" value={formData.profession} onChange={handleChange} placeholder="Contoh: Kepala Sekolah" />
                </div>
              )}

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
            <div className="student-list-head portal-account-list-head">
              <div className="student-list-title">
                <h2>Daftar Akun Portal</h2>
                <p>Filter berdasarkan kelas agar relasi siswa, orang tua, dan kelas lebih mudah dicek.</p>
              </div>
              <select className="student-class-select" value={activeClassId} onChange={(e) => setActiveClassId(e.target.value)} aria-label="Filter akun berdasarkan kelas">
                <option value="all">Semua Kelas</option>
                {accountClassOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>

            <div className="activity-admin-list">
              {sortedUsers.length === 0 ? (
                <p className="empty-text">Belum ada akun siswa/orang tua.</p>
              ) : (
                sortedUsers.map((item, index) => (
                  <div className="activity-admin-item portal-account-admin-item" key={item.id}>
                    <span>{index + 1}</span>
                    <div className="portal-account-info">
                      <div className="portal-account-title-row">
                        <h4>{item.name}</h4>
                        <span className={`portal-role-pill ${item.role}`}>{roleLabels[item.role] || item.role}</span>
                      </div>
                      <p>{item.email}</p>
                      <div className="portal-relation-grid">
                        <span><strong>Siswa</strong>{getLinkedStudentName(item)}</span>
                        <span><strong>Orang Tua</strong>{getParentName(item)}</span>
                        <span><strong>Kelas</strong>{getAccountClassName(item)}</span>
                      </div>
                    </div>
                    <div className="admin-action">
                      <button onClick={() => handleEdit(item)}>Ubah</button>
                      <button onClick={() => handleResetPassword(item)}>Atur Ulang</button>
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

export default AdminAkunSiswa;
