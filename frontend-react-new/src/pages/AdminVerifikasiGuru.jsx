import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import {
  getGuruRegistrations,
  verifyGuruRegistration,
  deleteGuruRegistration,
  getGuruJadwalAdmin,
  createGuruJadwal,
  updateGuruJadwal,
  deleteGuruJadwal,
  getKelas,
  logout
} from "../services/api";

const HARI = ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu"];
const emptyJadwalForm = { guru_user_id: "", kelas_id: "", mapel: "", hari: "senin", jam_mulai: "07:00", jam_selesai: "08:00", status: "aktif" };

/**
 * Memecah teks daftar mata pelajaran menjadi array yang bersih.
 *
 * Parameter: value - teks mapel yang dipisah koma/titik koma/plus.
 * Mengembalikan: array nama mapel tanpa spasi berlebih, mengecualikan entri
 * generik seperti "wali kelas"/"guru".
 */
function normalizeSubjects(value) {
  return String(value || "")
    .split(/[,;+]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => !["wali kelas", "guru wali kelas", "guru"].includes(item.toLowerCase()));
}

/**
 * Mengecek apakah profil guru merupakan wali kelas.
 *
 * Parameter: profile - objek profil guru.
 * Mengembalikan: true bila is_homeroom bernilai benar atau teacher_type
 * "wali_kelas".
 */
function isHomeroomProfile(profile = {}) {
  return Boolean(profile.is_homeroom) || profile.teacher_type === "wali_kelas";
}

/**
 * Mengecek apakah profil guru merupakan guru mata pelajaran.
 *
 * Parameter: profile - objek profil guru.
 * Mengembalikan: true bila teacher_type "mapel" dan memiliki minimal satu mapel.
 */
function isSubjectTeacherProfile(profile = {}) {
  return profile.teacher_type === "mapel" && normalizeSubjects(profile.subject).length > 0;
}

/**
 * Menyusun ringkasan peran guru dari draft verifikasi.
 *
 * Parameter: draft - objek draft ({ is_homeroom, is_subject_teacher }).
 * Mengembalikan: teks gabungan peran ("Wali Kelas + Guru Mata Pelajaran") atau
 * "Belum memilih peran" bila kosong.
 */
function roleSummary(draft = {}) {
  const roles = [];
  if (draft.is_homeroom) roles.push("Wali Kelas");
  if (draft.is_subject_teacher) roles.push("Guru Mata Pelajaran");
  return roles.join(" + ") || "Belum memilih peran";
}

/**
 * Halaman Admin Verifikasi Guru & Jadwal Mengajar.
 *
 * Halaman ini dipakai admin untuk menyetujui/menolak registrasi guru (menetapkan
 * peran wali kelas / guru mapel, kelas wali, dan catatan) serta mengelola jadwal
 * mengajar guru mata pelajaran (tambah, ubah lewat modal, dan hapus).
 *
 * Peran/akses: hanya admin (area dashboard admin, butuh sesi login admin).
 */
function AdminVerifikasiGuru() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [kelas, setKelas] = useState([]);
  const [jadwal, setJadwal] = useState([]);
  const [draft, setDraft] = useState({});
  const [editJadwalId, setEditJadwalId] = useState(null);
  const [jadwalForm, setJadwalForm] = useState(emptyJadwalForm);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState(emptyJadwalForm);
  const [savingEdit, setSavingEdit] = useState(false);

  /**
   * Memuat semua data yang dibutuhkan halaman secara paralel.
   * Efek: memanggil API getGuruRegistrations(), getKelas(), getGuruJadwalAdmin()
   * sekaligus; mengisi state accounts, kelas, dan jadwal; serta membangun draft
   * verifikasi awal per guru dari profil masing-masing.
   */
  const loadData = async () => {
    const [guruResult, kelasResult, jadwalResult] = await Promise.all([
      getGuruRegistrations(),
      getKelas(),
      getGuruJadwalAdmin()
    ]);

    if (guruResult.success) {
      setAccounts(guruResult.data || []);
      const nextDraft = {};
      (guruResult.data || []).forEach((item) => {
        const profile = item.guruProfile || {};
        const subjectList = normalizeSubjects(profile.subject || item.profession);
        nextDraft[item.id] = {
          teacher_type: profile.teacher_type || "mapel",
          is_homeroom: isHomeroomProfile(profile),
          is_subject_teacher: isSubjectTeacherProfile(profile),
          subject: subjectList.join(", "),
          kelas_id: profile.kelas_id || "",
          note: profile.note || ""
        };
      });
      setDraft(nextDraft);
    }

    if (kelasResult.success) setKelas(kelasResult.data || []);
    if (jadwalResult.success) setJadwal(jadwalResult.data || []);
  };

  // Memuat data awal halaman sekali saat komponen dipasang.
  useEffect(() => {
    (async () => { await loadData(); })();
  }, []);

  /**
   * Memperbarui satu field draft verifikasi untuk seorang guru.
   * Parameter: id - id guru; field - nama field; value - nilai baru.
   * Efek: memperbarui state draft pada guru terkait.
   */
  const handleDraft = (id, field, value) => {
    setDraft({ ...draft, [id]: { ...draft[id], [field]: value } });
  };

  /**
   * Mengirim keputusan verifikasi registrasi guru.
   * Parameter: id - id guru; verification_status - "approved"/"rejected"/"pending".
   * Efek: menyusun payload dari draft (peran, mapel, kelas wali, catatan);
   * memanggil API verifyGuruRegistration; alert; memuat ulang data.
   */
  const handleVerify = async (id, verification_status) => {
    const itemDraft = draft[id] || {};
    const result = await verifyGuruRegistration(id, {
      ...itemDraft,
      verification_status,
      status_verifikasi: verification_status,
      wali_kelas: itemDraft.is_homeroom,
      guru_mata_pelajaran: itemDraft.is_subject_teacher,
      mata_pelajaran: itemDraft.is_subject_teacher ? itemDraft.subject : "",
      kelas_wali_id: itemDraft.is_homeroom ? itemDraft.kelas_id : null,
      catatan: itemDraft.note
    });
    alert(result.message);
    loadData();
  };

  /**
   * Menghapus registrasi guru setelah konfirmasi.
   * Parameter: id - id guru.
   * Efek: konfirmasi; memanggil API deleteGuruRegistration; alert; memuat ulang.
   */
  const handleDeleteRegistration = async (id) => {
    if (!confirm("Hapus registrasi guru ini? Aksi ini tidak dapat dibatalkan.")) return;
    const result = await deleteGuruRegistration(id);
    alert(result.message);
    loadData();
  };

  /**
   * Mengambil daftar opsi mata pelajaran untuk seorang guru.
   * Parameter: guruUserId - id user guru; fallbackMapel - mapel cadangan.
   * Mengembalikan: array mapel dari profil guru terpilih, atau dari fallback
   * bila tidak ada.
   */
  const getSubjectOptionsForTeacher = (guruUserId, fallbackMapel = "") => {
    const selectedTeacher = accounts.find((item) => Number(item.id) === Number(guruUserId));
    const subjects = normalizeSubjects(selectedTeacher?.guruProfile?.subject || selectedTeacher?.profession || fallbackMapel);
    return subjects.length ? subjects : normalizeSubjects(fallbackMapel);
  };

  /**
   * Menangani perubahan input pada form tambah jadwal.
   * Parameter: event - event input (memakai name & value).
   * Efek: bila guru berubah, ikut menyetel mapel ke opsi pertama guru tersebut;
   * selain itu memperbarui field terkait pada jadwalForm.
   */
  const handleJadwalChange = (event) => {
    const { name, value } = event.target;

    if (name === "guru_user_id") {
      const subjects = getSubjectOptionsForTeacher(value, jadwalForm.mapel);
      setJadwalForm((current) => ({ ...current, guru_user_id: value, mapel: subjects[0] || "" }));
      return;
    }

    setJadwalForm((current) => ({ ...current, [name]: value }));
  };

  /**
   * Membuat jadwal mengajar baru.
   * Parameter: e - event submit form (dicegah reload-nya).
   * Efek: memanggil API createGuruJadwal dengan jadwalForm; alert; bila sukses
   * mereset jadwalForm dan memuat ulang data.
   */
  const handleCreateJadwal = async (e) => {
    e.preventDefault();
    const result = await createGuruJadwal(jadwalForm);
    alert(result.message);
    if (result.success) {
      setJadwalForm(emptyJadwalForm);
      loadData();
    }
  };

  /**
   * Menangani perubahan input pada form modal ubah jadwal.
   * Parameter: event - event input (memakai name & value).
   * Efek: bila guru berubah, ikut menyetel mapel ke opsi pertama; selain itu
   * memperbarui field terkait pada editForm.
   */
  const handleEditModalChange = (event) => {
    const { name, value } = event.target;
    if (name === "guru_user_id") {
      const subjects = getSubjectOptionsForTeacher(value, editForm.mapel);
      setEditForm((current) => ({ ...current, guru_user_id: value, mapel: subjects[0] || "" }));
      return;
    }
    setEditForm((current) => ({ ...current, [name]: value }));
  };

  /**
   * Membuka modal ubah jadwal dengan data jadwal terpilih.
   * Parameter: item - objek jadwal.
   * Efek: mengeset editJadwalId, mengisi editForm (jam dipotong ke HH:mm), dan
   * membuka modal.
   */
  const handleEditJadwal = (item) => {
    setEditJadwalId(item.id);
    setEditForm({
      guru_user_id: item.guru_user_id || "",
      kelas_id: item.kelas_id || "",
      mapel: item.mapel || "",
      hari: item.hari || "senin",
      jam_mulai: String(item.jam_mulai || "07:00").slice(0, 5),
      jam_selesai: String(item.jam_selesai || "08:00").slice(0, 5),
      status: item.status || "aktif"
    });
    setIsEditModalOpen(true);
  };

  /**
   * Menutup modal ubah jadwal dan mereset state terkait.
   */
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditJadwalId(null);
    setEditForm(emptyJadwalForm);
  };

  /**
   * Menyimpan perubahan jadwal mengajar.
   * Parameter: e - event submit form (dicegah reload-nya).
   * Efek: memanggil API updateGuruJadwal dengan editForm; alert; bila sukses
   * menutup modal dan memuat ulang data. Mengubah state savingEdit.
   */
  const handleUpdateJadwal = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    const result = await updateGuruJadwal(editJadwalId, editForm);
    setSavingEdit(false);
    alert(result.message);
    if (result.success) {
      closeEditModal();
      loadData();
    }
  };

  /**
   * Menghapus jadwal mengajar setelah konfirmasi.
   * Parameter: id - id jadwal.
   * Efek: konfirmasi; memanggil API deleteGuruJadwal; alert; memuat ulang data.
   */
  const handleDeleteJadwal = async (id) => {
    if (!confirm("Hapus jadwal ini?")) return;
    const result = await deleteGuruJadwal(id);
    alert(result.message);
    loadData();
  };

  /**
   * Keluar dari sesi admin.
   * Efek: memanggil logout() lalu mengarahkan ke halaman login admin.
   */
  const handleLogout = () => {
    logout();
    navigate("/admin-login");
  };

  // Daftar guru mapel yang sudah disetujui (untuk pilihan pada form jadwal).
  const approvedMapel = accounts.filter((item) => item.guruProfile?.verification_status === "approved" && isSubjectTeacherProfile(item.guruProfile));
  // Opsi mapel untuk guru yang sedang dipilih pada form tambah jadwal.
  const selectedJadwalSubjects = getSubjectOptionsForTeacher(jadwalForm.guru_user_id, jadwalForm.mapel);
  // Mengelompokkan jadwal berdasarkan nama kelas untuk tampilan per kelas.
  const jadwalByKelas = jadwal.reduce((groups, item) => {
    const key = item.kelas?.nama_kelas || "Tanpa Kelas";
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
    return groups;
  }, {});
  // Nama-nama kelas terurut (numerik) untuk merender grup jadwal.
  const jadwalKelasNames = Object.keys(jadwalByKelas).sort((a, b) => a.localeCompare(b, "id", { numeric: true }));

  return (
    <div className="dashboard-layout">
      <AdminSidebar active="/admin/verifikasi-guru" />

<main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Verifikasi Guru</h1>
            <p>Setujui registrasi guru dan atur jadwal guru mata pelajaran.</p>
          </div>
          <div className="dashboard-actions">
            <Link to="/" className="btn secondary">Situs web</Link>
            <button onClick={handleLogout} className="btn primary">Keluar</button>
          </div>
        </div>

        <section className="dashboard-card admin-stack">
          <h3>Registrasi Guru</h3>
          {accounts.length === 0 ? <p className="empty-text">Belum ada registrasi guru.</p> : accounts.map((item) => {
            const profile = item.guruProfile || { verification_status: "pending" };
            const itemDraft = draft[item.id] || {};
            return (
              <div className="verify-card" key={item.id}>
                <div className="verify-card-head">
                  <div>
                    <h4>{item.name}</h4>
                    <p>{item.email} • {roleSummary(itemDraft)}</p>
                  </div>
                  <span className={`status-badge ${profile.verification_status}`}>{profile.verification_status}</span>
                </div>

                <div className="verify-grid">
                  <div className="verify-info full">
                    <span>Peran dari registrasi</span>
                    <strong>{roleSummary(itemDraft)}{itemDraft.subject ? ` - ${itemDraft.subject}` : ""}</strong>
                  </div>
                  {itemDraft.is_homeroom && (
                    <label>Kelas Wali
                      <select value={itemDraft.kelas_id || ""} onChange={(e) => handleDraft(item.id, "kelas_id", e.target.value)}>
                        <option value="">Pilih kelas</option>
                        {kelas.map((kelasItem) => <option key={kelasItem.id} value={kelasItem.id}>{[kelasItem.nama_kelas, kelasItem.tingkat, kelasItem.tahun_ajaran].filter(Boolean).join(" - ")}</option>)}
                      </select>
                    </label>
                  )}
                  <label>Catatan
                    <input value={itemDraft.note || ""} onChange={(e) => handleDraft(item.id, "note", e.target.value)} placeholder="Opsional" />
                  </label>
                </div>

                <div className="ppdb-verify-actions">
                  <button className="verify-accept" onClick={() => handleVerify(item.id, "approved")}>Setujui</button>
                  <button className="verify-reject" onClick={() => handleVerify(item.id, "rejected")}>Tolak</button>
                  <button className="verify-pending" onClick={() => handleVerify(item.id, "pending")}>Menunggu</button>
                  <button className="verify-delete" onClick={() => handleDeleteRegistration(item.id)}>Hapus</button>
                </div>
              </div>
            );
          })}
        </section>

        <section className="dashboard-card admin-stack">
          <h3>Jadwal Mengajar Guru Mata Pelajaran</h3>
          <form className="verify-grid" onSubmit={handleCreateJadwal}>
            <label>Guru Mata Pelajaran
              <select name="guru_user_id" value={jadwalForm.guru_user_id} onChange={handleJadwalChange} required>
                <option value="">Pilih guru</option>
                {approvedMapel.map((item) => <option key={item.id} value={item.id}>{item.name} - {item.guruProfile?.subject}</option>)}
              </select>
            </label>
            <label>Kelas
              <select name="kelas_id" value={jadwalForm.kelas_id} onChange={handleJadwalChange} required>
                <option value="">Pilih kelas</option>
                {kelas.map((kelasItem) => <option key={kelasItem.id} value={kelasItem.id}>{kelasItem.nama_kelas}</option>)}
              </select>
            </label>
            <label>Mata Pelajaran
              <select name="mapel" value={jadwalForm.mapel} onChange={handleJadwalChange} required disabled={!jadwalForm.guru_user_id}>
                <option value="">Pilih mata pelajaran</option>
                {selectedJadwalSubjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
              </select>
            </label>
            <label>Hari
              <select name="hari" value={jadwalForm.hari} onChange={handleJadwalChange}>{HARI.map((hari) => <option key={hari} value={hari}>{hari}</option>)}</select>
            </label>
            <label>Jam Mulai<input type="time" name="jam_mulai" value={jadwalForm.jam_mulai} onChange={handleJadwalChange} required /></label>
            <label>Jam Selesai<input type="time" name="jam_selesai" value={jadwalForm.jam_selesai} onChange={handleJadwalChange} required /></label>
            <label>Status
              <select name="status" value={jadwalForm.status} onChange={handleJadwalChange}>
                <option value="aktif">Aktif</option>
                <option value="non-aktif">Nonaktif</option>
              </select>
            </label>
            <div className="button-row full">
              <button className="save-btn" type="submit">Tambah Jadwal Mengajar</button>
            </div>
          </form>

          {jadwal.length === 0 ? (
            <p className="empty-text">Belum ada jadwal mengajar.</p>
          ) : (
            jadwalKelasNames.map((kelasName) => (
              <div className="jadwal-kelas-group" key={kelasName}>
                <div className="jadwal-kelas-group-head">
                  <h4>Kelas {kelasName}</h4>
                  <span>{jadwalByKelas[kelasName].length} jadwal</span>
                </div>
                <div className="activity-admin-list">
                  {jadwalByKelas[kelasName].map((item) => (
                    <div className="activity-admin-item" key={item.id}>
                      <span>{item.hari}</span>
                      <div>
                        <h4>{item.mapel} - {item.kelas?.nama_kelas || "Kelas"}</h4>
                        <p>{item.guru?.name || "Guru"} • {item.jam_mulai} - {item.jam_selesai}</p>
                      </div>
                      <div className="admin-action">
                        <button type="button" onClick={() => handleEditJadwal(item)}>Ubah</button>
                        <button type="button" onClick={() => handleDeleteJadwal(item.id)}>Hapus</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      </main>

      {isEditModalOpen && (
        <div className="management-modal-backdrop student-form-modal-backdrop" role="presentation" onClick={closeEditModal}>
          <section className="management-modal-card student-form-modal-card" role="dialog" aria-modal="true" aria-labelledby="jadwal-edit-title" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="management-modal-close" onClick={closeEditModal} aria-label="Tutup dialog ubah jadwal">&times;</button>
            <div className="management-modal-header">
              <span>Ubah Jadwal</span>
              <h2 id="jadwal-edit-title">Ubah Jadwal Mengajar</h2>
              <p>Perbarui jadwal mengajar guru mata pelajaran. Perubahan langsung tersimpan tanpa memuat ulang halaman.</p>
            </div>

            <form className="verify-grid" onSubmit={handleUpdateJadwal}>
              <label>Guru Mata Pelajaran
                <select name="guru_user_id" value={editForm.guru_user_id} onChange={handleEditModalChange} required>
                  <option value="">Pilih guru</option>
                  {approvedMapel.map((item) => <option key={item.id} value={item.id}>{item.name} - {item.guruProfile?.subject}</option>)}
                </select>
              </label>
              <label>Kelas
                <select name="kelas_id" value={editForm.kelas_id} onChange={handleEditModalChange} required>
                  <option value="">Pilih kelas</option>
                  {kelas.map((kelasItem) => <option key={kelasItem.id} value={kelasItem.id}>{kelasItem.nama_kelas}</option>)}
                </select>
              </label>
              <label>Mata Pelajaran
                <select name="mapel" value={editForm.mapel} onChange={handleEditModalChange} required disabled={!editForm.guru_user_id}>
                  <option value="">Pilih mata pelajaran</option>
                  {getSubjectOptionsForTeacher(editForm.guru_user_id, editForm.mapel).map((subject) => <option key={subject} value={subject}>{subject}</option>)}
                </select>
              </label>
              <label>Hari
                <select name="hari" value={editForm.hari} onChange={handleEditModalChange}>{HARI.map((hari) => <option key={hari} value={hari}>{hari}</option>)}</select>
              </label>
              <label>Jam Mulai<input type="time" name="jam_mulai" value={editForm.jam_mulai} onChange={handleEditModalChange} required /></label>
              <label>Jam Selesai<input type="time" name="jam_selesai" value={editForm.jam_selesai} onChange={handleEditModalChange} required /></label>
              <label>Status
                <select name="status" value={editForm.status} onChange={handleEditModalChange}>
                  <option value="aktif">Aktif</option>
                  <option value="non-aktif">Nonaktif</option>
                </select>
              </label>
              <div className="button-row full management-modal-actions">
                <button className="cancel-btn" type="button" onClick={closeEditModal}>Batal</button>
                <button className="save-btn" type="submit" disabled={savingEdit}>{savingEdit ? "Menyimpan..." : "Simpan Perubahan"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminVerifikasiGuru;
