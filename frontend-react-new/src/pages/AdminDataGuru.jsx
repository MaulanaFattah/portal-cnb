import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import { getGuru, getGuruRegistrations, logout } from "../services/api";

/**
 * Memecah teks daftar mata pelajaran menjadi array yang bersih.
 * Parameter: value - teks mapel dipisah koma/titik koma/plus.
 * Mengembalikan: array nama mapel, mengecualikan entri generik.
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
 */
function isHomeroomProfile(profile = {}) {
  return Boolean(profile.is_homeroom) || profile.teacher_type === "wali_kelas";
}

/**
 * Mengecek apakah profil guru merupakan guru mata pelajaran.
 */
function isSubjectTeacherProfile(profile = {}) {
  return profile.teacher_type === "mapel" && normalizeSubjects(profile.subject).length > 0;
}

/**
 * Halaman Admin Data Guru.
 *
 * Menampilkan daftar guru (gabungan master guru + akun guru) beserta NIP,
 * jabatan mengajar, jenjang, dan status kepemilikan akun. Hanya menampilkan
 * data (read-only); proses verifikasi & jadwal ada di halaman Verifikasi Guru.
 *
 * Peran/akses: hanya admin.
 */
function AdminDataGuru() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [masterGuru, setMasterGuru] = useState([]);

  /**
   * Memuat data akun guru (registrasi) dan master guru secara paralel.
   */
  const loadData = async () => {
    const [guruResult, masterResult] = await Promise.all([
      getGuruRegistrations(),
      getGuru()
    ]);
    if (guruResult.success) setAccounts(guruResult.data || []);
    if (masterResult.success) setMasterGuru(masterResult.data || []);
  };

  useEffect(() => {
    (async () => { await loadData(); })();
  }, []);

  /**
   * Keluar dari sesi admin.
   */
  const handleLogout = () => {
    logout();
    navigate("/admin-login");
  };

  // Gabungan data guru: master guru (sumber NIP/jenjang/jabatan) digabung dengan
  // akun guru (User + profil) untuk menandai apakah guru sudah punya akun.
  const dataGuru = (() => {
    const byKey = new Map();
    const keyOf = (name, email) => (email ? `email:${String(email).toLowerCase()}` : `name:${String(name || "").toLowerCase()}`);

    (masterGuru || []).forEach((g) => {
      byKey.set(keyOf(g.nama, g.email), {
        nama: g.nama || "-",
        nip: g.nip || "-",
        ngajar: g.jabatan || g.mata_pelajaran || "-",
        jenjang: g.jenjang || "",
        punyaAkun: false
      });
    });

    (accounts || []).forEach((a) => {
      const profile = a.guruProfile || {};
      const key = keyOf(a.name, a.email);
      const existing = byKey.get(key) || {};
      const roles = [];
      if (isHomeroomProfile(profile)) roles.push("Wali Kelas");
      if (isSubjectTeacherProfile(profile)) roles.push("Guru Mata Pelajaran");
      byKey.set(key, {
        nama: a.name || existing.nama || "-",
        nip: existing.nip || "-",
        ngajar: roles.join(" + ") || existing.ngajar || "-",
        jenjang: profile.jenjang || existing.jenjang || "",
        punyaAkun: true
      });
    });

    return Array.from(byKey.values()).sort((x, y) => String(x.nama).localeCompare(String(y.nama), "id"));
  })();

  return (
    <div className="dashboard-layout">
      <AdminSidebar active="/admin/guru" />

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Guru</h1>
            <p>Data guru beserta jabatan mengajar, jenjang, dan status kepemilikan akun.</p>
          </div>
          <div className="dashboard-actions">
            <Link to="/admin/verifikasi-guru" className="btn secondary">Verifikasi Guru</Link>
            <button onClick={handleLogout} className="btn primary">Keluar</button>
          </div>
        </div>

        <section className="dashboard-card admin-stack">
          <h3>Data Guru</h3>
          {dataGuru.length === 0 ? (
            <p className="empty-text">Belum ada data guru.</p>
          ) : (
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Nama</th>
                    <th>NIP</th>
                    <th>Ngajar Sebagai</th>
                    <th>Jenjang</th>
                    <th>Status Akun</th>
                  </tr>
                </thead>
                <tbody>
                  {dataGuru.map((guru, index) => (
                    <tr key={`${guru.nama}-${index}`}>
                      <td data-label="No">{index + 1}</td>
                      <td data-label="Nama">{guru.nama}</td>
                      <td data-label="NIP">{guru.nip || "-"}</td>
                      <td data-label="Ngajar Sebagai">{guru.ngajar || "-"}</td>
                      <td data-label="Jenjang">{guru.jenjang ? guru.jenjang.toUpperCase() : "-"}</td>
                      <td data-label="Status Akun">
                        <span className={`status-badge ${guru.punyaAkun ? "approved" : "pending"}`}>
                          {guru.punyaAkun ? "Sudah punya akun" : "Belum punya akun"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default AdminDataGuru;
