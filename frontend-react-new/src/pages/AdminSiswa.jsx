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
  tempat_lahir: "",
  agama: "",
  nama_ibu: "",
  foto: "",
  status: "aktif"
};

function classLabel(item) {
  return [item.nama_kelas, item.tingkat ? `Tingkat ${item.tingkat}` : null, item.tahun_ajaran].filter(Boolean).join(" - ");
}

function getStudentClassId(item) {
  return String(item.kelas_id || item.kelas?.id || "");
}

function AdminSiswa() {
  const navigate = useNavigate();
  const [siswa, setSiswa] = useState([]);
  const [kelas, setKelas] = useState([]);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [fotoPreview, setFotoPreview] = useState("");
  const [search, setSearch] = useState("");
  const [activeClassId, setActiveClassId] = useState("all");
  const [credentials, setCredentials] = useState(null);

  const loadSiswa = async () => {
    const [result, kelasResult] = await Promise.all([getSiswa(), getKelas()]);
    if (result.success) setSiswa(result.data || []);
    if (kelasResult.success) setKelas(kelasResult.data || []);
  };

  useEffect(() => { (async () => { await loadSiswa(); })(); }, []);

  const classMap = useMemo(() => new Map(kelas.map((item) => [String(item.id), item])), [kelas]);

  const studentClassCounts = useMemo(() => {
    const counts = new Map();
    siswa.forEach((item) => {
      const key = getStudentClassId(item) || "none";
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [siswa]);

  const classTabs = useMemo(() => kelas.map((item) => ({
    ...item,
    label: classLabel(item) || item.nama_kelas || "Kelas tanpa nama",
    count: studentClassCounts.get(String(item.id)) || 0
  })), [kelas, studentClassCounts]);

  const noClassCount = studentClassCounts.get("none") || 0;

  const filteredSiswa = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return siswa.filter((item) => {
      const itemClassId = getStudentClassId(item);
      const matchesClass = activeClassId === "all" || (activeClassId === "none" ? !itemClassId : itemClassId === String(activeClassId));
      const classItem = item.kelas || classMap.get(itemClassId);
      const matchesKeyword = !keyword || [item.nisn, item.nama, classLabel(classItem || {}), item.status]
        .some((value) => String(value || "").toLowerCase().includes(keyword));
      return matchesClass && matchesKeyword;
    });
  }, [activeClassId, classMap, search, siswa]);

  const groupedSiswa = useMemo(() => {
    const groupsByClass = new Map();
    filteredSiswa.forEach((item) => {
      const key = getStudentClassId(item) || "none";
      if (!groupsByClass.has(key)) groupsByClass.set(key, []);
      groupsByClass.get(key).push(item);
    });

    const makeGroup = (key, students) => {
      const firstStudent = students[0];
      const kelasItem = key === "none" ? null : classMap.get(key) || firstStudent?.kelas;
      return {
        key,
        title: key === "none" ? "Tanpa Kelas" : classLabel(kelasItem || {}) || "Kelas tidak ditemukan",
        students
      };
    };

    if (activeClassId !== "all") {
      const key = String(activeClassId);
      return [makeGroup(key, groupsByClass.get(key) || [])];
    }

    const orderedGroups = kelas
      .map((item) => makeGroup(String(item.id), groupsByClass.get(String(item.id)) || []))
      .filter((group) => group.students.length > 0);

    groupsByClass.forEach((students, key) => {
      if (key !== "none" && !classMap.has(key)) orderedGroups.push(makeGroup(key, students));
    });

    if (groupsByClass.has("none")) orderedGroups.push(makeGroup("none", groupsByClass.get("none")));
    return orderedGroups;
  }, [activeClassId, classMap, filteredSiswa, kelas]);

  const summaryItems = useMemo(() => ([
    { label: "Total Siswa", value: siswa.length },
    { label: "Jumlah Kelas", value: kelas.length },
    { label: "Hasil Filter", value: filteredSiswa.length },
    { label: "Tanpa Kelas", value: noClassCount }
  ]), [filteredSiswa.length, kelas.length, noClassCount, siswa.length]);

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

    const submitData = { ...formData };
    delete submitData.email;
    delete submitData.parent_email;
    const result = editId ? await updateSiswa(editId, submitData) : await createSiswa(submitData);
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
            <Link to="/" className="btn secondary">Situs web</Link>
            <button onClick={handleLogout} className="btn primary">Keluar</button>
          </div>
        </div>

        {credentials && (
          <section className="dashboard-card credential-card">
            <h3>Akun awal berhasil dibuat</h3>
            <p>Simpan kata sandi ini sekarang. Kata sandi tidak ditampilkan lagi setelah halaman berubah.</p>
            <div className="credential-grid">
              <div><strong>Siswa</strong><span>{credentials.siswa.email}</span><code>{credentials.siswa.password}</code></div>
              <div><strong>Orang Tua</strong><span>{credentials.orangtua.email}</span><code>{credentials.orangtua.password}</code></div>
            </div>
          </section>
        )}

        <section className="student-summary-grid" aria-label="Ringkasan data siswa">
          {summaryItems.map((item) => (
            <div className="student-summary-card" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </section>

        <section className="admin-kegiatan-card student-admin-card">
          <div className="kegiatan-form-area">
            <h2>{editId ? "Ubah Data Siswa" : "Tambah Data Siswa"}</h2>
            <p className="form-helper-text">Isi data utama siswa dan orang tua. Field tambahan tetap opsional agar proses input lebih cepat.</p>
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
              </div>

              <details className="advanced-fields">
                <summary>Field tambahan</summary>
                <div className="student-form-grid">
                  <div className="form-group"><label>Tempat Lahir <span className="field-optional">opsional</span></label><input name="tempat_lahir" value={formData.tempat_lahir || ""} onChange={handleChange} /></div>
                  <div className="form-group"><label>Agama <span className="field-optional">opsional</span></label><input name="agama" value={formData.agama || ""} onChange={handleChange} /></div>
                  <div className="form-group"><label>Nama Ibu <span className="field-optional">opsional</span></label><input name="nama_ibu" value={formData.nama_ibu || ""} onChange={handleChange} /></div>
                  <div className="form-group"><label>Status <span className="field-optional">opsional</span></label><select name="status" value={formData.status || "aktif"} onChange={handleChange}><option value="aktif">Aktif</option><option value="lulus">Lulus</option><option value="pindah">Pindah</option><option value="keluar">Keluar</option></select></div>
                  <div className="form-group full"><label>Foto <span className="field-optional">opsional</span></label><label className="upload-box">{fotoPreview || formData.foto ? <img src={fotoPreview || resolveMediaUrl(formData.foto, schoolLogo)} alt="Pratinjau" /> : <div><strong>Unggah Foto</strong><span>JPG / PNG / WebP</span></div>}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImage} /></label></div>
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
              <div className="student-list-title">
                <h2>Daftar Siswa per Kelas</h2>
                <p>Pilih kelas untuk melihat dan mengelola siswa secara terpisah.</p>
              </div>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama, NISN, kelas..." />
            </div>

            <div className="student-class-tabs" role="tablist" aria-label="Filter kelas siswa">
              <button type="button" role="tab" aria-selected={activeClassId === "all"} className={activeClassId === "all" ? "student-class-tab active" : "student-class-tab"} onClick={() => setActiveClassId("all")}><span>Semua Kelas</span><strong>{siswa.length}</strong></button>
              {classTabs.map((item) => (
                <button type="button" role="tab" aria-selected={activeClassId === String(item.id)} key={item.id} className={activeClassId === String(item.id) ? "student-class-tab active" : "student-class-tab"} onClick={() => setActiveClassId(String(item.id))}><span>{item.label}</span><strong>{item.count}</strong></button>
              ))}
              {noClassCount > 0 && <button type="button" role="tab" aria-selected={activeClassId === "none"} className={activeClassId === "none" ? "student-class-tab active" : "student-class-tab"} onClick={() => setActiveClassId("none")}><span>Tanpa Kelas</span><strong>{noClassCount}</strong></button>}
            </div>

            <div className="student-class-groups">
              {groupedSiswa.length === 0 ? (
                <div className="student-empty-state">
                  <strong>Belum ada data siswa.</strong>
                  <span>Tambahkan siswa baru atau ubah kata kunci pencarian.</span>
                </div>
              ) : groupedSiswa.map((group) => (
                <section className="student-class-group" key={group.key}>
                  <div className="student-class-group-header">
                    <div>
                      <h3>{group.title}</h3>
                      <p>{group.students.length ? "Data siswa pada kelas ini." : "Tidak ada siswa sesuai filter saat ini."}</p>
                    </div>
                    <span className="student-class-count">{group.students.length} siswa</span>
                  </div>

                  <div className="teacher-table-wrap student-table-wrap">
                    <table className="teacher-table student-table">
                      <thead><tr><th>No</th><th>Siswa</th><th>Kelas</th><th>Orang Tua / HP</th><th>Status</th><th>Aksi</th></tr></thead>
                      <tbody>
                        {group.students.length === 0 ? <tr><td colSpan="6" className="teacher-empty-cell">Tidak ada siswa pada kelas ini.</td></tr> : group.students.map((item, index) => (
                          <tr key={item.id}>
                            <td>{index + 1}</td>
                            <td><div className="student-name-cell"><strong>{item.nama}</strong><span>NIS/NISN: {item.nisn || "-"}</span><span>{item.jenis_kelamin === "P" ? "Perempuan" : "Laki-laki"}</span></div></td>
                            <td><span className="student-class-chip">{item.kelas?.nama_kelas || classMap.get(getStudentClassId(item))?.nama_kelas || "-"}</span></td>
                            <td><div className="student-name-cell"><strong>{item.nama_ayah || item.nama_ibu || "-"}</strong><span>{item.no_telepon || "No. HP belum diisi"}</span></div></td>
                            <td><span className={item.status === "aktif" ? "teacher-badge active" : "teacher-badge"}>{item.status}</span></td>
                            <td><div className="admin-action compact"><button type="button" onClick={() => handleEdit(item)}>Ubah</button><button type="button" onClick={() => handleDelete(item.id)}>Hapus</button></div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default AdminSiswa;
