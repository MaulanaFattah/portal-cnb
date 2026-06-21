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

function normalizeSubjects(value) {
  return String(value || "")
    .split(/[,;+]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => !["wali kelas", "guru wali kelas", "guru"].includes(item.toLowerCase()));
}

function isHomeroomProfile(profile = {}) {
  return Boolean(profile.is_homeroom) || profile.teacher_type === "wali_kelas";
}

function isSubjectTeacherProfile(profile = {}) {
  return profile.teacher_type === "mapel" && normalizeSubjects(profile.subject).length > 0;
}

function roleSummary(draft = {}) {
  const roles = [];
  if (draft.is_homeroom) roles.push("Wali Kelas");
  if (draft.is_subject_teacher) roles.push("Guru Mata Pelajaran");
  return roles.join(" + ") || "Belum memilih peran";
}

function AdminVerifikasiGuru() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [kelas, setKelas] = useState([]);
  const [jadwal, setJadwal] = useState([]);
  const [draft, setDraft] = useState({});
  const [editJadwalId, setEditJadwalId] = useState(null);
  const [jadwalForm, setJadwalForm] = useState(emptyJadwalForm);

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

  useEffect(() => {
    (async () => { await loadData(); })();
  }, []);

  const handleDraft = (id, field, value) => {
    setDraft({ ...draft, [id]: { ...draft[id], [field]: value } });
  };

  const handleRoleSelect = (id, value) => {
    setDraft((current) => {
      const currentDraft = current[id] || {};
      const isHomeroom = value === "wali" || value === "keduanya";
      const isSubjectTeacher = value === "mapel" || value === "keduanya";
      const nextDraft = { ...currentDraft, is_homeroom: isHomeroom, is_subject_teacher: isSubjectTeacher };
      if (!isSubjectTeacher) nextDraft.subject = "";
      if (!isHomeroom) nextDraft.kelas_id = "";
      return { ...current, [id]: nextDraft };
    });
  };

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

  const handleDeleteRegistration = async (id) => {
    if (!confirm("Hapus registrasi guru ini? Aksi ini tidak dapat dibatalkan.")) return;
    const result = await deleteGuruRegistration(id);
    alert(result.message);
    loadData();
  };

  const getSubjectOptionsForTeacher = (guruUserId, fallbackMapel = "") => {
    const selectedTeacher = accounts.find((item) => Number(item.id) === Number(guruUserId));
    const subjects = normalizeSubjects(selectedTeacher?.guruProfile?.subject || selectedTeacher?.profession || fallbackMapel);
    return subjects.length ? subjects : normalizeSubjects(fallbackMapel);
  };

  const handleJadwalChange = (event) => {
    const { name, value } = event.target;

    if (name === "guru_user_id") {
      const subjects = getSubjectOptionsForTeacher(value, jadwalForm.mapel);
      setJadwalForm((current) => ({ ...current, guru_user_id: value, mapel: subjects[0] || "" }));
      return;
    }

    setJadwalForm((current) => ({ ...current, [name]: value }));
  };

  const handleCreateJadwal = async (e) => {
    e.preventDefault();
    const result = editJadwalId
      ? await updateGuruJadwal(editJadwalId, jadwalForm)
      : await createGuruJadwal(jadwalForm);
    alert(result.message);
    if (result.success) {
      setEditJadwalId(null);
      setJadwalForm(emptyJadwalForm);
      loadData();
    }
  };

  const handleEditJadwal = (item) => {
    setEditJadwalId(item.id);
    setJadwalForm({
      guru_user_id: item.guru_user_id || "",
      kelas_id: item.kelas_id || "",
      mapel: item.mapel || "",
      hari: item.hari || "senin",
      jam_mulai: String(item.jam_mulai || "07:00").slice(0, 5),
      jam_selesai: String(item.jam_selesai || "08:00").slice(0, 5),
      status: item.status || "aktif"
    });
  };

  const resetJadwalForm = () => {
    setEditJadwalId(null);
    setJadwalForm(emptyJadwalForm);
  };

  const handleDeleteJadwal = async (id) => {
    if (!confirm("Hapus jadwal ini?")) return;
    const result = await deleteGuruJadwal(id);
    alert(result.message);
    loadData();
  };

  const handleLogout = () => {
    logout();
    navigate("/admin-login");
  };

  const approvedMapel = accounts.filter((item) => item.guruProfile?.verification_status === "approved" && isSubjectTeacherProfile(item.guruProfile));
  const selectedJadwalSubjects = getSubjectOptionsForTeacher(jadwalForm.guru_user_id, jadwalForm.mapel);

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
                  <label className="full">Peran Guru
                    <select
                      value={itemDraft.is_homeroom && itemDraft.is_subject_teacher ? "keduanya" : itemDraft.is_homeroom ? "wali" : itemDraft.is_subject_teacher ? "mapel" : ""}
                      onChange={(e) => handleRoleSelect(item.id, e.target.value)}
                    >
                      <option value="">Pilih peran guru</option>
                      <option value="wali">Guru Wali Kelas</option>
                      <option value="mapel">Guru Mata Pelajaran</option>
                      <option value="keduanya">Wali Kelas + Guru Mata Pelajaran</option>
                    </select>
                  </label>
                  {itemDraft.is_subject_teacher && (
                    <label>Mata Pelajaran
                      <input value={itemDraft.subject || ""} onChange={(e) => handleDraft(item.id, "subject", e.target.value)} placeholder="Contoh: Matematika, IPA" />
                    </label>
                  )}
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
          <h3>{editJadwalId ? "Ubah Jadwal Mengajar Guru Mata Pelajaran" : "Jadwal Mengajar Guru Mata Pelajaran"}</h3>
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
              <button className="save-btn" type="submit">{editJadwalId ? "Simpan Jadwal Mengajar" : "Tambah Jadwal Mengajar"}</button>
              {editJadwalId && <button className="cancel-btn" type="button" onClick={resetJadwalForm}>Batal Ubah</button>}
            </div>
          </form>

          <div className="activity-admin-list">
            {jadwal.length === 0 ? <p className="empty-text">Belum ada jadwal mengajar.</p> : jadwal.map((item) => (
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
        </section>
      </main>
    </div>
  );
}

export default AdminVerifikasiGuru;
