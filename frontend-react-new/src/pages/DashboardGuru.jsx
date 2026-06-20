import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getGuruDashboard,
  getRekapAbsensiGuru,
  logout,
  submitAbsensiGuru
} from "../services/api";
import { exportExcel } from "../utils/exportExcel";

const ABSENSI_OPTIONS = [
  { value: "hadir", label: "Hadir" },
  { value: "izin", label: "Izin" },
  { value: "sakit", label: "Sakit" },
  { value: "alpha", label: "Alpha" }
];

const MENU_ITEMS = [
  { id: "dashboard", label: "Dasbor" },
  { id: "jadwal", label: "Jadwal Mengajar" },
  { id: "absensi", label: "Absensi" },
  { id: "rekap", label: "Rekapitulasi Absensi" }
];

const emptySummary = { hadir: 0, izin: 0, sakit: 0, alpha: 0, total: 0 };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonthISO() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(value) {
  return value ? String(value).slice(0, 5) : "-";
}

function getStatusLabel(value) {
  return ABSENSI_OPTIONS.find((item) => item.value === value)?.label || value;
}

function DashboardGuru() {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [tanggal, setTanggal] = useState(todayISO());
  const [jadwalId, setJadwalId] = useState("");
  const [attendanceMode, setAttendanceMode] = useState("homeroom");
  const [entries, setEntries] = useState({});
  const [savedAttendanceSummary, setSavedAttendanceSummary] = useState(emptySummary);
  const [savingAbsensi, setSavingAbsensi] = useState(false);
  const [rekapLoading, setRekapLoading] = useState(false);
  const [rekap, setRekap] = useState({ summary: emptySummary, rows: [] });
  const [rekapFilter, setRekapFilter] = useState({
    kelas_id: "",
    jadwal_id: "",
    dari: firstDayOfMonthISO(),
    sampai: todayISO()
  });
  useEffect(() => {
    const loadDashboard = async () => {
      const result = await getGuruDashboard();

      if (!result.success) {
        alert(result.message || "Gagal membuka dashboard guru");
        navigate("/login-guru");
        return;
      }

      const data = result.data;
      const firstJadwalId = data.jadwal?.[0]?.id ? String(data.jadwal[0].id) : "";
      const firstClassId = data.kelasAkses?.[0]?.id || data.guruProfile?.kelas_id || "";
      const isHomeroom = Boolean(data.guruProfile?.is_homeroom) || data.guruProfile?.teacher_type === "wali_kelas";
      setJadwalId(firstJadwalId);
      setAttendanceMode(isHomeroom ? "homeroom" : "subject");
      setRekapFilter((previous) => ({ ...previous, kelas_id: firstClassId ? String(firstClassId) : "" }));
      setDashboard(data);
      setLoading(false);
    };

    loadDashboard();
  }, [navigate]);

  const profile = dashboard?.guruProfile;
  const isWali = Boolean(profile?.is_homeroom) || profile?.teacher_type === "wali_kelas";
  const hasSubjectRoster = Boolean(dashboard?.jadwal?.length);
  const attendanceIsHomeroom = isWali && attendanceMode === "homeroom";
  const roleLabel = isWali && hasSubjectRoster ? "Guru Wali Kelas + Mata Pelajaran" : isWali ? "Guru Wali Kelas" : "Guru Mata Pelajaran";

  const classOptions = useMemo(() => {
    if (!dashboard) return [];
    if (dashboard.kelasAkses?.length) return dashboard.kelasAkses.filter(Boolean);
    return dashboard.guruProfile?.kelas ? [dashboard.guruProfile.kelas] : [];
  }, [dashboard]);

  const selectedJadwal = useMemo(() => {
    if (!dashboard || !jadwalId) return null;
    return (dashboard.jadwal || []).find((item) => Number(item.id) === Number(jadwalId)) || null;
  }, [dashboard, jadwalId]);

  const attendanceClassId = attendanceIsHomeroom ? profile?.kelas_id : selectedJadwal?.kelas_id;

  const siswaList = useMemo(() => {
    if (!dashboard || !attendanceClassId) return [];
    return (dashboard.siswa || []).filter((siswa) => Number(siswa.kelas_id) === Number(attendanceClassId));
  }, [dashboard, attendanceClassId]);

  const attendanceSummary = useMemo(() => {
    const currentStudentIds = new Set(siswaList.map((siswa) => Number(siswa.id)));
    return Object.values(entries).reduce((summary, entry) => {
      if (!currentStudentIds.has(Number(entry?.siswa_id))) return summary;
      const status = entry?.status;
      if (!status) return summary;
      summary[status] += 1;
      summary.total += 1;
      return summary;
    }, { ...emptySummary });
  }, [entries, siswaList]);

  const handleLogout = () => {
    logout();
    navigate("/login-guru");
  };

  const handleEntry = (id, field, value) => {
    setSavedAttendanceSummary(emptySummary);
    setEntries((previous) => ({
      ...previous,
      [id]: { ...previous[id], siswa_id: id, [field]: value }
    }));
  };

  const handleSubmitAbsensi = async (event) => {
    event.preventDefault();
    setSavingAbsensi(true);
    setNotice(null);
    const selectedEntries = siswaList
      .map((siswa) => entries[siswa.id])
      .filter((entry) => entry?.status);

    if (selectedEntries.length === 0) {
      setSavingAbsensi(false);
      setNotice({ type: "error", text: "Pilih status absensi minimal satu siswa sebelum menyimpan." });
      return;
    }

    const result = await submitAbsensiGuru({
      tanggal,
      kelas_id: attendanceClassId,
      jadwal_id: attendanceIsHomeroom ? null : jadwalId,
      entries: selectedEntries
    });

    setSavingAbsensi(false);
    setNotice({ type: result.success ? "success" : "error", text: result.message });
    if (result.success) setSavedAttendanceSummary(attendanceSummary);
  };

  const handleRekapFilter = (event) => {
    const { name, value } = event.target;
    setRekapFilter((previous) => ({
      ...previous,
      [name]: value,
      ...(name === "kelas_id" ? { jadwal_id: "" } : {})
    }));
  };

  const loadRekap = async () => {
    setRekapLoading(true);
    setNotice(null);

    const result = await getRekapAbsensiGuru(rekapFilter);
    setRekapLoading(false);

    if (!result.success) {
      setNotice({ type: "error", text: result.message });
      return;
    }

    setRekap(result.data || { summary: emptySummary, rows: [] });
  };

  const exportRekap = () => {
    if (!rekap.rows.length) return;

    exportExcel({
      filename: `rekap-absensi-${rekapFilter.dari || "awal"}-${rekapFilter.sampai || "akhir"}.xls`,
      title: "Rekapitulasi Absensi Siswa",
      subtitle: `${roleLabel} • Periode ${rekapFilter.dari || "awal"} sampai ${rekapFilter.sampai || "akhir"}`,
      summary: [
        { label: "Hadir", value: rekap.summary?.hadir || 0 },
        { label: "Izin", value: rekap.summary?.izin || 0 },
        { label: "Sakit", value: rekap.summary?.sakit || 0 },
        { label: "Alpha", value: rekap.summary?.alpha || 0 },
        { label: "Total", value: rekap.summary?.total || 0 }
      ],
      columns: [
        { header: "No", value: (_row, index) => index + 1 },
        { header: "Tanggal", value: (row) => formatDate(row.tanggal) },
        { header: "Nama Siswa", value: (row) => row.siswa?.nama || "-" },
        { header: "Kelas", value: (row) => row.kelas?.nama_kelas || "-" },
        { header: "Mapel", value: (row) => row.mapel || "Wali Kelas" },
        { header: "Status", value: (row) => getStatusLabel(row.status) },
        { header: "Keterangan", value: (row) => row.keterangan || "-" }
      ],
      rows: rekap.rows
    });
  };

  const renderSummaryCards = (summary) => (
    <div className="teacher-stats">
      {ABSENSI_OPTIONS.map((item) => (
        <div className={`teacher-stat teacher-stat-${item.value}`} key={item.value}>
          <span>{item.label}</span>
          <strong>{summary[item.value] || 0}</strong>
        </div>
      ))}
      <div className="teacher-stat teacher-stat-total">
        <span>Total</span>
        <strong>{summary.total || 0}</strong>
      </div>
    </div>
  );

  const renderDashboard = () => {
    const info = dashboard.informasiSekolah;
    const announcements = dashboard.pengumumanTerbaru || [];

    return (
      <section className="teacher-panel">
        <div className="teacher-panel-header">
          <span>Dasbor</span>
          <h1>Informasi Sekolah</h1>
          <p>Ringkasan sekolah, profil guru, dan pengumuman terbaru untuk aktivitas harian.</p>
        </div>

        <div className="teacher-grid two-columns">
          <article className="teacher-card profile-card">
            <div className="teacher-card-title">
              <span>Ringkasan Profil</span>
              <strong>{roleLabel}</strong>
            </div>
            <h2>{dashboard.user?.name}</h2>
            <p>{dashboard.user?.profession || profile?.subject || "Guru"}</p>
            <div className="teacher-profile-list">
              <div><span>Kelas Akses</span><strong>{classOptions.map((item) => item.nama_kelas).join(", ") || "Belum diset"}</strong></div>
              <div><span>Mata Pelajaran</span><strong>{profile?.subject || "Umum"}</strong></div>
              <div><span>Status</span><strong>Aktif Terverifikasi</strong></div>
            </div>
          </article>

          <article className="teacher-card school-card">
            <div className="teacher-card-title">
              <span>Informasi Sekolah</span>
              <strong>{info?.akreditasi ? `Akreditasi ${info.akreditasi}` : "CNB"}</strong>
            </div>
            <h2>{info?.nama_sekolah || "Profil sekolah belum diisi"}</h2>
            <p>{info?.alamat || "Alamat sekolah belum tersedia."}</p>
            <div className="school-mini-grid">
              <div><span>Telepon</span><strong>{info?.telepon || "-"}</strong></div>
              <div><span>Email</span><strong>{info?.email || "-"}</strong></div>
            </div>
          </article>
        </div>

        <div className="teacher-grid two-columns lower-grid">
          <article className="teacher-card vision-card">
            <h3>Visi & Misi</h3>
            <p><strong>Visi:</strong> {info?.visi || "Visi sekolah belum diisi admin."}</p>
            <p><strong>Misi:</strong> {info?.misi || "Misi sekolah belum diisi admin."}</p>
          </article>

          <article className="teacher-card announcement-card">
            <h3>Pengumuman Terbaru</h3>
            {announcements.length === 0 ? (
              <p className="teacher-empty">Belum ada pengumuman terbaru.</p>
            ) : (
              <div className="teacher-announcement-list">
                {announcements.map((item) => (
                  <div className="teacher-announcement" key={item.id}>
                    <span>{formatDate(item.date)}</span>
                    <strong>{item.title}</strong>
                    <p>{item.content}</p>
                  </div>
                ))}
              </div>
            )}
          </article>
        </div>
      </section>
    );
  };

  const renderJadwal = () => (
    <section className="teacher-panel">
      <div className="teacher-panel-header compact">
        <span>Jadwal Mengajar Guru</span>
        <h1>Jadwal Mengajar</h1>
        <p>{isWali ? "Wali kelas dapat melakukan absensi harian untuk kelas binaan." : "Guru mata pelajaran hanya dapat absensi sesuai jadwal mengajar yang disetujui admin."}</p>
      </div>

      <div className="teacher-table-wrap">
        <table className="teacher-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Mapel</th>
              <th>Kelas</th>
              <th>Hari</th>
              <th>Jam</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {isWali && (
              <tr>
                <td>1</td>
                <td>Wali Kelas</td>
                <td>{profile?.kelas?.nama_kelas || "Belum diset"}</td>
                <td>Senin - Sabtu</td>
                <td>Absensi utama awal masuk</td>
                <td><span className="teacher-badge active">Aktif</span></td>
              </tr>
            )}
            {!isWali && (dashboard.jadwal || []).length === 0 ? (
              <tr><td colSpan="6" className="teacher-empty-cell">Belum ada jadwal mengajar dari admin.</td></tr>
            ) : (dashboard.jadwal || []).map((item, index) => (
              <tr key={item.id}>
                <td>{index + (isWali ? 2 : 1)}</td>
                <td>{item.mapel}</td>
                <td>{item.kelas?.nama_kelas || "-"}</td>
                <td>{item.hari}</td>
                <td>{formatTime(item.jam_mulai)} - {formatTime(item.jam_selesai)}</td>
                <td><span className="teacher-badge active">Aktif</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderAbsensi = () => (
    <section className="teacher-panel">
      <div className="teacher-panel-header compact">
        <span>{attendanceIsHomeroom ? "Absensi Utama" : "Absensi Mapel"}</span>
        <h1>{attendanceIsHomeroom ? "Absensi Utama Harian" : "Absensi Guru Mata Pelajaran"}</h1>
        <p>{attendanceIsHomeroom ? "Absensi utama hanya diinput Guru Wali Kelas saat awal masuk sekolah dan tampil di akun siswa." : "Absensi mapel tetap tersimpan untuk kebutuhan internal pembelajaran, tidak menjadi absensi utama siswa."}</p>
      </div>

      {isWali && hasSubjectRoster && (
        <div className="teacher-actions-row attendance-mode-switch">
          <button type="button" className={attendanceMode === "homeroom" ? "teacher-primary" : "teacher-secondary"} onClick={() => setAttendanceMode("homeroom")}>
            Absensi Utama Wali Kelas
          </button>
          <button type="button" className={attendanceMode === "subject" ? "teacher-primary" : "teacher-secondary"} onClick={() => setAttendanceMode("subject")}>
            Absensi Mapel
          </button>
        </div>
      )}

      <form onSubmit={handleSubmitAbsensi} className="teacher-form-stack">
        <div className="teacher-form-grid three-columns">
          <label className="teacher-field">Tanggal
            <input type="date" value={tanggal} onChange={(event) => setTanggal(event.target.value)} required />
          </label>

          {attendanceIsHomeroom ? (
            <label className="teacher-field">Kelas
              <input value={profile?.kelas?.nama_kelas || "Kelas belum diset admin"} readOnly />
            </label>
          ) : (
            <label className="teacher-field">Jam / Jadwal Mengajar
              <select value={jadwalId} onChange={(event) => setJadwalId(event.target.value)} required>
                {(dashboard.jadwal || []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.hari} • {formatTime(item.jam_mulai)}-{formatTime(item.jam_selesai)} • {item.mapel} • {item.kelas?.nama_kelas}
                  </option>
                ))}
              </select>
            </label>
          )}

          <button type="button" className="teacher-secondary action-height" onClick={() => setNotice({ type: "success", text: "Sesi absensi siap diisi." })}>
            {attendanceIsHomeroom ? "Buka Absensi Utama" : "Buka Absensi Mapel"}
          </button>
        </div>

        {renderSummaryCards(savedAttendanceSummary)}

        <div className="teacher-table-wrap">
          <table className="teacher-table attendance-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Siswa</th>
                <th>NISN</th>
                <th>Status</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {siswaList.length === 0 ? (
                <tr><td colSpan="5" className="teacher-empty-cell">Belum ada siswa untuk kelas absensi ini.</td></tr>
              ) : siswaList.map((siswa, index) => (
                <tr key={siswa.id}>
                  <td>{index + 1}</td>
                  <td>{siswa.nama}</td>
                  <td>{siswa.nisn}</td>
                  <td>
                    <select value={entries[siswa.id]?.status || ""} onChange={(event) => handleEntry(siswa.id, "status", event.target.value)}>
                      <option value="">Pilih status</option>
                      {ABSENSI_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  </td>
                  <td>
                    <input value={entries[siswa.id]?.keterangan || ""} onChange={(event) => handleEntry(siswa.id, "keterangan", event.target.value)} placeholder="Contoh: sakit demam" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="teacher-actions-row">
          <button className="teacher-primary" type="submit" disabled={savingAbsensi || siswaList.length === 0 || (!attendanceIsHomeroom && !jadwalId)}>
            {savingAbsensi ? "Menyimpan..." : attendanceIsHomeroom ? "Simpan Absensi Utama" : "Simpan Absensi Mapel"}
          </button>
        </div>
      </form>
    </section>
  );

  const renderRekap = () => (
    <section className="teacher-panel">
      <div className="teacher-panel-header compact">
        <span>Rekapitulasi</span>
        <h1>Rekapitulasi Absensi</h1>
        <p>Filter berdasarkan kelas dan rentang tanggal, lalu ekspor hasil rekap ke Excel.</p>
      </div>

      <div className="teacher-form-grid four-columns">
        <label className="teacher-field">Kelas
          <select name="kelas_id" value={rekapFilter.kelas_id} onChange={handleRekapFilter}>
            <option value="">Semua kelas akses</option>
            {classOptions.map((kelas) => <option key={kelas.id} value={kelas.id}>{kelas.nama_kelas}</option>)}
          </select>
        </label>

        {hasSubjectRoster && (
          <label className="teacher-field">Jadwal Mengajar
            <select name="jadwal_id" value={rekapFilter.jadwal_id} onChange={handleRekapFilter}>
              <option value="">Semua jadwal mengajar</option>
              {(dashboard.jadwal || []).map((item) => (
                <option key={item.id} value={item.id}>{item.mapel} • {item.kelas?.nama_kelas} • {item.hari}</option>
              ))}
            </select>
          </label>
        )}

        <label className="teacher-field">Dari
          <input type="date" name="dari" value={rekapFilter.dari} onChange={handleRekapFilter} />
        </label>

        <label className="teacher-field">Sampai
          <input type="date" name="sampai" value={rekapFilter.sampai} onChange={handleRekapFilter} />
        </label>
      </div>

      <div className="teacher-actions-row space-between">
        <button type="button" className="teacher-primary" onClick={loadRekap} disabled={rekapLoading}>
          {rekapLoading ? "Memuat..." : "Tampilkan"}
        </button>
        <button type="button" className="teacher-secondary" onClick={exportRekap} disabled={!rekap.rows.length}>
          Ekspor Excel
        </button>
      </div>

      {renderSummaryCards(rekap.summary || emptySummary)}

      <div className="teacher-table-wrap">
        <table className="teacher-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Tanggal</th>
              <th>Nama Siswa</th>
              <th>Kelas</th>
              <th>Mapel</th>
              <th>Status</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {!rekap.rows.length ? (
              <tr><td colSpan="7" className="teacher-empty-cell">Belum ada data rekap pada filter ini.</td></tr>
            ) : rekap.rows.map((row, index) => (
              <tr key={row.id}>
                <td>{index + 1}</td>
                <td>{formatDate(row.tanggal)}</td>
                <td>{row.siswa?.nama || "-"}</td>
                <td>{row.kelas?.nama_kelas || "-"}</td>
                <td>{row.mapel || "Wali Kelas"}</td>
                <td><span className={`teacher-badge status-${row.status}`}>{getStatusLabel(row.status)}</span></td>
                <td>{row.keterangan || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderActivePanel = () => {
    if (activeMenu === "jadwal") return renderJadwal();
    if (activeMenu === "absensi") return renderAbsensi();
    if (activeMenu === "rekap") return renderRekap();
    return renderDashboard();
  };

  if (loading) {
    return (
      <main className="teacher-loading">
        <div>
          <span>CNB</span>
          <p>Memuat dashboard guru...</p>
        </div>
      </main>
    );
  }

  if (!dashboard) return null;

  return (
    <div className="teacher-shell">
      <header className="teacher-topbar">
        <div className="teacher-brand">
          <span>CNB</span>
          <div>
            <strong>Portal Guru</strong>
            <small>Sistem Informasi Sekolah</small>
          </div>
        </div>
        <button type="button" onClick={handleLogout} className="teacher-logout">Keluar</button>
      </header>

      <div className="teacher-layout">
        <aside className="teacher-sidebar">
          <div className="teacher-avatar">
            <span>{dashboard.user?.name?.slice(0, 1) || "G"}</span>
          </div>
          <h2>{dashboard.user?.name}</h2>
          <p>{roleLabel}</p>
          <span className="teacher-role-pill">{profile?.subject || profile?.kelas?.nama_kelas || "Guru"}</span>

          <nav className="teacher-menu" aria-label="Menu dashboard guru">
            {MENU_ITEMS.map((item) => {
              const label = item.id === "absensi" ? (isWali ? "Absensi Utama" : "Absensi Mapel") : item.label;
              return (
                <button
                  type="button"
                  key={item.id}
                  className={activeMenu === item.id ? "active" : ""}
                  onClick={() => setActiveMenu(item.id)}
                >
                  {label}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="teacher-main">
          {notice && <div className={`teacher-notice ${notice.type}`}>{notice.text}</div>}
          {renderActivePanel()}
        </main>
      </div>
    </div>
  );
}

export default DashboardGuru;
