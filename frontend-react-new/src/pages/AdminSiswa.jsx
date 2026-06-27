import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import {
  getSiswa,
  getKelas,
  createSiswa,
  updateSiswa,
  deleteSiswa,
  promoteSiswa,
  getArsipKelas,
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

/**
 * Membuat label kelas yang mudah dibaca dari objek kelas.
 *
 * Parameter: item - objek kelas ({ nama_kelas, tingkat, tahun_ajaran }).
 * Mengembalikan: string gabungan, mis. "VI A - Tingkat 6 - 2024/2025".
 */
function classLabel(item) {
  return [item.nama_kelas, item.tingkat ? `Tingkat ${item.tingkat}` : null, item.tahun_ajaran].filter(Boolean).join(" - ");
}

/**
 * Mengambil id kelas seorang siswa sebagai string.
 *
 * Parameter: item - objek siswa.
 * Mengembalikan: id kelas (dari kelas_id atau kelas.id) dalam bentuk string,
 * atau string kosong bila tidak ada.
 */
function getStudentClassId(item) {
  return String(item.kelas_id || item.kelas?.id || "");
}

/**
 * Mengubah objek siswa menjadi struktur data form yang konsisten.
 *
 * Parameter: item - objek siswa (boleh sebagian).
 * Mengembalikan: objek form siswa dengan field standar dan nilai default
 * (mis. jenis_kelamin "L") agar aman dipakai sebagai controlled form.
 */
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

/**
 * Halaman Admin Siswa.
 *
 * Halaman ini dipakai admin untuk mengelola data siswa per kelas: menambah,
 * mengubah, dan menghapus siswa (akun siswa & orang tua otomatis dibuat saat
 * siswa baru disimpan). Tersedia pula filter/pencarian per kelas, proses Naik
 * Kelas (promosi massal), dan melihat Arsip Kelas (riwayat perpindahan).
 *
 * Peran/akses: hanya admin (area dashboard admin, butuh sesi login admin).
 */
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

  // Naik Kelas (item 3)
  const [isPromoteOpen, setIsPromoteOpen] = useState(false);
  const [promoteForm, setPromoteForm] = useState({ tahun_ajaran: "", kelas_tujuan_id: "" });
  const [promoteSelected, setPromoteSelected] = useState([]);
  const [promoteFilterClass, setPromoteFilterClass] = useState("all");
  const [promoteSearch, setPromoteSearch] = useState("");
  const [savingPromote, setSavingPromote] = useState(false);

  // Arsip Kelas (item 5)
  const [isArsipOpen, setIsArsipOpen] = useState(false);
  const [arsip, setArsip] = useState([]);
  const [arsipLoading, setArsipLoading] = useState(false);

  /**
   * Memuat data siswa dan kelas dari server secara paralel.
   * Efek: memanggil API getSiswa() dan getKelas(); mengisi state siswa dan
   * kelas bila masing-masing sukses.
   */
  const loadSiswa = async () => {
    const [result, kelasResult] = await Promise.all([getSiswa(), getKelas()]);
    if (result.success) setSiswa(result.data || []);
    if (kelasResult.success) setKelas(kelasResult.data || []);
  };

  // Memuat data siswa & kelas sekali saat komponen dipasang.
  useEffect(() => { (async () => { await loadSiswa(); })(); }, []);

  // Peta cepat id kelas -> objek kelas, untuk pencarian kelas yang efisien.
  const classMap = useMemo(() => new Map(kelas.map((item) => [String(item.id), item])), [kelas]);

  // Menghitung jumlah siswa per id kelas (key "none" untuk siswa tanpa kelas).
  const studentClassCounts = useMemo(() => {
    const counts = new Map();
    siswa.forEach((item) => {
      const key = getStudentClassId(item) || "none";
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [siswa]);

  // Daftar tab/opsi kelas beserta label dan jumlah siswanya.
  const classTabs = useMemo(() => kelas.map((item) => ({
    ...item,
    label: classLabel(item) || item.nama_kelas || "Kelas tanpa nama",
    count: studentClassCounts.get(String(item.id)) || 0
  })), [kelas, studentClassCounts]);

  // Jumlah siswa yang belum memiliki kelas.
  const noClassCount = studentClassCounts.get("none") || 0;

  // Daftar siswa hasil filter berdasarkan kelas aktif dan kata kunci pencarian.
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

  // Mengelompokkan siswa hasil filter ke dalam grup per kelas (terurut sesuai
  // urutan kelas, lalu kelas tak dikenal, dan terakhir grup "Tanpa Kelas").
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

  // Angka ringkasan (kartu statistik): total siswa, jumlah kelas, hasil filter,
  // dan jumlah siswa tanpa kelas.
  const summaryItems = useMemo(() => ([
    { label: "Total Siswa", value: siswa.length },
    { label: "Jumlah Kelas", value: kelas.length },
    { label: "Hasil Filter", value: filteredSiswa.length },
    { label: "Tanpa Kelas", value: noClassCount }
  ]), [filteredSiswa.length, kelas.length, noClassCount, siswa.length]);

  /**
   * Menangani perubahan input pada form siswa.
   * Parameter: e - event input (memakai name & value).
   * Efek: memperbarui field terkait pada formData.
   */
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  /**
   * Mengembalikan form ke kondisi kosong dan menutup dialog (mode tambah).
   * Efek: mereset editId & formData, lalu menutup dialog form siswa.
   */
  const resetForm = () => {
    setEditId(null);
    setFormData(emptyForm);
    setIsFormDialogOpen(false);
  };
  /**
   * Membuka dialog tambah siswa baru (mode buat).
   * Efek: mereset editId, formData, dan kredensial; menampilkan dialog form.
   */
  const openCreateDialog = () => {
    setEditId(null);
    setFormData(emptyForm);
    setCredentials(null);
    setIsFormDialogOpen(true);
  };

  /**
   * Menyimpan data siswa (tambah baru atau perbarui).
   * Parameter: e - event submit form (dicegah reload-nya).
   * Efek: memanggil API updateSiswa (bila editId) atau createSiswa; bila gagal
   * menampilkan alert dan berhenti; bila sukses menyimpan kredensial akun (bila
   * ada), alert, mereset form, dan memuat ulang data. Mengubah state credentials.
   */
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

  /**
   * Membuka dialog ubah data siswa (mode edit).
   * Parameter: item - objek siswa yang akan diedit.
   * Efek: mengeset editId, mengisi formData dari data siswa, mereset kredensial,
   * dan menampilkan dialog.
   */
  const handleEdit = (item) => {
    setEditId(item.id);
    setFormData(toStudentFormData(item));
    setCredentials(null);
    setIsFormDialogOpen(true);
  };

  /**
   * Menghapus data siswa setelah konfirmasi.
   * Parameter: id - id siswa.
   * Efek: konfirmasi (akun terhubung ikut terhapus); memanggil API deleteSiswa;
   * alert; memuat ulang data.
   */
  const handleDelete = async (id) => {
    if (!confirm("Yakin ingin menghapus data siswa dan akun terhubung?")) return;
    const result = await deleteSiswa(id);
    alert(result.message);
    loadSiswa();
  };

  /**
   * Keluar dari sesi admin.
   * Efek: memanggil logout() lalu mengarahkan ke halaman login admin.
   */
  const handleLogout = () => { logout(); navigate("/admin-login"); };

  // ===== Naik Kelas handlers =====
  // Daftar siswa kandidat naik/pindah kelas, difilter berdasarkan kelas asal
  // dan kata kunci pencarian.
  const promoteStudents = useMemo(() => {
    const keyword = promoteSearch.trim().toLowerCase();
    return siswa.filter((item) => {
      const itemClassId = getStudentClassId(item);
      const matchesClass = promoteFilterClass === "all"
        ? true
        : (promoteFilterClass === "none" ? !itemClassId : itemClassId === String(promoteFilterClass));
      const matchesKeyword = !keyword || [item.nama, item.nisn].some((value) => String(value || "").toLowerCase().includes(keyword));
      return matchesClass && matchesKeyword;
    });
  }, [siswa, promoteFilterClass, promoteSearch]);

  /**
   * Membuka dialog Naik Kelas dan mereset seluruh state terkait.
   * Efek: mengosongkan form promosi, daftar terpilih, filter, dan pencarian,
   * lalu menampilkan dialog.
   */
  const openPromoteDialog = () => {
    setPromoteForm({ tahun_ajaran: "", kelas_tujuan_id: "" });
    setPromoteSelected([]);
    setPromoteFilterClass("all");
    setPromoteSearch("");
    setIsPromoteOpen(true);
  };

  /**
   * Mencentang/membatalkan satu siswa pada daftar promosi.
   * Parameter: id - id siswa.
   * Efek: menambah/menghapus id dari state promoteSelected.
   */
  const togglePromoteStudent = (id) => {
    setPromoteSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  };

  /**
   * Memilih/membatalkan semua siswa yang sedang tampil (sesuai filter).
   * Efek: bila semua sudah terpilih maka dilepas, jika belum maka ditambahkan
   * ke promoteSelected.
   */
  const toggleSelectAllPromote = () => {
    const visibleIds = promoteStudents.map((item) => item.id);
    const allSelected = visibleIds.every((id) => promoteSelected.includes(id));
    if (allSelected) {
      setPromoteSelected((current) => current.filter((id) => !visibleIds.includes(id)));
    } else {
      setPromoteSelected((current) => [...new Set([...current, ...visibleIds])]);
    }
  };

  /**
   * Menyimpan proses Naik Kelas untuk siswa yang dicentang.
   * Parameter: e - event submit form (dicegah reload-nya).
   * Efek: validasi kelas tujuan & minimal satu siswa; memanggil API
   * promoteSiswa dengan kelas tujuan, tahun ajaran, dan daftar id siswa; alert;
   * bila sukses menutup dialog dan memuat ulang data. Mengubah state savingPromote.
   */
  const handlePromoteSubmit = async (e) => {
    e.preventDefault();
    if (!promoteForm.kelas_tujuan_id) {
      alert("Pilih kelas tujuan terlebih dahulu.");
      return;
    }
    if (promoteSelected.length === 0) {
      alert("Centang minimal satu siswa yang akan naik/pindah kelas.");
      return;
    }

    setSavingPromote(true);
    const result = await promoteSiswa({
      kelas_tujuan_id: promoteForm.kelas_tujuan_id,
      tahun_ajaran: promoteForm.tahun_ajaran,
      siswa_ids: promoteSelected
    });
    setSavingPromote(false);

    alert(result.message);
    if (result.success) {
      setIsPromoteOpen(false);
      loadSiswa();
    }
  };

  // ===== Arsip Kelas handlers =====
  /**
   * Membuka dialog Arsip Kelas dan memuat datanya dari server.
   * Efek: menampilkan dialog; mengubah state arsipLoading; memanggil API
   * getArsipKelas(); mengisi state arsip bila sukses atau alert bila gagal.
   */
  const openArsipDialog = async () => {
    setIsArsipOpen(true);
    setArsipLoading(true);
    const result = await getArsipKelas();
    setArsipLoading(false);
    if (result.success) setArsip(result.data || []);
    else alert(result.message);
  };

  /**
   * Memformat tanggal ke format lokal Indonesia.
   * Parameter: value - tanggal (string/Date).
   * Mengembalikan: teks tanggal "dd Mon yyyy" atau "-" bila kosong.
   */
  const formatTanggal = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  };

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
            <button type="button" onClick={openPromoteDialog} className="btn primary">Naik Kelas</button>
            <button type="button" onClick={openArsipDialog} className="btn secondary">Arsip Kelas</button>
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
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama, NIS, kelas..." />
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
                            <th>NIS</th>
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
                  <div className="form-group"><label>NIS</label><input name="nisn" value={formData.nisn} onChange={handleChange} required /></div>
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

        {isPromoteOpen && (
          <div className="management-modal-backdrop student-form-modal-backdrop" role="presentation" onClick={() => setIsPromoteOpen(false)}>
            <section className="management-modal-card student-form-modal-card promote-modal-card" role="dialog" aria-modal="true" aria-labelledby="promote-dialog-title" onClick={(event) => event.stopPropagation()}>
              <button type="button" className="management-modal-close" onClick={() => setIsPromoteOpen(false)} aria-label="Tutup dialog naik kelas">&times;</button>
              <div className="management-modal-header">
                <span>Naik / Pindah Kelas</span>
                <h2 id="promote-dialog-title">Naik Kelas</h2>
                <p>Pilih tahun ajaran dan kelas tujuan, lalu centang siswa yang akan dipindahkan. Siswa yang tidak dicentang tetap di kelas lama.</p>
              </div>

              <form className="student-dialog-form" onSubmit={handlePromoteSubmit}>
                <div className="student-form-grid">
                  <div className="form-group">
                    <label>Tahun Ajaran Baru</label>
                    <input
                      name="tahun_ajaran"
                      value={promoteForm.tahun_ajaran}
                      onChange={(e) => setPromoteForm((prev) => ({ ...prev, tahun_ajaran: e.target.value }))}
                      placeholder="Contoh: 2026/2027"
                    />
                  </div>
                  <div className="form-group">
                    <label>Kelas Tujuan</label>
                    <select
                      name="kelas_tujuan_id"
                      value={promoteForm.kelas_tujuan_id}
                      onChange={(e) => setPromoteForm((prev) => ({ ...prev, kelas_tujuan_id: e.target.value }))}
                      required
                    >
                      <option value="">Pilih kelas tujuan</option>
                      {kelas.map((item) => <option key={item.id} value={item.id}>{classLabel(item)}</option>)}
                    </select>
                  </div>
                </div>

                <div className="promote-list-controls">
                  <select value={promoteFilterClass} onChange={(e) => setPromoteFilterClass(e.target.value)} aria-label="Filter kelas asal">
                    <option value="all">Semua Kelas</option>
                    {classTabs.map((item) => <option key={item.id} value={String(item.id)}>{item.label}</option>)}
                    {noClassCount > 0 && <option value="none">Tanpa Kelas</option>}
                  </select>
                  <input value={promoteSearch} onChange={(e) => setPromoteSearch(e.target.value)} placeholder="Cari nama / NIS..." />
                  <span className="promote-selected-count">{promoteSelected.length} dipilih</span>
                </div>

                <div className="promote-student-table-wrap">
                  <table className="admin-table student-table">
                    <thead>
                      <tr>
                        <th>
                          <input
                            type="checkbox"
                            aria-label="Pilih semua siswa terlihat"
                            checked={promoteStudents.length > 0 && promoteStudents.every((item) => promoteSelected.includes(item.id))}
                            onChange={toggleSelectAllPromote}
                          />
                        </th>
                        <th>Nama Siswa</th>
                        <th>NIS</th>
                        <th>Kelas Saat Ini</th>
                      </tr>
                    </thead>
                    <tbody>
                      {promoteStudents.length === 0 ? (
                        <tr><td colSpan="4" className="student-empty-state">Tidak ada siswa sesuai filter.</td></tr>
                      ) : promoteStudents.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={promoteSelected.includes(item.id)}
                              onChange={() => togglePromoteStudent(item.id)}
                              aria-label={`Pilih ${item.nama}`}
                            />
                          </td>
                          <td><strong>{item.nama}</strong></td>
                          <td>{item.nisn || "-"}</td>
                          <td>{item.kelas?.nama_kelas || classMap.get(getStudentClassId(item))?.nama_kelas || "Tanpa Kelas"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="management-modal-actions student-dialog-actions">
                  <button type="button" className="cancel-btn" onClick={() => setIsPromoteOpen(false)}>Batal</button>
                  <button type="submit" className="save-btn" disabled={savingPromote}>{savingPromote ? "Menyimpan..." : "Simpan Perubahan"}</button>
                </div>
              </form>
            </section>
          </div>
        )}

        {isArsipOpen && (
          <div className="management-modal-backdrop student-form-modal-backdrop" role="presentation" onClick={() => setIsArsipOpen(false)}>
            <section className="management-modal-card student-form-modal-card promote-modal-card" role="dialog" aria-modal="true" aria-labelledby="arsip-dialog-title" onClick={(event) => event.stopPropagation()}>
              <button type="button" className="management-modal-close" onClick={() => setIsArsipOpen(false)} aria-label="Tutup arsip kelas">&times;</button>
              <div className="management-modal-header">
                <span>Histori Perpindahan</span>
                <h2 id="arsip-dialog-title">Arsip Kelas</h2>
                <p>Riwayat perpindahan dan kenaikan kelas siswa.</p>
              </div>

              <div className="promote-student-table-wrap">
                <table className="admin-table student-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Nama Siswa</th>
                      <th>Kelas Lama</th>
                      <th>Kelas Baru</th>
                      <th>Tahun Ajaran</th>
                      <th>Tanggal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {arsipLoading ? (
                      <tr><td colSpan="6" className="student-empty-state">Memuat arsip...</td></tr>
                    ) : arsip.length === 0 ? (
                      <tr><td colSpan="6" className="student-empty-state">Belum ada riwayat perpindahan kelas.</td></tr>
                    ) : arsip.map((item, index) => (
                      <tr key={item.id}>
                        <td>{index + 1}</td>
                        <td><strong>{item.siswa_nama}</strong></td>
                        <td>{item.kelas_lama_nama || "Tanpa Kelas"}</td>
                        <td>{item.kelas_baru_nama || "-"}</td>
                        <td>{item.tahun_ajaran || "-"}</td>
                        <td>{formatTanggal(item.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="management-modal-actions student-dialog-actions">
                <button type="button" className="cancel-btn" onClick={() => setIsArsipOpen(false)}>Tutup</button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminSiswa;
