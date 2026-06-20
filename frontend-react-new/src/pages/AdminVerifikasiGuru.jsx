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

  const handleRoleDraft = (id, field, checked) => {
    setDraft((current) => {
      const currentDraft = current[id] || {};
      const nextDraft = { ...currentDraft, [field]: checked };
      if (field === "is_subject_teacher" && !checked) nextDraft.subject = "";
      if (field === "is_homeroom" && !checked) nextDraft.kelas_id = "";
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

  const handleJadwalChange = (e) => {
    setJadwalForm({ ...jadwalForm, [e.target.name]: e.target.value });
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
                  <div className="form-field role-field full">
                    <span className="field-label">Peran Guru</span>
                    <div className="role-card-group verify-role-card-group">
                      <label className={itemDraft.is_homeroom ? "role-card-option selected" : "role-card-option"}>
                        <input type="checkbox" aria-label="Pilih peran guru wali kelas" checked={Boolean(itemDraft.is_homeroom)} onChange={(e) => handleRoleDraft(item.id, "is_homeroom", e.target.checked)} />
                        <span className="role-card-mark" aria-hidden="true">WK</span>
                        <span className="role-card-copy">
                          <strong>Guru Wali Kelas</strong>
                          <small>Akses hanya kelas wali untuk absensi utama dan monitoring siswa.</small>
                        </span>
                        <span className="role-card-state">{itemDraft.is_homeroom ? "Dipilih" : "Pilih"}</span>
                      </label>
                      <label className={itemDraft.is_subject_teacher ? "role-card-option selected" : "role-card-option"}>
                        <input type="checkbox" aria-label="Pilih peran guru mata pelajaran" checked={Boolean(itemDraft.is_subject_teacher)} onChange={(e) => handleRoleDraft(item.id, "is_subject_teacher", e.target.checked)} />
                        <span className="role-card-mark" aria-hidden="true">MP</span>
                        <span className="role-card-copy">
                          <strong>Guru Mata Pelajaran</strong>
                          <small>Akses kelas mengikuti jadwal mengajar yang dibuat admin.</small>
                        </span>
                        <span className="role-card-state">{itemDraft.is_subject_teacher ? "Dipilih" : "Pilih"}</span>
                      </label>
                    </div>
                  </div>
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
            <label>Mapel<input name="mapel" value={jadwalForm.mapel} onChange={handleJadwalChange} required /></label>
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
