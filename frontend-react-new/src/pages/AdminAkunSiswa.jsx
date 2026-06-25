import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import PasswordField from "../components/PasswordField";
import {
  getUsersByRole,
  getSiswa,
  getKelas,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  createSiswa,
  updateSiswa,
  deleteSiswa,
  logout
} from "../services/api";

const linkedRoles = ["siswa", "orangtua"];

const roleLabels = {
  siswa: "Akun Siswa",
  orangtua: "Akun Orang Tua"
};

const tabs = [
  { id: "relasi", label: "Relasi" },
  { id: "siswa", label: "Siswa" },
  { id: "orangtua", label: "Orang Tua" }
];

const emptyStudentForm = {
  nisn: "",
  nama: "",
  kelas_id: "",
  tanggal_lahir: "",
  jenis_kelamin: "L",
  alamat: "",
  nama_ayah: "",
  no_telepon: ""
};

const emptyAccountForm = {
  name: "",
  email: "",
  password: "",
  role: "orangtua",
  siswa_id: "",
  profession: ""
};

function classLabel(item = {}) {
  return [item.nama_kelas, item.tingkat ? `Tingkat ${item.tingkat}` : null, item.tahun_ajaran].filter(Boolean).join(" - ");
}

function getStudentClassName(student) {
  return student?.kelas?.nama_kelas || (student?.kelas_id ? `Kelas ${student.kelas_id}` : "Belum ada kelas");
}

function romanToInt(value) {
  const map = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  const s = String(value || "").toUpperCase().replace(/[^IVXLCDM]/g, "");
  if (!s) return null;
  let total = 0;
  for (let i = 0; i < s.length; i += 1) {
    const current = map[s[i]];
    const next = map[s[i + 1]];
    if (next && current < next) total -= current;
    else total += current;
  }
  return total || null;
}

// Urutan kelas harus berdasarkan nilai tingkat (1..9), bukan urutan alfabet
// nama romawi (yang membuat IV muncul sebelum IX padahal 4 < 9 sudah benar,
// tapi V/VI/VII jadi kacau saat dibandingkan sebagai teks).
function getStudentClassRank(student) {
  const kelas = student?.kelas || {};
  const name = String(kelas.nama_kelas || "");
  if (/\btk\b/i.test(name) || /\btk\b/i.test(String(kelas.tingkat || ""))) return 0;
  const tingkat = parseInt(kelas.tingkat, 10);
  if (!Number.isNaN(tingkat)) return tingkat;
  const digit = name.match(/\d+/);
  if (digit) return parseInt(digit[0], 10);
  const roman = romanToInt(name);
  if (roman) return roman;
  return Number.MAX_SAFE_INTEGER;
}

function getStudentParentName(student) {
  return student?.nama_ayah || student?.nama_ibu || "Belum ada data orang tua";
}

function normalizePhoneNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("62")) return `0${digits.slice(2)}`;
  return digits;
}

function buildPortalEmail(nisn, type) {
  const cleanNisn = String(nisn || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (!cleanNisn) return "";
  return type === "siswa" ? `${cleanNisn}@cnb.sch.id` : `${cleanNisn}.ortu@cnb.sch.id`;
}

function generateTemporaryPassword(prefix) {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${random}`;
}

function getAccountPortalLinks(account) {
  const links = Array.isArray(account?.portalLinks) ? account.portalLinks : [];
  if (links.length > 0) return links;
  return account?.portalLink ? [account.portalLink] : [];
}

function getDefaultAccountName(role, student) {
  if (!student) return "";
  if (role === "orangtua") return student.nama_ayah || student.nama_ibu || `Orang Tua ${student.nama}`;
  return student.nama || "";
}

function getDefaultProfession(role, student) {
  if (!student) return "";
  if (role === "orangtua") {
    return [`Orang tua dari ${student.nama}`, student.no_telepon ? `No HP: ${student.no_telepon}` : null].filter(Boolean).join(" | ");
  }
  return `Siswa ${getStudentClassName(student)}`;
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

function AdminAkunSiswa() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [siswaList, setSiswaList] = useState([]);
  const [kelas, setKelas] = useState([]);
  const [activeTab, setActiveTab] = useState("relasi");
  const [search, setSearch] = useState("");

  const [studentForm, setStudentForm] = useState(emptyStudentForm);
  const [studentEditId, setStudentEditId] = useState(null);
  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
  const [credentials, setCredentials] = useState(null);

  const [accountDialog, setAccountDialog] = useState(null);
  const [accountForm, setAccountForm] = useState(emptyAccountForm);
  const [studentQuery, setStudentQuery] = useState("");
  const [isStudentListOpen, setIsStudentListOpen] = useState(false);

  const [resetDialog, setResetDialog] = useState(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [resetCredential, setResetCredential] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    const [siswaAccounts, parentAccounts, studentResult, kelasResult] = await Promise.all([
      getUsersByRole("siswa"),
      getUsersByRole("orangtua"),
      getSiswa(),
      getKelas()
    ]);
    setUsers([...(siswaAccounts.data || []), ...(parentAccounts.data || [])]);
    if (studentResult.success) setSiswaList(studentResult.data || []);
    if (kelasResult.success) setKelas(kelasResult.data || []);
  };

  useEffect(() => {
    (async () => {
      await loadData();
    })();
  }, []);

  const studentMap = useMemo(() => new Map(siswaList.map((student) => [String(student.id), student])), [siswaList]);

  const accountsByStudent = useMemo(() => {
    const accountMap = new Map();
    users.forEach((account) => {
      getAccountPortalLinks(account).forEach((link) => {
        const role = link.link_type || account.role;
        const studentId = String(link.siswa_id || "");
        if (!studentId || !linkedRoles.includes(role)) return;
        const current = accountMap.get(studentId) || {};
        accountMap.set(studentId, { ...current, [role]: account });
      });
    });
    return accountMap;
  }, [users]);

  const parentRows = useMemo(() => {
    return users
      .filter((account) => account.role === "orangtua")
      .map((account) => {
        const linkedStudents = getAccountPortalLinks(account)
          .map((link) => studentMap.get(String(link.siswa_id || "")))
          .filter(Boolean);
        const uniqueStudents = [...new Map(linkedStudents.map((student) => [String(student.id), student])).values()];
        return { account, students: uniqueStudents };
      })
      .sort((first, second) => (first.account.name || "").localeCompare(second.account.name || "", "id-ID"));
  }, [studentMap, users]);

  const accountStudentOptions = useMemo(() => {
    const keyword = studentQuery.trim().toLowerCase();
    const list = keyword
      ? siswaList.filter((student) => [student.nama, student.nisn, getStudentClassName(student)]
          .some((value) => String(value || "").toLowerCase().includes(keyword)))
      : siswaList;
    return [...list]
      .sort((first, second) => (first.nama || "").localeCompare(second.nama || "", "id-ID"))
      .slice(0, 50);
  }, [siswaList, studentQuery]);

  const reusableParentPreview = useMemo(() => {
    if (studentEditId) return null;
    const phone = normalizePhoneNumber(studentForm.no_telepon);
    if (!phone) return null;

    const sibling = siswaList.find((student) => normalizePhoneNumber(student.no_telepon) === phone);
    if (!sibling) return null;

    const parentAccount = accountsByStudent.get(String(sibling.id))?.orangtua || null;
    return {
      sibling,
      account: parentAccount,
      linkedCount: parentAccount ? getAccountPortalLinks(parentAccount).filter((link) => link.siswa_id).length : 0
    };
  }, [accountsByStudent, siswaList, studentEditId, studentForm.no_telepon]);


  const filteredStudents = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return siswaList
      .filter((student) => {
        const accounts = accountsByStudent.get(String(student.id)) || {};
        const values = [
          student.nama,
          student.nisn,
          getStudentClassName(student),
          getStudentParentName(student),
          student.no_telepon,
          accounts.siswa?.email,
          accounts.orangtua?.email
        ];
        return !keyword || values.some((value) => String(value || "").toLowerCase().includes(keyword));
      })
      .sort((first, second) => {
        const rankCompare = getStudentClassRank(first) - getStudentClassRank(second);
        if (rankCompare !== 0) return rankCompare;
        const classCompare = getStudentClassName(first).localeCompare(getStudentClassName(second), "id-ID");
        if (classCompare !== 0) return classCompare;
        return (first.nama || "").localeCompare(second.nama || "", "id-ID");
      });
  }, [accountsByStudent, search, siswaList]);

  const groupedStudentsByClass = useMemo(() => {
    const groups = new Map();
    filteredStudents.forEach((student) => {
      const className = getStudentClassName(student);
      if (!groups.has(className)) groups.set(className, []);
      groups.get(className).push(student);
    });
    return [...groups.entries()].map(([className, students]) => ({ className, students }));
  }, [filteredStudents]);


  const summaryItems = useMemo(() => {
    const studentAccounts = users.filter((account) => account.role === "siswa" && getAccountPortalLinks(account).some((link) => link.siswa_id)).length;
    const parentLinkedStudentIds = new Set();
    parentRows.forEach(({ students }) => students.forEach((student) => parentLinkedStudentIds.add(String(student.id))));
    return [
      { label: "Total Siswa", value: siswaList.length },
      { label: "Akun Siswa", value: studentAccounts },
      { label: "Akun Orang Tua", value: parentRows.length },
      { label: "Orang Tua Terhubung", value: parentLinkedStudentIds.size }
    ];
  }, [parentRows, siswaList.length, users]);

  const handleLogout = () => {
    logout();
    navigate("/admin-login");
  };

  const openCreateStudentDialog = () => {
    setStudentEditId(null);
    setStudentForm(emptyStudentForm);
    setCredentials(null);
    setIsStudentDialogOpen(true);
  };

  const openEditStudentDialog = (student) => {
    setStudentEditId(student.id);
    setStudentForm(toStudentFormData(student));
    setCredentials(null);
    setIsStudentDialogOpen(true);
  };

  const closeStudentDialog = () => {
    setStudentEditId(null);
    setStudentForm(emptyStudentForm);
    setIsStudentDialogOpen(false);
    setIsSubmitting(false);
  };

  const handleStudentChange = (event) => {
    const { name, value } = event.target;
    setStudentForm((current) => ({ ...current, [name]: value }));
  };

  const handleStudentSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setCredentials(null);

    const payload = toStudentFormData(studentForm);
    if (!studentEditId && reusableParentPreview?.account?.name) {
      payload.nama_ayah = reusableParentPreview.account.name;
    }
    const result = studentEditId ? await updateSiswa(studentEditId, payload) : await createSiswa(payload);
    setIsSubmitting(false);
    alert(result.message);

    if (result.success) {
      if (result.credentials) setCredentials(result.credentials);
      closeStudentDialog();
      await loadData();
    }
  };

  const handleStudentDelete = async (student) => {
    if (!confirm(`Yakin ingin menghapus data siswa ${student.nama}? Akun siswa ikut terhapus, akun orang tua tetap disimpan.`)) return;
    const result = await deleteSiswa(student.id);
    alert(result.message);
    if (result.success) await loadData();
  };

  const openAccountDialog = ({ role = "orangtua", student = null, account = null } = {}) => {
    const selectedStudent = student || studentMap.get(String(account?.portalLink?.siswa_id || "")) || null;
    const selectedRole = account?.role || role;
    const defaultEmail = account?.email || (selectedRole === "orangtua" && selectedStudent ? buildPortalEmail(selectedStudent.nisn, "orangtua") : "");
    setResetCredential(null);
    setAccountDialog({ role: selectedRole, student: selectedStudent, account });
    setStudentQuery(selectedStudent ? `${selectedStudent.nama} - ${getStudentClassName(selectedStudent)}` : "");
    setIsStudentListOpen(false);
    setAccountForm({
      name: account?.name || getDefaultAccountName(selectedRole, selectedStudent),
      email: defaultEmail,
      password: "",
      role: selectedRole,
      siswa_id: selectedStudent?.id || account?.portalLink?.siswa_id || "",
      profession: account?.profession || getDefaultProfession(selectedRole, selectedStudent)
    });
  };

  const closeAccountDialog = () => {
    setAccountDialog(null);
    setAccountForm(emptyAccountForm);
    setStudentQuery("");
    setIsStudentListOpen(false);
    setIsSubmitting(false);
  };

  const selectStudentForAccount = (student) => {
    setAccountDialog((current) => (current ? { ...current, student } : current));
    setStudentQuery(`${student.nama} - ${getStudentClassName(student)}`);
    setIsStudentListOpen(false);
    setAccountForm((current) => {
      const next = { ...current, siswa_id: String(student.id) };
      if (!accountDialog?.account) {
        next.name = getDefaultAccountName(accountDialog?.role, student);
        next.email = accountDialog?.role === "orangtua" ? buildPortalEmail(student.nisn, "orangtua") : current.email;
        next.profession = getDefaultProfession(accountDialog?.role, student);
      }
      return next;
    });
  };

  const handleAccountChange = (event) => {
    const { name, value } = event.target;

    if (name === "siswa_id" && accountDialog) {
      const selectedStudent = studentMap.get(String(value)) || null;
      setAccountDialog({ ...accountDialog, student: selectedStudent });
      setAccountForm((current) => {
        const next = { ...current, siswa_id: value };
        if (!accountDialog.account) {
          next.name = current.name || getDefaultAccountName(accountDialog.role, selectedStudent);
          next.profession = current.profession || getDefaultProfession(accountDialog.role, selectedStudent);
        }
        return next;
      });
      return;
    }

    setAccountForm((current) => ({ ...current, [name]: value }));
  };

  const handleAccountSubmit = async (event) => {
    event.preventDefault();
    if (!accountForm.siswa_id) {
      alert("Pilih siswa yang akan dihubungkan dengan akun ini.");
      return;
    }

    const selectedStudent = studentMap.get(String(accountForm.siswa_id));
    const existingParentAccount = accountsByStudent.get(String(accountForm.siswa_id))?.orangtua;
    if (accountDialog.role === "orangtua" && existingParentAccount && existingParentAccount.id !== accountDialog.account?.id) {
      alert(`Siswa ini sudah terhubung ke akun orang tua ${existingParentAccount.name}. Hapus/ganti relasi lama dulu jika ingin memakai akun lain.`);
      return;
    }

    const payload = { ...accountForm, role: accountDialog.role };
    if (!payload.email && accountDialog.role === "orangtua") payload.email = buildPortalEmail(selectedStudent?.nisn, "orangtua");
    if (!payload.password && !accountDialog.account) payload.password = generateTemporaryPassword("ORTU");
    if (!payload.password) delete payload.password;

    setIsSubmitting(true);
    const result = accountDialog.account
      ? await updateUser(accountDialog.account.id, payload)
      : await createUser(payload);

    setIsSubmitting(false);
    alert(result.message);

    if (result.success) {
      if (!accountDialog.account) setResetCredential({ email: payload.email, password: payload.password });
      closeAccountDialog();
      await loadData();
    }
  };

  const handleAccountDelete = async (account) => {
    const linkedCount = getAccountPortalLinks(account).filter((link) => link.siswa_id).length;
    const message = account.role === "orangtua"
      ? `Yakin ingin menghapus akun orang tua ${account.email}? Akun ini terhubung ke ${linkedCount || 0} siswa. Data siswa dan akun siswa tidak ikut terhapus.`
      : `Yakin ingin menghapus ${roleLabels[account.role] || "akun"} ${account.email}?`;
    if (!confirm(message)) return;
    const result = await deleteUser(account.id);
    alert(result.message);
    if (result.success) await loadData();
  };

  const openResetDialog = (account) => {
    setResetCredential(null);
    setResetDialog(account);
    setResetPasswordValue("");
  };

  const closeResetDialog = () => {
    setResetDialog(null);
    setResetPasswordValue("");
    setIsSubmitting(false);
  };

  const handleResetSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    const result = await resetUserPassword(resetDialog.id, resetPasswordValue ? { password: resetPasswordValue } : {});
    setIsSubmitting(false);
    alert(result.message);

    if (result.success) {
      setResetCredential({
        email: resetDialog.email,
        password: result.data?.generated_password || resetPasswordValue
      });
      closeResetDialog();
      await loadData();
    }
  };

  const renderAccountStatus = (account) => (
    <span className={account ? "management-status linked" : "management-status missing"}>
      {account ? "Akun aktif" : "Belum ada akun"}
    </span>
  );

  return (
    <div className="dashboard-layout">
      <AdminSidebar active="/admin/akun-siswa" />

      <main className="dashboard-content student-admin-page portal-management-page">
        <div className="dashboard-header">
          <div>
            <h1>Manajemen Siswa & Orang Tua</h1>
            <p>Kelola data siswa, orang tua, dan akun portal dalam satu halaman.</p>
          </div>
          <div className="dashboard-actions">
            <Link to="/" className="btn secondary">Situs web</Link>
            <button type="button" onClick={handleLogout} className="btn primary">Keluar</button>
          </div>
        </div>

        {(credentials || resetCredential) && (
          <section className="dashboard-card credential-card">
            {credentials && (
              <>
                <h3>{credentials.orangtua?.reused ? "Akun siswa dibuat, orang tua dipakai ulang" : "Akun siswa dan orang tua otomatis dibuat"}</h3>
                <p>{credentials.orangtua?.reused ? "Akun orang tua lama dipakai ulang karena nomor HP sama." : "Simpan kata sandi ini sekarang dan berikan ke pemilik akun."}</p>
                <div className="credential-grid">
                  <div><strong>Siswa</strong><span>{credentials.siswa.email}</span><code>{credentials.siswa.password}</code></div>
                  <div>
                    <strong>Orang Tua</strong>
                    <span>{credentials.orangtua.email}</span>
                    {credentials.orangtua.reused ? <span>Akun lama dipakai ulang</span> : <code>{credentials.orangtua.password}</code>}
                  </div>
                </div>
              </>
            )}
            {resetCredential && (
              <div className="credential-grid">
                <div><strong>{resetCredential.email}</strong><code>{resetCredential.password}</code></div>
              </div>
            )}
          </section>
        )}

        <section className="student-summary-grid" aria-label="Ringkasan manajemen siswa dan orang tua">
          {summaryItems.map((item) => (
            <div className="student-summary-card" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </section>

        <div className="portal-tab-bar" role="tablist" aria-label="Navigasi manajemen siswa dan orang tua">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`portal-tab-chip ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <section className="admin-kegiatan-card portal-management-card">
          <div className="portal-management-toolbar">
            <div className="student-list-title">
              <h2>
                {activeTab === "relasi" && "Daftar Siswa & Relasi Orang Tua"}
                {activeTab === "siswa" && "Kelola Data Siswa"}
                {activeTab === "orangtua" && "Kelola Akun Orang Tua"}
              </h2>
              <p>
                {activeTab === "relasi" && "Tampilan baca relasi siswa dan orang tua. Aksi ada di tab Siswa dan Orang Tua."}
                {activeTab === "siswa" && "Tambah, ubah, hapus data siswa beserta akun siswanya."}
                {activeTab === "orangtua" && "Kelola akun orang tua. Satu akun bisa terhubung ke beberapa siswa."}
              </p>
            </div>

            <div className="student-list-controls portal-management-controls">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari siswa, orang tua, email..."
                aria-label="Cari data"
              />
              {activeTab === "siswa" && (
                <button type="button" className="save-btn" onClick={openCreateStudentDialog}>Tambah Siswa</button>
              )}
              {activeTab === "orangtua" && (
                <button type="button" className="save-btn" onClick={() => openAccountDialog({ role: "orangtua" })}>Tambah Orang Tua</button>
              )}
            </div>
          </div>

          {activeTab === "relasi" && (
            filteredStudents.length === 0 ? (
              <div className="student-empty-state">
                <strong>Belum ada data siswa.</strong>
                <span>Tambahkan siswa lewat tab Siswa.</span>
              </div>
            ) : (
              <div className="class-group-list">
                {groupedStudentsByClass.map(({ className, students: cls }) => (
                  <div key={className} className="class-group-card">
                    <div className="class-group-header">
                      <span className="class-group-name">{className}</span>
                      <span className="class-group-count">{cls.length} siswa</span>
                    </div>
                    <div className="table-responsive portal-management-table-wrap">
                      <table className="admin-table portal-management-table">
                        <thead>
                          <tr>
                            <th>No</th>
                            <th>Siswa</th>
                            <th>Akun Siswa</th>
                            <th>Nama Orang Tua</th>
                            <th>No. HP</th>
                            <th>Akun Orang Tua</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cls.map((student, index) => {
                            const accounts = accountsByStudent.get(String(student.id)) || {};
                            const studentAccount = accounts.siswa;
                            const parentAccount = accounts.orangtua;
                            const parentSiblings = parentAccount
                              ? getAccountPortalLinks(parentAccount).filter((link) => link.siswa_id).length
                              : 0;
                            return (
                              <tr key={student.id}>
                                <td data-label="No">{index + 1}</td>
                                <td data-label="Siswa">
                                  <div className="management-table-cell">
                                    <strong>{student.nama}</strong>
                                    <span>NIS: {student.nisn || "-"}</span>
                                  </div>
                                </td>
                                <td data-label="Akun Siswa">
                                  {studentAccount ? (
                                    <div className="management-table-cell">
                                      <span className="management-status linked">Sudah ada akun</span>
                                      <span>{studentAccount.email}</span>
                                    </div>
                                  ) : (
                                    <span className="management-status missing">Belum ada akun</span>
                                  )}
                                </td>
                                <td data-label="Nama Orang Tua">{getStudentParentName(student)}</td>
                                <td data-label="No. HP">{student.no_telepon || "-"}</td>
                                <td data-label="Akun Orang Tua">
                                  {!parentAccount && <span className="management-status missing">Belum ada akun</span>}
                                  {parentAccount && (
                                    <div className="management-table-cell">
                                      <span className="management-status linked">Sudah ada akun</span>
                                      <span>{parentAccount.name}</span>
                                      <span>{parentAccount.email}</span>
                                      {parentSiblings > 1 && <span className="class-group-shared">Dipakai {parentSiblings} anak</span>}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === "siswa" && (
            filteredStudents.length === 0 ? (
              <div className="student-empty-state">
                <strong>Belum ada data siswa.</strong>
                <span>Klik Tambah Siswa untuk membuat data dan akun siswa otomatis.</span>
              </div>
            ) : (
              <div className="class-group-list">
                {groupedStudentsByClass.map(({ className, students: cls }) => (
                  <div key={className} className="class-group-card">
                    <div className="class-group-header">
                      <span className="class-group-name">{className}</span>
                      <span className="class-group-count">{cls.length} siswa</span>
                    </div>
                    <div className="table-responsive portal-management-table-wrap">
                      <table className="admin-table portal-management-table">
                        <thead>
                          <tr>
                            <th>No</th>
                            <th>Siswa</th>
                            <th>Akun Siswa</th>
                            <th>Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cls.map((student, index) => {
                            const accounts = accountsByStudent.get(String(student.id)) || {};
                            const studentAccount = accounts.siswa;
                            return (
                              <tr key={student.id}>
                                <td data-label="No">{index + 1}</td>
                                <td data-label="Siswa">
                                  <div className="management-table-cell">
                                    <strong>{student.nama}</strong>
                                    <span>NIS: {student.nisn || "-"}</span>
                                  </div>
                                </td>
                                <td data-label="Akun Siswa">
                                  <div className="management-table-cell">
                                    {renderAccountStatus(studentAccount)}
                                    <span>{studentAccount?.email || "Email belum tersedia"}</span>
                                  </div>
                                </td>
                                <td data-label="Aksi">
                                  <div className="admin-action compact management-table-actions">
                                    <button type="button" onClick={() => openEditStudentDialog(student)}>Ubah</button>
                                    {studentAccount && <button type="button" onClick={() => openResetDialog(studentAccount)}>Reset</button>}
                                    <button type="button" onClick={() => handleStudentDelete(student)}>Hapus</button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === "orangtua" && (
            filteredStudents.length === 0 ? (
              <div className="student-empty-state">
                <strong>Belum ada data siswa.</strong>
                <span>Tambahkan siswa terlebih dahulu untuk mengelola orang tua.</span>
              </div>
            ) : (
              <div className="class-group-list">
                {groupedStudentsByClass.map(({ className, students: cls }) => (
                  <div key={className} className="class-group-card">
                    <div className="class-group-header">
                      <span className="class-group-name">{className}</span>
                      <span className="class-group-count">{cls.length} siswa</span>
                    </div>
                    <div className="table-responsive portal-management-table-wrap">
                      <table className="admin-table portal-management-table">
                        <thead>
                          <tr>
                            <th>No</th>
                            <th>Nama Siswa</th>
                            <th>Nama Orang Tua</th>
                            <th>Email Akun</th>
                            <th>No. HP</th>
                            <th>Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cls.map((student, index) => {
                            const accounts = accountsByStudent.get(String(student.id)) || {};
                            const parentAccount = accounts.orangtua;
                            const parentSiblings = parentAccount
                              ? getAccountPortalLinks(parentAccount).filter((link) => link.siswa_id).length
                              : 0;
                            return (
                              <tr key={student.id}>
                                <td data-label="No">{index + 1}</td>
                                <td data-label="Nama Siswa">
                                  <div className="management-table-cell">
                                    <strong>{student.nama}</strong>
                                    <span>NIS: {student.nisn || "-"}</span>
                                  </div>
                                </td>
                                <td data-label="Nama Orang Tua">
                                  {parentAccount ? (
                                    <div className="management-table-cell">
                                      <strong className="ortu-name">{parentAccount.name}</strong>
                                      {parentSiblings > 1 && (
                                        <span className="class-group-shared">Orang tua {parentSiblings} anak</span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="management-status missing">Belum ada</span>
                                  )}
                                </td>
                                <td data-label="Email Akun">
                                  {parentAccount ? parentAccount.email : <span className="ortu-dash">-</span>}
                                </td>
                                <td data-label="No. HP">{student.no_telepon || "-"}</td>
                                <td data-label="Aksi">
                                  <div className="admin-action compact management-table-actions">
                                    {parentAccount ? (
                                      <>
                                        <button type="button" onClick={() => openAccountDialog({ role: "orangtua", account: parentAccount })}>Ubah</button>
                                        <button type="button" onClick={() => openResetDialog(parentAccount)}>Reset</button>
                                        <button type="button" onClick={() => handleAccountDelete(parentAccount)}>Hapus</button>
                                      </>
                                    ) : (
                                      <button type="button" className="save-btn compact-add-btn" onClick={() => openAccountDialog({ role: "orangtua", student })}>+ Tambah</button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </section>
      </main>

      {isStudentDialogOpen && (
        <div className="management-modal-backdrop student-form-modal-backdrop" role="presentation" onClick={closeStudentDialog}>
          <section className="management-modal-card student-form-modal-card" role="dialog" aria-modal="true" aria-labelledby="student-dialog-title" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="management-modal-close" onClick={closeStudentDialog} aria-label="Tutup dialog data siswa">&times;</button>
            <div className="management-modal-header">
              <span>{studentEditId ? "Ubah Data Siswa" : "Tambah Data Siswa"}</span>
              <h2 id="student-dialog-title">{studentEditId ? "Ubah Data Siswa" : "Tambah Data Siswa"}</h2>
              <p>{studentEditId ? "Ubah data siswa. Data dan akun orang tua dikelola di tab Orang Tua." : "Isi data siswa dan orang tua. Akun siswa serta orang tua akan dibuat dan terhubung otomatis."}</p>
            </div>

            <form className="student-dialog-form" onSubmit={handleStudentSubmit}>
              <div className="form-section-title">Data Siswa</div>
              <div className="student-form-grid">
                <div className="form-group"><label>Nama Siswa</label><input name="nama" value={studentForm.nama} onChange={handleStudentChange} required /></div>
                <div className="form-group"><label>NIS</label><input name="nisn" value={studentForm.nisn} onChange={handleStudentChange} required /></div>
                <div className="form-group"><label>Kelas</label><select name="kelas_id" value={studentForm.kelas_id || ""} onChange={handleStudentChange} required><option value="">Pilih kelas</option>{kelas.map((item) => <option key={item.id} value={item.id}>{classLabel(item)}</option>)}</select></div>
                <div className="form-group"><label>Jenis Kelamin</label><select name="jenis_kelamin" value={studentForm.jenis_kelamin} onChange={handleStudentChange} required><option value="L">Laki-laki</option><option value="P">Perempuan</option></select></div>
                <div className="form-group"><label>Tanggal Lahir</label><input type="date" name="tanggal_lahir" value={studentForm.tanggal_lahir || ""} onChange={handleStudentChange} required /></div>
                <div className="form-group full"><label>Alamat Siswa</label><textarea name="alamat" value={studentForm.alamat || ""} onChange={handleStudentChange} rows="2" required /></div>
              </div>

              {!studentEditId && (
                <>
                  <div className="form-section-title">Data Orang Tua</div>
                  <div className="student-form-grid">
                    <div className="form-group"><label>Nama Orang Tua</label><input name="nama_ayah" value={reusableParentPreview?.account?.name || studentForm.nama_ayah || ""} onChange={handleStudentChange} readOnly={Boolean(reusableParentPreview?.account)} required /></div>
                    <div className="form-group"><label>Nomor HP</label><input name="no_telepon" value={studentForm.no_telepon || ""} onChange={handleStudentChange} required /></div>
                  </div>
                  {reusableParentPreview && (
                    <div className={`parent-reuse-notice ${reusableParentPreview.account ? "linked" : "warning"}`}>
                      {reusableParentPreview.account ? (
                        <>
                          <strong>Akun orang tua sudah ada dan akan dipakai ulang.</strong>
                          <span>
                            Nomor ini terhubung ke {reusableParentPreview.sibling.nama}. Siswa baru akan memakai akun {reusableParentPreview.account.name} ({reusableParentPreview.account.email}) dan tidak dibuat akun orang tua baru.
                          </span>
                          {reusableParentPreview.linkedCount > 1 && <span>Akun ini sudah terhubung ke {reusableParentPreview.linkedCount} siswa.</span>}
                        </>
                      ) : (
                        <>
                          <strong>Nomor ini sudah ada di data siswa lain.</strong>
                          <span>Siswa {reusableParentPreview.sibling.nama} memakai nomor ini, tetapi akun orang tua belum terhubung. Sistem akan membuat akun orang tua baru.</span>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}

              <div className="management-modal-actions student-dialog-actions">
                <button type="button" className="cancel-btn" onClick={closeStudentDialog}>Batal</button>
                <button type="submit" className="save-btn" disabled={isSubmitting}>{isSubmitting ? "Menyimpan..." : studentEditId ? "Simpan Perubahan" : reusableParentPreview?.account ? "Simpan & Pakai Akun Orang Tua" : "Simpan & Buat Akun Otomatis"}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {accountDialog && (
        <div className="management-modal-backdrop" role="presentation" onClick={closeAccountDialog}>
          <section className="management-modal-card" role="dialog" aria-modal="true" aria-labelledby="account-dialog-title" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="management-modal-close" onClick={closeAccountDialog} aria-label="Tutup dialog akun">&times;</button>
            <div className="management-modal-header">
              <span>{accountDialog.account ? "Ubah Akun Portal" : "Akun Portal"}</span>
              <h2 id="account-dialog-title">{roleLabels[accountDialog.role]}</h2>
              <p>{accountDialog.account ? "Ubah data akun atau tambahkan relasi ke siswa lain." : "Isi nama orang tua, pilih siswa, lalu sistem menyiapkan akun portal otomatis."}</p>
            </div>

            <form className="management-dialog-form" onSubmit={handleAccountSubmit}>
              <div className="form-group">
                <label>Jenis Akun</label>
                <input value={roleLabels[accountDialog.role]} disabled />
              </div>

              <div className="form-group">
                <label>Hubungkan ke Siswa</label>
                <div className="student-combobox">
                  <input
                    type="text"
                    value={studentQuery}
                    onChange={(event) => { setStudentQuery(event.target.value); setIsStudentListOpen(true); }}
                    onFocus={() => setIsStudentListOpen(true)}
                    onBlur={() => setTimeout(() => setIsStudentListOpen(false), 150)}
                    placeholder="Ketik nama, NIS, atau kelas siswa..."
                    aria-label="Cari dan pilih siswa"
                    autoComplete="off"
                  />
                  {isStudentListOpen && (
                    <ul className="student-combobox-list">
                      {accountStudentOptions.length === 0 ? (
                        <li className="student-combobox-empty">Tidak ada siswa cocok</li>
                      ) : accountStudentOptions.map((student) => (
                        <li key={student.id}>
                          <button
                            type="button"
                            className={String(student.id) === String(accountForm.siswa_id) ? "active" : ""}
                            onMouseDown={(event) => { event.preventDefault(); selectStudentForAccount(student); }}
                          >
                            <strong>{student.nama}</strong>
                            <span>NIS: {student.nisn || "-"} - {getStudentClassName(student)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Nama Akun</label>
                <input name="name" value={accountForm.name} onChange={handleAccountChange} required />
              </div>

              <div className="form-group">
                <label>Email <span className="field-optional">otomatis</span></label>
                <input type="email" name="email" value={accountForm.email} readOnly placeholder="Pilih siswa dulu" />
              </div>

              <div className="form-group">
                <label>Kata Sandi {accountDialog.account ? <span className="field-optional">kosongkan jika tidak diubah</span> : <span className="field-optional">otomatis jika kosong</span>}</label>
                <PasswordField
                  name="password"
                  value={accountForm.password}
                  onChange={handleAccountChange}
                  minLength="6"
                />
              </div>

              <div className="form-group">
                <label>Keterangan</label>
                <input name="profession" value={accountForm.profession} readOnly placeholder="Otomatis dari relasi siswa" />
              </div>

              <div className="management-modal-actions">
                <button type="button" className="cancel-btn" onClick={closeAccountDialog}>Batal</button>
                <button type="submit" className="save-btn" disabled={isSubmitting}>{isSubmitting ? "Menyimpan..." : accountDialog.account ? "Simpan" : "Tambah & Hubungkan"}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {resetDialog && (
        <div className="management-modal-backdrop" role="presentation" onClick={closeResetDialog}>
          <section className="management-modal-card small" role="dialog" aria-modal="true" aria-labelledby="reset-dialog-title" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="management-modal-close" onClick={closeResetDialog} aria-label="Tutup dialog reset password">&times;</button>
            <div className="management-modal-header">
              <span>Atur Ulang Kata Sandi</span>
              <h2 id="reset-dialog-title">{resetDialog.name}</h2>
              <p>Isi kata sandi baru atau kosongkan agar sistem membuat kata sandi otomatis.</p>
            </div>

            <form className="management-dialog-form single" onSubmit={handleResetSubmit}>
              <div className="form-group">
                <label>Kata Sandi Baru</label>
                <PasswordField
                  value={resetPasswordValue}
                  onChange={(event) => setResetPasswordValue(event.target.value)}
                  minLength="6"
                  placeholder="Kosongkan untuk otomatis"
                />
              </div>
              <div className="management-modal-actions">
                <button type="button" className="cancel-btn" onClick={closeResetDialog}>Batal</button>
                <button type="submit" className="save-btn" disabled={isSubmitting}>{isSubmitting ? "Memproses..." : "Atur Ulang"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminAkunSiswa;
