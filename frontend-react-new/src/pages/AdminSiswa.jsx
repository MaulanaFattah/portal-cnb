import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import {
  getSiswa,
  getKelas,
  createSiswa,
  updateSiswa,
  deleteSiswa,
  logout
} from "../services/api";

const emptyForm = {
  nisn: "",
  nama: "",
  kelas_id: "",
  tanggal_lahir: "",
  jenis_kelamin: "L",
  alamat: "",
  nama_ayah: "",
  no_telepon: ""
};

function classLabel(item) {
  return [item.nama_kelas, item.tingkat ? `Tingkat ${item.tingkat}` : null, item.tahun_ajaran].filter(Boolean).join(" - ");
}

function getStudentClassId(item) {
  return String(item.kelas_id || item.kelas?.id || "");
}

function toStudentFormData(item = {}) {
  return {
    nisn: item.nisn || "",
    nama: item.nama || "",
    kelas_id: item.kelas_id || item.kelas?.id || "",
    tanggal_lahir: item.tanggal_lahir || "",
    jenis_kelamin: item.jenis_kelamin || "L",
    alamat: item.alamat || "",
    nama_ayah: item.nama_ayah || item.nama_orangtua || "",
    no_telepon: item.no_telepon || ""
  };
}

function AdminSiswa() {
  const navigate = useNavigate();
  const [siswa, setSiswa] = useState([]);
  const [kelas, setKelas] = useState([]);
  const [editId, setEditId] = useState(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
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

  const resetForm = () => {
    setEditId(null);
    setFormData(emptyForm);
    setIsFormDialogOpen(false);
  };
  const openCreateDialog = () => {
    setEditId(null);
    setFormData(emptyForm);
    setCredentials(null);
    setIsFormDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCredentials(null);

    const submitData = toStudentFormData(formData);
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
    setFormData(toStudentFormData(item));
    setCredentials(null);
    setIsFormDialogOpen(true);
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
            <p>Kelola data siswa. Akun siswa dan orang tua otomatis dibuat saat siswa baru disimpan.</p>
          </div>
          <div className="dashboard-actions">
            <button type="button" onClick={openCreateDialog} className="btn primary">Tambah Data Siswa</button>
            <Link to="/" className="btn secondary">Situs web</Link>
            <button type="button" onClick={handleLogout} className="btn secondary">Keluar</button>
          </div>
        </div>

        {credentials && (
          <section className="dashboard-card credential-card">
            <h3>{credentials.orangtua?.reused ? "Akun siswa dibuat, orang tua dipakai ulang" : "Akun siswa dan orang tua otomatis dibuat"}</h3>
            <p>{credentials.orangtua?.reused ? "Akun siswa baru dibuat. Akun orang tua lama dipakai ulang karena nomor HP orang tua sama." : "Simpan kata sandi ini sekarang. Kedua akun langsung terhubung ke data siswa."}</p>
            <div className="credential-grid">
              <div><strong>Siswa</strong><span>{credentials.siswa.email}</span><code>{credentials.siswa.password}</code></div>
              <div>
                <strong>Orang Tua</strong>
                <span>{credentials.orangtua.email}</span>
                {credentials.orangtua.reused ? <span>Akun lama dipakai ulang</span> : <code>{credentials.orangtua.password}</code>}
              </div>
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

        <section className="admin-kegiatan-card student-admin-card student-admin-list-card">
          <div className="kegiatan-list-area">
            <div className="student-list-head">
              <div className="student-list-title">
                <h2>Daftar Siswa per Kelas</h2>
                <p>Pilih kelas untuk melihat dan mengelola siswa secara terpisah.</p>
              </div>
              <div className="student-list-controls">
                <select className="student-class-select" value={activeClassId} onChange={(e) => setActiveClassId(e.target.value)} aria-label="Pilih kelas siswa">
                  <option value="all">Semua Kelas</option>
                  {classTabs.map((item) => <option key={item.id} value={String(item.id)}>{item.label}</option>)}
                  {noClassCount > 0 && <option value="none">Tanpa Kelas</option>}
                </select>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama, NISN, kelas..." />
              </div>
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

                  {group.students.length === 0 ? (
                    <div className="student-empty-state">Tidak ada siswa pada kelas ini.</div>
                  ) : (
                    <div className="table-responsive student-table-wrap">
                      <table className="admin-table student-table student-directory-table">
                        <thead>
                          <tr>
                            <th>No</th>
                            <th>Nama Siswa</th>
                            <th>NIS/NISN</th>
                            <th>JK</th>
                            <th>Kelas</th>
                            <th>Orang Tua</th>
                            <th>No. HP</th>
                            <th>Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.students.map((item, index) => (
                            <tr key={item.id}>
                              <td>{index + 1}</td>
                              <td className="student-name-cell"><strong>{item.nama}</strong></td>
                              <td>{item.nisn || "-"}</td>
                              <td>{item.jenis_kelamin === "P" ? "P" : "L"}</td>
                              <td>{item.kelas?.nama_kelas || classMap.get(getStudentClassId(item))?.nama_kelas || "-"}</td>
                              <td>{item.nama_ayah || item.nama_ibu || "-"}</td>
                              <td>{item.no_telepon || "-"}</td>
                              <td>
                                <div className="admin-action compact student-table-actions">
                                  <button type="button" onClick={() => handleEdit(item)}>Ubah</button>
                                  <button type="button" onClick={() => handleDelete(item.id)}>Hapus</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              ))}
            </div>
          </div>
        </section>
        {isFormDialogOpen && (
          <div className="management-modal-backdrop student-form-modal-backdrop" role="presentation" onClick={resetForm}>
            <section className="management-modal-card student-form-modal-card" role="dialog" aria-modal="true" aria-labelledby="student-dialog-title" onClick={(event) => event.stopPropagation()}>
              <button type="button" className="management-modal-close" onClick={resetForm} aria-label="Tutup dialog data siswa">&times;</button>
              <div className="management-modal-header">
                <span>{editId ? "Ubah Data Siswa" : "Tambah Data Siswa"}</span>
                <h2 id="student-dialog-title">{editId ? "Ubah Data Siswa" : "Tambah Data Siswa"}</h2>
                <p>Isi data siswa dan orang tua. Akun siswa serta orang tua akan dibuat dan terhubung otomatis.</p>
              </div>

              <form className="student-dialog-form" onSubmit={handleSubmit}>
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

                <div className="management-modal-actions student-dialog-actions">
                  <button type="button" className="cancel-btn" onClick={resetForm}>Batal</button>
                  <button type="submit" className="save-btn">{editId ? "Simpan Perubahan" : "Simpan & Buat Akun Otomatis"}</button>
                </div>
              </form>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminSiswa;
