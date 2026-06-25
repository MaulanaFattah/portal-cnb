import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getGuruDashboard,
  getRekapAbsensiGuru,
  logout,
  submitAbsensiGuru,
  updateGuruProfile
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
  { id: "rekap", label: "Rekapitulasi Absensi" },
  { id: "profil", label: "Edit Profil" }
];

const emptySummary = { hadir: 0, izin: 0, sakit: 0, alpha: 0, total: 0 };

function toDateInputValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function todayISO() {
  return toDateInputValue();
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

function summarizeAttendanceRows(rows = []) {
  return rows.reduce((summary, row) => {
    const status = row?.status;
    if (!ABSENSI_OPTIONS.some((item) => item.value === status)) return summary;
    summary[status] += 1;
    summary.total += 1;
    return summary;
  }, { ...emptySummary });
}

function isHomeroomSubjectLabel(value) {
  return ["wali kelas", "guru wali kelas"].includes(String(value || "").trim().toLowerCase());
}

function DashboardGuru() {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [expandedAnnouncements, setExpandedAnnouncements] = useState([]);
  const [tanggal, setTanggal] = useState(todayISO());
  const [jadwalId, setJadwalId] = useState("");
  const [attendanceMode, setAttendanceMode] = useState("homeroom");
  const [attendanceEntryBuckets, setAttendanceEntryBuckets] = useState({});
  const [savedAttendanceSummaries, setSavedAttendanceSummaries] = useState({});
  const [savedAttendanceRows, setSavedAttendanceRows] = useState({});
  const [loadingSavedAttendance, setLoadingSavedAttendance] = useState(false);
  const [savedAttendanceErrors, setSavedAttendanceErrors] = useState({});
  const [rekapMode, setRekapMode] = useState("homeroom");
  const [savingAbsensi, setSavingAbsensi] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", email: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [rekapLoading, setRekapLoading] = useState(false);
  const [rekap, setRekap] = useState({ summary: emptySummary, rows: [] });
  const [rekapFilter, setRekapFilter] = useState({
    kelas_id: "",
    jadwal_id: "",
    mapel: "",
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
      const firstJadwal = data.jadwal?.[0] || null;
      const firstJadwalId = firstJadwal?.id ? String(firstJadwal.id) : "";
      const firstClassId = data.kelasAkses?.[0]?.id || data.guruProfile?.kelas_id || firstJadwal?.kelas_id || "";
      const isHomeroom = Boolean(data.guruProfile?.is_homeroom) || data.guruProfile?.teacher_type === "wali_kelas";
      const defaultRekapMode = isHomeroom ? "homeroom" : "subject";
      setJadwalId(firstJadwalId);
      setAttendanceMode(isHomeroom ? "homeroom" : "subject");
      setRekapMode(defaultRekapMode);
      setRekapFilter((previous) => ({
        ...previous,
        kelas_id: defaultRekapMode === "homeroom"
          ? String(data.guruProfile?.kelas_id || firstClassId || "")
          : String(firstJadwal?.kelas_id || firstClassId || ""),
        jadwal_id: defaultRekapMode === "subject" ? firstJadwalId : "",
        mapel: defaultRekapMode === "subject" ? firstJadwal?.mapel || "" : ""
      }));
      setProfileForm({ name: data.user?.name || "", email: data.user?.email || "" });
      setDashboard(data);
      setLoading(false);
    };

    loadDashboard();
  }, [navigate]);

  const profile = dashboard?.guruProfile;
  const isWali = Boolean(profile?.is_homeroom) || profile?.teacher_type === "wali_kelas";
  const hasSubjectRoster = Boolean(dashboard?.jadwal?.length);
  const displaySubject = profile?.subject && !isHomeroomSubjectLabel(profile.subject) ? profile.subject : "";
  const attendanceIsHomeroom = isWali && attendanceMode === "homeroom";
  const roleLabel = isWali && hasSubjectRoster ? "Guru Wali Kelas + Mata Pelajaran" : isWali ? "Guru Wali Kelas" : "Guru Mata Pelajaran";
  const teacherInitial = (dashboard?.user?.name || "G").trim().charAt(0) || "G";

  const classOptions = useMemo(() => {
    if (!dashboard) return [];
    if (dashboard.kelasAkses?.length) return dashboard.kelasAkses.filter(Boolean);
    return dashboard.guruProfile?.kelas ? [dashboard.guruProfile.kelas] : [];
  }, [dashboard]);

  const selectedJadwal = useMemo(() => {
    if (!dashboard || !jadwalId) return null;
    return (dashboard.jadwal || []).find((item) => Number(item.id) === Number(jadwalId)) || null;
  }, [dashboard, jadwalId]);

  // Opsi jadwal untuk REKAP mapel: gabungan jadwal milik sendiri + seluruh jadwal
  // di kelas wali (lintas guru) supaya wali kelas bisa melihat rekap guru mapel lain.
  const rekapJadwalOptions = useMemo(() => {
    if (!dashboard) return [];
    const map = new Map();
    (dashboard.jadwalKelasWali || []).forEach((item) => {
      if (item?.id) map.set(Number(item.id), item);
    });
    (dashboard.jadwal || []).forEach((item) => {
      if (item?.id && !map.has(Number(item.id))) map.set(Number(item.id), { ...item, milik_sendiri: true });
    });
    return [...map.values()];
  }, [dashboard]);

  const selectedRekapJadwal = useMemo(() => {
    if (!rekapFilter.jadwal_id) return null;
    return rekapJadwalOptions.find((item) => Number(item.id) === Number(rekapFilter.jadwal_id)) || null;
  }, [rekapJadwalOptions, rekapFilter.jadwal_id]);

  const rekapIsHomeroom = isWali && rekapMode === "homeroom";
  const attendanceContextKey = attendanceIsHomeroom
    ? `wali-${profile?.kelas_id || "none"}-${tanggal || "no-date"}`
    : `mapel-${jadwalId || "none"}-${tanggal || "no-date"}`;
  const entries = useMemo(() => attendanceEntryBuckets[attendanceContextKey] || {}, [attendanceEntryBuckets, attendanceContextKey]);
  const savedAttendanceSummary = savedAttendanceSummaries[attendanceContextKey] || emptySummary;
  const currentSavedAttendanceRows = savedAttendanceRows[attendanceContextKey] || [];
  const currentSavedAttendanceError = savedAttendanceErrors[attendanceContextKey] || "";

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

  const applySavedAttendanceRows = useCallback((contextKey, rows) => {
    const currentStudentIds = new Set(siswaList.map((siswa) => Number(siswa.id)));
    const studentMap = new Map(siswaList.map((siswa) => [Number(siswa.id), siswa]));
    const normalizedRows = (rows || [])
      .filter((row) => currentStudentIds.has(Number(row.siswa_id)))
      .map((row) => ({
        ...row,
        siswa_id: Number(row.siswa_id),
        siswa: row.siswa || studentMap.get(Number(row.siswa_id)) || null,
        keterangan: row.keterangan || ""
      }));

    const nextEntries = normalizedRows.reduce((bucket, row) => {
      bucket[row.siswa_id] = {
        siswa_id: row.siswa_id,
        status: row.status,
        keterangan: row.keterangan || ""
      };
      return bucket;
    }, {});

    setAttendanceEntryBuckets((previous) => ({
      ...previous,
      [contextKey]: nextEntries
    }));
    setSavedAttendanceRows((previous) => ({
      ...previous,
      [contextKey]: normalizedRows
    }));
    setSavedAttendanceSummaries((previous) => ({
      ...previous,
      [contextKey]: summarizeAttendanceRows(normalizedRows)
    }));
  }, [siswaList]);

  useEffect(() => {
    if (!dashboard || !tanggal || !attendanceClassId || siswaList.length === 0 || (!attendanceIsHomeroom && !jadwalId)) {
      return undefined;
    }

    let active = true;
    const loadSavedAttendance = async () => {
      await Promise.resolve();
      if (!active) return;
      setLoadingSavedAttendance(true);
      setSavedAttendanceErrors((previous) => ({ ...previous, [attendanceContextKey]: "" }));

      const params = {
        dari: tanggal,
        sampai: tanggal
      };

      if (attendanceIsHomeroom) {
        params.kelas_id = attendanceClassId;
      } else {
        params.jadwal_id = jadwalId;
      }

      const result = await getRekapAbsensiGuru(params);
      if (!active) return;

      setLoadingSavedAttendance(false);
      if (!result.success) {
        setSavedAttendanceErrors((previous) => ({
          ...previous,
          [attendanceContextKey]: result.message || "Gagal memuat data absensi tersimpan."
        }));
        applySavedAttendanceRows(attendanceContextKey, []);
        return;
      }

      applySavedAttendanceRows(attendanceContextKey, result.data?.rows || []);
    };

    loadSavedAttendance();
    return () => {
      active = false;
    };
  }, [applySavedAttendanceRows, attendanceClassId, attendanceContextKey, attendanceIsHomeroom, dashboard, jadwalId, siswaList.length, tanggal]);

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setNotice(null);
    const result = await updateGuruProfile({ name: profileForm.name });
    setSavingProfile(false);
    setNotice({ type: result.success ? "success" : "error", text: result.message });
    if (result.success) {
      setDashboard((current) => current ? { ...current, user: { ...current.user, name: profileForm.name } } : current);
    }
  };

  const toggleAnnouncement = (id) => {
    setExpandedAnnouncements((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleEntry = (id, field, value) => {
    setAttendanceEntryBuckets((previous) => {
      const currentEntries = previous[attendanceContextKey] || {};
      return {
        ...previous,
        [attendanceContextKey]: {
          ...currentEntries,
          [id]: { ...currentEntries[id], siswa_id: id, [field]: value }
        }
      };
    });
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
    if (!result.success) {
      setNotice({ type: "error", text: result.message });
      return;
    }

    setNotice(null);
    const studentMap = new Map(siswaList.map((siswa) => [Number(siswa.id), siswa]));
    const savedRows = selectedEntries.map((entry) => ({
      siswa_id: Number(entry.siswa_id),
      kelas_id: attendanceClassId,
      guru_user_id: dashboard?.user?.id,
      jadwal_id: attendanceIsHomeroom ? null : Number(jadwalId),
      tanggal,
      tipe_guru: attendanceIsHomeroom ? "wali_kelas" : "mapel",
      mapel: attendanceIsHomeroom ? null : selectedJadwal?.mapel || null,
      status: entry.status,
      keterangan: entry.keterangan || "",
      siswa: studentMap.get(Number(entry.siswa_id)) || null
    }));
    applySavedAttendanceRows(attendanceContextKey, savedRows);
  };

  const handleRekapFilter = (event) => {
    const { name, value } = event.target;
    setRekap({ summary: emptySummary, rows: [] });
    setRekapFilter((previous) => {
      if (name === "jadwal_id") {
        const jadwal = rekapJadwalOptions.find((item) => Number(item.id) === Number(value));
        return {
          ...previous,
          jadwal_id: value,
          kelas_id: jadwal?.kelas_id ? String(jadwal.kelas_id) : "",
          mapel: jadwal?.mapel || ""
        };
      }
      return { ...previous, [name]: value };
    });
  };

  const handleRekapModeChange = (mode) => {
    const firstJadwal = rekapJadwalOptions[0] || null;
    setRekapMode(mode);
    setRekap({ summary: emptySummary, rows: [] });
    setNotice(null);
    setRekapFilter((previous) => ({
      ...previous,
      kelas_id: mode === "homeroom"
        ? String(profile?.kelas_id || "")
        : String(firstJadwal?.kelas_id || ""),
      jadwal_id: mode === "subject" ? (firstJadwal?.id ? String(firstJadwal.id) : "") : "",
      mapel: mode === "subject" ? firstJadwal?.mapel || "" : ""
    }));
  };

  const loadRekap = async () => {
    const params = {
      dari: rekapFilter.dari,
      sampai: rekapFilter.sampai
    };

    if (rekapIsHomeroom) {
      if (!profile?.kelas_id) {
        setRekap({ summary: emptySummary, rows: [] });
        setNotice({ type: "error", text: "Kelas wali belum ditentukan administrator." });
        return;
      }
      params.kelas_id = profile.kelas_id;
    } else {
      if (!rekapFilter.jadwal_id) {
        setRekap({ summary: emptySummary, rows: [] });
        setNotice({ type: "error", text: "Pilih jadwal mengajar terlebih dahulu untuk menampilkan rekap mapel." });
        return;
      }
      params.jadwal_id = rekapFilter.jadwal_id;
      if (selectedRekapJadwal?.kelas_id) params.kelas_id = selectedRekapJadwal.kelas_id;
      if (selectedRekapJadwal?.mapel) params.mapel = selectedRekapJadwal.mapel;
    }

    setRekapLoading(true);
    setNotice(null);

    const result = await getRekapAbsensiGuru(params);
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
      filename: `rekap-absensi-${rekapIsHomeroom ? "kelas" : "mapel"}-${rekapFilter.dari || "awal"}-${rekapFilter.sampai || "akhir"}.xls`,
      title: rekapIsHomeroom ? "Rekapitulasi Absensi Kelas" : "Rekapitulasi Absensi Mata Pelajaran",
      subtitle: `${rekapIsHomeroom ? "Absensi Kelas" : `Mapel ${selectedRekapJadwal?.mapel || rekapFilter.mapel || "-"}`} - Periode ${rekapFilter.dari || "awal"} sampai ${rekapFilter.sampai || "akhir"}`,
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
        { header: rekapIsHomeroom ? "Jenis Absensi" : "Mata Pelajaran", value: (row) => rekapIsHomeroom ? "Absensi Kelas" : row.mapel || "-" },
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
    const announcements = dashboard.pengumumanTerbaru || [];

    return (
      <section className="teacher-panel">
        <div className="teacher-panel-header">
          <span>Dasbor</span>
          <h1>Informasi Sekolah</h1>
          <p>Ringkasan sekolah, profil guru, dan pengumuman terbaru untuk aktivitas harian.</p>
        </div>

        <div className="teacher-profile-overview">
          <article className="teacher-card profile-card teacher-profile-card">
            <div className="teacher-card-title">
              <span>Ringkasan Profil</span>
              <strong>{roleLabel}</strong>
            </div>

            <div className="teacher-profile-head">
              <div className="teacher-profile-avatar" aria-hidden="true">
                <span>{teacherInitial}</span>
              </div>
              <div className="teacher-profile-identity">
                <h2>{dashboard.user?.name}</h2>
                <p>{roleLabel}</p>
              </div>
            </div>

            <div className="teacher-profile-list">
              <div><span>Kelas Akses</span><strong>{classOptions.map((item) => item.nama_kelas).join(", ") || "Belum diset"}</strong></div>
              {displaySubject && <div><span>Mata Pelajaran</span><strong>{displaySubject}</strong></div>}
            </div>
          </article>
        </div>

        <div className="teacher-grid">
          <article className="teacher-card announcement-card">
            <h3>Pengumuman Terbaru</h3>
            {announcements.length === 0 ? (
              <p className="teacher-empty">Belum ada pengumuman terbaru.</p>
            ) : (
              <div className="teacher-announcement-list">
                {announcements.map((item) => {
                  const isOpen = expandedAnnouncements.includes(item.id);
                  return (
                    <div className={`teacher-announcement${isOpen ? " expanded" : ""}`} key={item.id}>
                      <span>{formatDate(item.date)}</span>
                      <strong>{item.title}</strong>
                      {isOpen && <p>{item.content}</p>}
                      <button
                        type="button"
                        className="teacher-announcement-toggle"
                        onClick={() => toggleAnnouncement(item.id)}
                        aria-expanded={isOpen}
                      >
                        {isOpen ? "Tutup" : "Selengkapnya"}
                      </button>
                    </div>
                  );
                })}
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
        <p>{isWali ? "Wali kelas hanya mengakses kelas wali, sedangkan guru mapel melakukan absensi sesuai jadwal aktif." : "Guru mata pelajaran melakukan absensi berdasarkan kelas, mata pelajaran, hari, dan jam yang disetujui admin."}</p>
      </div>

      <div className="teacher-table-wrap">
        <table className="teacher-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Mata Pelajaran</th>
              <th>Kelas</th>
              <th>Hari</th>
              <th>Jam</th>
            </tr>
          </thead>
          <tbody>
            {isWali && (
              <tr>
                <td>1</td>
                <td>Absensi Kelas</td>
                <td>{profile?.kelas?.nama_kelas || "Belum diset"}</td>
                <td>Senin - Sabtu</td>
                <td>Awal masuk</td>
              </tr>
            )}
            {!isWali && (dashboard.jadwal || []).length === 0 ? (
              <tr><td colSpan="5" className="teacher-empty-cell">Belum ada jadwal mengajar dari admin.</td></tr>
            ) : (dashboard.jadwal || []).map((item, index) => (
              <tr key={item.id}>
                <td>{index + (isWali ? 2 : 1)}</td>
                <td>{item.mapel}</td>
                <td>{item.kelas?.nama_kelas || "-"}</td>
                <td>{item.hari}</td>
                <td>{formatTime(item.jam_mulai)} - {formatTime(item.jam_selesai)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderAbsensi = () => {
    const selectedClassName = attendanceIsHomeroom
      ? profile?.kelas?.nama_kelas || "Kelas belum diset admin"
      : selectedJadwal?.kelas?.nama_kelas || "Pilih jadwal mengajar";
    const selectedMapel = attendanceIsHomeroom ? "Absensi Kelas" : selectedJadwal?.mapel || "Pilih jadwal mengajar";
    const selectedJam = attendanceIsHomeroom ? "Awal masuk" : selectedJadwal ? `${formatTime(selectedJadwal.jam_mulai)} - ${formatTime(selectedJadwal.jam_selesai)}` : "Pilih jadwal";

    return (
      <section className="teacher-panel">
        <div className="teacher-panel-header compact">
          <span>Absensi</span>
          <h1>{attendanceIsHomeroom ? "Absensi" : "Absensi Mata Pelajaran"}</h1>
          <p>{attendanceIsHomeroom ? "Wali kelas mengisi absensi harian kelasnya." : "Guru mata pelajaran mengisi absensi sesuai mata pelajaran dan jam mengajar aktif."}</p>
        </div>

        {isWali && hasSubjectRoster && (
          <div className="teacher-actions-row attendance-mode-switch">
            <button type="button" className={attendanceMode === "homeroom" ? "teacher-primary" : "teacher-secondary"} onClick={() => setAttendanceMode("homeroom")}>
              Absensi Kelas
            </button>
            <button type="button" className={attendanceMode === "subject" ? "teacher-primary" : "teacher-secondary"} onClick={() => setAttendanceMode("subject")}>
              Absensi Jadwal Mapel
            </button>
          </div>
        )}

        <form onSubmit={handleSubmitAbsensi} className="teacher-form-stack">
          <div className="teacher-form-grid four-columns">
            <label className="teacher-field">Tanggal
              <input type="date" value={tanggal} onChange={(event) => setTanggal(event.target.value)} required />
            </label>

            <label className="teacher-field">Kelas
              <input value={selectedClassName} readOnly />
            </label>

            <label className="teacher-field">Mata Pelajaran
              <input value={selectedMapel} readOnly />
            </label>

            <label className="teacher-field">Jam
              <input value={selectedJam} readOnly />
            </label>
          </div>

          {!attendanceIsHomeroom && hasSubjectRoster && (
            <label className="teacher-field">Pilih Jadwal Mengajar
              <select value={jadwalId} onChange={(event) => setJadwalId(event.target.value)} required>
                {(dashboard.jadwal || []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.mapel} - {item.kelas?.nama_kelas} - {item.hari} - {formatTime(item.jam_mulai)}-{formatTime(item.jam_selesai)}
                  </option>
                ))}
              </select>
            </label>
          )}

          {renderSummaryCards(attendanceSummary.total ? attendanceSummary : savedAttendanceSummary)}

          <div className="teacher-table-wrap">
            <table className="teacher-table attendance-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama Siswa</th>
                  <th>NIS</th>
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
              {savingAbsensi ? "Menyimpan..." : "Simpan Absensi"}
            </button>
          </div>

          <div className="saved-attendance-panel">
            <div className="saved-attendance-heading">
              <div>
                <span>Data Absensi Tersimpan</span>
                <strong>{loadingSavedAttendance ? "Memuat data tersimpan..." : `${savedAttendanceSummary.total || 0} data absensi tersimpan`}</strong>
              </div>
              <p>
                {attendanceIsHomeroom
                  ? `Absensi kelas ${selectedClassName} untuk tanggal ${formatDate(tanggal)}.`
                  : `Absensi ${selectedMapel} kelas ${selectedClassName} untuk tanggal ${formatDate(tanggal)}.`}
              </p>
            </div>

            {currentSavedAttendanceError ? (
              <p className="saved-attendance-empty error">{currentSavedAttendanceError}</p>
            ) : loadingSavedAttendance ? (
              <p className="saved-attendance-empty">Sedang memuat data absensi yang sudah tersimpan...</p>
            ) : currentSavedAttendanceRows.length === 0 ? (
              <p className="saved-attendance-empty">Belum ada data absensi tersimpan untuk tanggal ini.</p>
            ) : (
              <div className="teacher-table-wrap saved-attendance-table-wrap">
                <table className="teacher-table saved-attendance-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Nama Siswa</th>
                      <th>NIS</th>
                      <th>Status</th>
                      <th>Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentSavedAttendanceRows.map((row, index) => (
                      <tr key={`${row.siswa_id}-${index}`}>
                        <td>{index + 1}</td>
                        <td>{row.siswa?.nama || "-"}</td>
                        <td>{row.siswa?.nisn || "-"}</td>
                        <td><span className={`teacher-badge status-${row.status}`}>{getStatusLabel(row.status)}</span></td>
                        <td>{row.keterangan || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </form>
      </section>
    );
  };

  const renderRekap = () => {
    const rekapClassName = rekapIsHomeroom
      ? profile?.kelas?.nama_kelas || "Kelas wali belum diset"
      : selectedRekapJadwal?.kelas?.nama_kelas || "Pilih jadwal mengajar";
    const rekapMapelName = selectedRekapJadwal?.mapel || rekapFilter.mapel || "Pilih jadwal mengajar";
    const rekapModeLabel = rekapIsHomeroom ? "Rekap Absensi Kelas" : "Rekap Absensi Mata Pelajaran";

    return (
      <section className="teacher-panel teacher-rekap-panel">
        <div className="teacher-panel-header compact">
          <span>Rekapitulasi</span>
          <h1>{rekapModeLabel}</h1>
          <p>{rekapIsHomeroom ? "Data ini hanya mengambil absensi wali kelas, bukan absensi mata pelajaran." : "Data ini hanya mengambil absensi jadwal mapel yang dipilih, bukan absensi kelas wali."}</p>
        </div>

        {isWali && (hasSubjectRoster || rekapJadwalOptions.length > 0) && (
          <div className="teacher-actions-row attendance-mode-switch rekap-mode-switch">
            <button type="button" className={rekapMode === "homeroom" ? "teacher-primary" : "teacher-secondary"} onClick={() => handleRekapModeChange("homeroom")}>
              Rekap Absensi Kelas
            </button>
            <button type="button" className={rekapMode === "subject" ? "teacher-primary" : "teacher-secondary"} onClick={() => handleRekapModeChange("subject")}>
              Rekap Absensi Mapel
            </button>
          </div>
        )}

        <div className="teacher-rekap-filter-card">
          <div className="teacher-form-grid teacher-rekap-grid">
            {rekapIsHomeroom ? (
              <label className="teacher-field">Kelas Wali
                <input value={rekapClassName} readOnly />
              </label>
            ) : (
              <>
                <label className="teacher-field">Jadwal Mengajar
                  <select name="jadwal_id" value={rekapFilter.jadwal_id} onChange={handleRekapFilter} required>
                    <option value="">Pilih jadwal mengajar</option>
                    {rekapJadwalOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.mapel} - {item.kelas?.nama_kelas} - {item.hari} - {formatTime(item.jam_mulai)}-{formatTime(item.jam_selesai)}{item.milik_sendiri ? " · Saya" : item.guru_nama ? ` · ${item.guru_nama}` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="teacher-field">Kelas
                  <input value={rekapClassName} readOnly />
                </label>

                <label className="teacher-field">Mata Pelajaran
                  <input value={rekapMapelName} readOnly />
                </label>
              </>
            )}

            <label className="teacher-field">Dari
              <input type="date" name="dari" value={rekapFilter.dari} onChange={handleRekapFilter} />
            </label>

            <label className="teacher-field">Sampai
              <input type="date" name="sampai" value={rekapFilter.sampai} onChange={handleRekapFilter} />
            </label>
          </div>

          <div className="teacher-actions-row teacher-rekap-actions">
            <button type="button" className="teacher-primary" onClick={loadRekap} disabled={rekapLoading}>
              {rekapLoading ? "Memuat..." : "Tampilkan"}
            </button>
            <button type="button" className="teacher-secondary" onClick={exportRekap} disabled={!rekap.rows.length}>
              Ekspor Excel
            </button>
          </div>
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
                <th>{rekapIsHomeroom ? "Jenis Absensi" : "Mata Pelajaran"}</th>
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
                  <td>{rekapIsHomeroom ? "Absensi Kelas" : row.mapel || "-"}</td>
                  <td><span className={`teacher-badge status-${row.status}`}>{getStatusLabel(row.status)}</span></td>
                  <td>{row.keterangan || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  };

  const renderProfil = () => (
    <section className="teacher-panel">
      <div className="teacher-panel-header compact">
        <span>Edit Profil</span>
        <h1>Edit Profil Guru</h1>
        <p>Perbarui nama tampilan akun. Email akun tidak dapat diubah dan hanya bisa diganti oleh admin.</p>
      </div>

      <form className="teacher-form-stack teacher-profile-form" onSubmit={handleSaveProfile}>
        <div className="teacher-form-grid">
          <label className="teacher-field">Nama Lengkap
            <input name="name" value={profileForm.name} onChange={handleProfileChange} required />
          </label>
          <label className="teacher-field">Email (tidak dapat diubah)
            <input type="email" name="email" value={profileForm.email} readOnly disabled />
          </label>
          <label className="teacher-field">Peran
            <input value={roleLabel} readOnly disabled />
          </label>
          <label className="teacher-field">Kelas Akses
            <input value={classOptions.map((item) => item.nama_kelas).join(", ") || "Belum diset"} readOnly disabled />
          </label>
        </div>

        <div className="teacher-actions-row">
          <button className="teacher-primary" type="submit" disabled={savingProfile}>
            {savingProfile ? "Menyimpan..." : "Simpan Profil"}
          </button>
        </div>
      </form>
    </section>
  );

  const renderActivePanel = () => {
    if (activeMenu === "jadwal") return renderJadwal();
    if (activeMenu === "absensi") return renderAbsensi();
    if (activeMenu === "rekap") return renderRekap();
    if (activeMenu === "profil") return renderProfil();
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
              const label = item.label;
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
