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
  { id: "profil", label: "Profil Guru" },
  { id: "jadwal", label: "Jadwal Mengajar" },
  { id: "absensi", label: "Absensi" },
  { id: "rekap", label: "Rekapitulasi Absensi" }
];

const emptySummary = { hadir: 0, izin: 0, sakit: 0, alpha: 0, total: 0 };

/**
 * Mengubah objek Date menjadi string format "YYYY-MM-DD" yang dipakai oleh input bertipe date.
 * @param {Date} [date=new Date()] Tanggal yang akan dikonversi (default: tanggal hari ini).
 * @returns {string} Tanggal dalam format ISO singkat "YYYY-MM-DD".
 * Efek: murni (tidak memanggil API maupun mengubah state).
 */
function toDateInputValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Mengembalikan tanggal hari ini dalam format "YYYY-MM-DD".
 * @returns {string} Tanggal hari ini.
 * Efek: murni (tidak memanggil API maupun mengubah state).
 */
function todayISO() {
  return toDateInputValue();
}

/**
 * Mengembalikan tanggal 1 (awal) bulan berjalan dalam format "YYYY-MM-DD".
 * Dipakai sebagai nilai default awal periode filter rekap absensi.
 * @returns {string} Tanggal awal bulan ini.
 * Efek: murni (tidak memanggil API maupun mengubah state).
 */
function firstDayOfMonthISO() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * Memformat nilai tanggal menjadi teks lokal Indonesia (contoh: "05 Jan 2024").
 * @param {string|Date} value Nilai tanggal yang akan diformat.
 * @returns {string} Teks tanggal terformat, atau "-" jika nilai kosong.
 * Efek: murni (tidak memanggil API maupun mengubah state).
 */
function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Memformat nilai waktu menjadi format jam "HH:MM" (mengambil 5 karakter pertama).
 * @param {string} value Nilai waktu (mis. "07:30:00").
 * @returns {string} Waktu format "HH:MM", atau "-" jika nilai kosong.
 * Efek: murni (tidak memanggil API maupun mengubah state).
 */
function formatTime(value) {
  return value ? String(value).slice(0, 5) : "-";
}

/**
 * Mengubah kode status absensi menjadi label yang mudah dibaca.
 * @param {string} value Kode status (mis. "hadir", "izin", "sakit", "alpha").
 * @returns {string} Label status dari ABSENSI_OPTIONS, atau nilai aslinya bila tidak ditemukan.
 * Efek: murni (tidak memanggil API maupun mengubah state).
 */
function getStatusLabel(value) {
  return ABSENSI_OPTIONS.find((item) => item.value === value)?.label || value;
}

/**
 * Menghitung ringkasan (jumlah per status dan total) dari daftar baris absensi.
 * @param {Array<{status?: string}>} [rows=[]] Daftar baris absensi yang akan diringkas.
 * @returns {{hadir:number,izin:number,sakit:number,alpha:number,total:number}} Objek ringkasan.
 * Efek: murni (tidak memanggil API maupun mengubah state); hanya status valid yang dihitung.
 */
function summarizeAttendanceRows(rows = []) {
  return rows.reduce((summary, row) => {
    const status = row?.status;
    if (!ABSENSI_OPTIONS.some((item) => item.value === status)) return summary;
    summary[status] += 1;
    summary.total += 1;
    return summary;
  }, { ...emptySummary });
}

/**
 * Memeriksa apakah label mata pelajaran sebenarnya menandakan peran "wali kelas".
 * Dipakai agar label "Wali Kelas" tidak ditampilkan sebagai mata pelajaran biasa.
 * @param {string} value Teks label mata pelajaran yang akan dicek.
 * @returns {boolean} true jika nilai termasuk label wali kelas.
 * Efek: murni (tidak memanggil API maupun mengubah state).
 */
function isHomeroomSubjectLabel(value) {
  return ["wali kelas", "guru wali kelas"].includes(String(value || "").trim().toLowerCase());
}

/**
 * Halaman Dashboard Guru (portal guru).
 * Akses: pengguna dengan peran Guru (guru mata pelajaran dan/atau wali kelas) yang sudah login.
 * Fungsi halaman: menampilkan ringkasan profil & pengumuman, jadwal mengajar, pengisian
 * absensi (mode wali kelas atau mode mata pelajaran), serta rekapitulasi absensi yang
 * dapat diekspor ke Excel. Bila sesi tidak valid, pengguna diarahkan ke "/login-guru".
 */
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
  const [missingStudentIds, setMissingStudentIds] = useState([]);
  const [profileForm, setProfileForm] = useState({ name: "", email: "", no_telepon: "", alamat: "", jenis_kelamin: "", foto: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [rekapLoading, setRekapLoading] = useState(false);
  const [rekap, setRekap] = useState({ summary: emptySummary, rows: [] });
  const [rekapFilter, setRekapFilter] = useState({
    kelas_id: "",
    jadwal_id: "",
    mapel: "",
    dari: firstDayOfMonthISO(),
    sampai: todayISO()
  });
  // Efek pemuatan awal: mengambil data dashboard guru dari API saat komponen mount,
  // lalu menyiapkan nilai default jadwal, mode absensi/rekap, filter, dan form profil.
  useEffect(() => {
    /**
     * Memuat data dashboard guru dari server dan menginisialisasi state halaman.
     * Memanggil API: getGuruDashboard().
     * Efek state: bila gagal -> alert + navigate ke "/login-guru"; bila sukses ->
     * setJadwalId, setAttendanceMode, setRekapMode, setRekapFilter, setProfileForm,
     * setDashboard, dan setLoading(false).
     */
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
      setProfileForm({
        name: data.user?.name || "",
        email: data.user?.email || "",
        no_telepon: data.guruProfile?.no_telepon || "",
        alamat: data.guruProfile?.alamat || "",
        jenis_kelamin: data.guruProfile?.jenis_kelamin || "",
        foto: data.guruProfile?.foto || ""
      });
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

  // Daftar kelas yang dapat diakses guru: dari kelasAkses bila ada, jika tidak dari kelas wali.
  const classOptions = useMemo(() => {
    if (!dashboard) return [];
    if (dashboard.kelasAkses?.length) return dashboard.kelasAkses.filter(Boolean);
    return dashboard.guruProfile?.kelas ? [dashboard.guruProfile.kelas] : [];
  }, [dashboard]);

  // Objek jadwal mengajar yang sedang dipilih untuk pengisian absensi mapel.
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

  // Objek jadwal yang sedang dipilih khusus pada filter REKAP mapel.
  const selectedRekapJadwal = useMemo(() => {
    if (!rekapFilter.jadwal_id) return null;
    return rekapJadwalOptions.find((item) => Number(item.id) === Number(rekapFilter.jadwal_id)) || null;
  }, [rekapJadwalOptions, rekapFilter.jadwal_id]);

  const rekapIsHomeroom = isWali && rekapMode === "homeroom";
  const attendanceContextKey = attendanceIsHomeroom
    ? `wali-${profile?.kelas_id || "none"}-${tanggal || "no-date"}`
    : `mapel-${jadwalId || "none"}-${tanggal || "no-date"}`;
  // Entri absensi (status & keterangan per siswa) untuk konteks absensi yang sedang aktif.
  const entries = useMemo(() => attendanceEntryBuckets[attendanceContextKey] || {}, [attendanceEntryBuckets, attendanceContextKey]);
  const savedAttendanceSummary = savedAttendanceSummaries[attendanceContextKey] || emptySummary;
  const currentSavedAttendanceRows = savedAttendanceRows[attendanceContextKey] || [];
  const currentSavedAttendanceError = savedAttendanceErrors[attendanceContextKey] || "";

  const attendanceClassId = attendanceIsHomeroom ? profile?.kelas_id : selectedJadwal?.kelas_id;

  // Daftar siswa yang termasuk dalam kelas absensi yang sedang aktif.
  const siswaList = useMemo(() => {
    if (!dashboard || !attendanceClassId) return [];
    return (dashboard.siswa || []).filter((siswa) => Number(siswa.kelas_id) === Number(attendanceClassId));
  }, [dashboard, attendanceClassId]);

  // Ringkasan absensi yang sedang diisi (dihitung dari entri yang punya status valid).
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

  /**
   * Menerapkan baris absensi tersimpan (hasil dari server) ke state lokal halaman.
   * @param {string} contextKey Kunci konteks absensi (gabungan mode/kelas/jadwal/tanggal).
   * @param {Array} rows Baris absensi mentah dari server.
   * Efek state: menormalkan baris (hanya siswa pada kelas aktif), lalu memperbarui
   * attendanceEntryBuckets (entri form), savedAttendanceRows (baris tersimpan), dan
   * savedAttendanceSummaries (ringkasan) untuk contextKey terkait.
   */
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

  // Efek: setiap kali tanggal/kelas/jadwal absensi berubah, muat data absensi yang
  // sudah tersimpan dari server agar form menampilkan kondisi terkini.
  useEffect(() => {
    if (!dashboard || !tanggal || !attendanceClassId || siswaList.length === 0 || (!attendanceIsHomeroom && !jadwalId)) {
      return undefined;
    }

    let active = true;
    /**
     * Mengambil data absensi tersimpan untuk konteks (tanggal + kelas/jadwal) aktif.
     * Memanggil API: getRekapAbsensiGuru(params) dengan rentang tanggal sehari.
     * Efek state: setLoadingSavedAttendance, setSavedAttendanceErrors, dan menerapkan
     * hasil lewat applySavedAttendanceRows. Memakai flag "active" untuk mencegah update
     * state setelah komponen/efek dibersihkan.
     */
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

  /**
   * Menangani perubahan input pada form profil guru.
   * @param {Event} event Event perubahan input (membawa name & value).
   * Efek state: memperbarui field terkait pada profileForm.
   */
  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
  };

  /**
   * Membaca file foto yang dipilih guru dan mengonversinya ke data URL (base64)
   * untuk disimpan pada profileForm.foto.
   * @param {Event} event Event input file.
   */
  const handleFoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setProfileForm((current) => ({ ...current, foto: reader.result }));
    reader.readAsDataURL(file);
  };

  /**
   * Menyimpan perubahan nama profil guru ke server.
   * @param {Event} event Event submit form profil (dicegah default-nya).
   * Memanggil API: updateGuruProfile({ name }).
   * Efek state: setSavingProfile, setNotice (sukses/gagal); bila sukses memperbarui
   * nama user pada state dashboard.
   */
  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setNotice(null);
    const result = await updateGuruProfile({
      name: profileForm.name,
      no_telepon: profileForm.no_telepon,
      alamat: profileForm.alamat,
      jenis_kelamin: profileForm.jenis_kelamin,
      foto: profileForm.foto
    });
    setSavingProfile(false);
    setNotice({ type: result.success ? "success" : "error", text: result.message });
    if (result.success) {
      setEditingProfile(false);
      setDashboard((current) => current ? {
        ...current,
        user: { ...current.user, name: profileForm.name },
        guruProfile: current.guruProfile ? {
          ...current.guruProfile,
          no_telepon: profileForm.no_telepon,
          alamat: profileForm.alamat,
          jenis_kelamin: profileForm.jenis_kelamin,
          foto: profileForm.foto
        } : current.guruProfile
      } : current);
    }
  };

  /**
   * Membuka/menutup (toggle) tampilan isi pengumuman pada daftar pengumuman.
   * @param {number|string} id ID pengumuman yang di-toggle.
   * Efek state: menambah/menghapus id dari expandedAnnouncements.
   */
  const toggleAnnouncement = (id) => {
    setExpandedAnnouncements((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  /**
   * Melakukan logout guru dan kembali ke beranda.
   * Memanggil: logout() (menghapus sesi/token), lalu navigate ke "/".
   */
  const handleLogout = () => {
    logout();
    navigate("/");
  };

  /**
   * Memperbarui satu field entri absensi untuk seorang siswa.
   * @param {number|string} id ID siswa.
   * @param {string} field Nama field yang diubah ("status" atau "keterangan").
   * @param {string} value Nilai baru field.
   * Efek state: memperbarui attendanceEntryBuckets pada konteks absensi aktif.
   */
  const handleEntry = (id, field, value) => {
    if (field === "status" && value) {
      setMissingStudentIds((previous) => previous.filter((studentId) => Number(studentId) !== Number(id)));
    }
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

  /**
   * Mengirim (menyimpan) data absensi siswa ke server.
   * @param {Event} event Event submit form absensi (dicegah default-nya).
   * Validasi: minimal satu siswa harus dipilih statusnya, jika tidak menampilkan notice error.
   * Memanggil API: submitAbsensiGuru({ tanggal, kelas_id, jadwal_id, entries }).
   * Efek state: setSavingAbsensi, setNotice; bila sukses menyusun savedRows lalu
   * memanggil applySavedAttendanceRows untuk menyegarkan data tersimpan.
   */
  const handleSubmitAbsensi = async (event) => {
    event.preventDefault();
    setNotice(null);

    if (siswaList.length === 0) {
      setNotice({ type: "error", text: "Belum ada siswa untuk kelas absensi ini." });
      return;
    }

    // Validasi: SEMUA siswa wajib memiliki status kehadiran sebelum disimpan.
    const missingIds = siswaList
      .filter((siswa) => !entries[siswa.id]?.status)
      .map((siswa) => siswa.id);

    if (missingIds.length > 0) {
      setMissingStudentIds(missingIds);
      setNotice({ type: "error", text: "Semua data kehadiran siswa wajib diisi sebelum absensi disimpan." });
      return;
    }

    setMissingStudentIds([]);
    setSavingAbsensi(true);
    const selectedEntries = siswaList.map((siswa) => entries[siswa.id]);

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

  /**
   * Menangani perubahan field pada filter rekap absensi.
   * @param {Event} event Event perubahan input/select (membawa name & value).
   * Efek state: mengosongkan rekap saat ini, lalu memperbarui rekapFilter. Khusus saat
   * field "jadwal_id" berubah, ikut menyetel kelas_id dan mapel dari jadwal terpilih.
   */
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

  /**
   * Mengganti mode rekap absensi antara "homeroom" (kelas wali) dan "subject" (mapel).
   * @param {"homeroom"|"subject"} mode Mode rekap yang dipilih.
   * Efek state: setRekapMode, mengosongkan rekap & notice, dan menyesuaikan rekapFilter
   * (kelas_id/jadwal_id/mapel) sesuai mode terpilih.
   */
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

  /**
   * Memuat data rekapitulasi absensi dari server sesuai filter aktif.
   * Validasi: mode kelas wali butuh kelas_id wali; mode mapel butuh jadwal_id terpilih.
   * Memanggil API: getRekapAbsensiGuru(params) dengan parameter rentang tanggal dan
   * kelas_id/jadwal_id/mapel sesuai mode.
   * Efek state: setRekapLoading, setNotice (bila error), dan setRekap dengan hasil.
   */
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

  /**
   * Mengekspor data rekap absensi yang sedang ditampilkan ke berkas Excel (.xls).
   * Tidak melakukan apa-apa bila rekap.rows kosong.
   * Memanggil: exportExcel({...}) dengan judul, ringkasan, kolom, dan baris sesuai mode.
   * Efek: memicu unduhan berkas; tidak mengubah state.
   */
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

  /**
   * Merender kartu-kartu ringkasan absensi (Hadir/Izin/Sakit/Alpha + Total).
   * @param {{hadir:number,izin:number,sakit:number,alpha:number,total:number}} summary Ringkasan yang ditampilkan.
   * @returns {JSX.Element} Elemen kartu ringkasan.
   */
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

  /**
   * Merender panel Dasbor: ringkasan profil guru dan daftar pengumuman terbaru.
   * @returns {JSX.Element} Panel dasbor.
   */
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

  /**
   * Merender panel Jadwal Mengajar: tabel jadwal (termasuk baris absensi kelas untuk wali).
   * @returns {JSX.Element} Panel jadwal mengajar.
   */
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

  /**
   * Merender panel Absensi: form pemilihan tanggal/jadwal, pengalihan mode (kelas/mapel),
   * tabel pengisian status siswa, tombol simpan, dan daftar absensi tersimpan.
   * @returns {JSX.Element} Panel absensi.
   */
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
                ) : siswaList.map((siswa, index) => {
                  const isMissing = missingStudentIds.includes(siswa.id);
                  return (
                  <tr key={siswa.id} className={isMissing ? "attendance-missing-row" : ""}>
                    <td>{index + 1}</td>
                    <td>{siswa.nama}</td>
                    <td>{siswa.nisn}</td>
                    <td>
                      <select className={isMissing ? "attendance-missing-select" : ""} value={entries[siswa.id]?.status || ""} onChange={(event) => handleEntry(siswa.id, "status", event.target.value)}>
                        <option value="">Pilih status</option>
                        {ABSENSI_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                      </select>
                      {isMissing && <span className="attendance-missing-flag">Wajib diisi</span>}
                    </td>
                    <td>
                      <input value={entries[siswa.id]?.keterangan || ""} onChange={(event) => handleEntry(siswa.id, "keterangan", event.target.value)} placeholder="Contoh: sakit demam" />
                    </td>
                  </tr>
                  );
                })}
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

  /**
   * Merender panel Rekapitulasi Absensi: pengalihan mode rekap, kartu filter periode,
   * kartu ringkasan, tabel hasil rekap, dan tombol ekspor Excel.
   * @returns {JSX.Element} Panel rekapitulasi absensi.
   */
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

  /**
   * Merender panel Profil Guru (hanya tampilan/baca data; perubahan data utama oleh admin).
   * @returns {JSX.Element} Panel profil guru.
   */
  const renderProfil = () => {
    const statusAkun = profile?.verification_status === "approved" ? "Aktif" : (profile?.verification_status || "-");
    const jkLabel = profileForm.jenis_kelamin === "P" ? "Perempuan" : profileForm.jenis_kelamin === "L" ? "Laki-laki" : "-";
    const waliLabel = isWali ? (profile?.kelas?.nama_kelas || "Ya") : "Bukan wali kelas";
    const details = [
      ["Nama", dashboard.user?.name || "-"],
      ["NIP / NUPTK", profile?.nip || profile?.nuptk || "-"],
      ["Email", dashboard.user?.email || "-"],
      ["No. HP", profileForm.no_telepon || "-"],
      ["Alamat", profileForm.alamat || "-"],
      ["Jenis Kelamin", jkLabel],
      ["Mata Pelajaran", displaySubject || "-"],
      ["Wali Kelas", waliLabel],
      ["Status Akun", statusAkun]
    ];

    return (
      <section className="teacher-panel">
        <div className="teacher-panel-header compact">
          <span>Profil</span>
          <h1>Profil Guru</h1>
          <p>Data pribadi guru. Anda dapat mengubah nama, no. HP, alamat, jenis kelamin, dan foto. Data utama (NIP, email, mapel, kelas) diatur oleh admin.</p>
        </div>

        {editingProfile ? (
          <form className="profile-layout" onSubmit={handleSaveProfile}>
            <div className="profile-photo-card">
              <div className="profile-photo">
                {profileForm.foto ? <img src={profileForm.foto} alt="Foto guru" /> : <span>{teacherInitial}</span>}
              </div>
              <label className="profile-photo-btn">
                Ubah Foto
                <input type="file" accept="image/*" onChange={handleFoto} hidden />
              </label>
            </div>

            <div className="profile-fields">
              <label className="teacher-field">Nama
                <input name="name" value={profileForm.name} onChange={handleProfileChange} required />
              </label>
              <label className="teacher-field">NIP / NUPTK
                <input value={profile?.nip || profile?.nuptk || "-"} readOnly disabled />
              </label>
              <label className="teacher-field">Email
                <input type="email" name="email" value={profileForm.email} readOnly disabled />
              </label>
              <label className="teacher-field">No. HP
                <input name="no_telepon" value={profileForm.no_telepon} onChange={handleProfileChange} placeholder="08xxxxxxxxxx" />
              </label>
              <label className="teacher-field">Alamat
                <input name="alamat" value={profileForm.alamat} onChange={handleProfileChange} placeholder="Alamat tempat tinggal" />
              </label>
              <label className="teacher-field">Jenis Kelamin
                <select name="jenis_kelamin" value={profileForm.jenis_kelamin} onChange={handleProfileChange}>
                  <option value="">Pilih</option>
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </label>
              <label className="teacher-field">Mata Pelajaran
                <input value={displaySubject || "-"} readOnly disabled />
              </label>

              <div className="teacher-actions-row">
                <button type="button" className="teacher-secondary" onClick={() => setEditingProfile(false)}>Batal</button>
                <button className="teacher-primary" type="submit" disabled={savingProfile}>
                  {savingProfile ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="profile-layout">
            <div className="profile-photo-card">
              <div className="profile-photo">
                {profileForm.foto ? <img src={profileForm.foto} alt="Foto guru" /> : <span>{teacherInitial}</span>}
              </div>
              <span className="teacher-role-pill">{roleLabel}</span>
            </div>

            <div className="profile-readonly">
              {details.map(([label, value]) => (
                <div className={label === "Alamat" ? "wide" : ""} key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
              <div className="teacher-actions-row">
                <button type="button" className="teacher-primary" onClick={() => setEditingProfile(true)}>Edit Profil</button>
              </div>
            </div>
          </div>
        )}
      </section>
    );
  };

  /**
   * Menentukan panel mana yang dirender berdasarkan menu aktif (activeMenu).
   * @returns {JSX.Element} Panel sesuai menu: jadwal/absensi/rekap/profil, default dasbor.
   */
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
