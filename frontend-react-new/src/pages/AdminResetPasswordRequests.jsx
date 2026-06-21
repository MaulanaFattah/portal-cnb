import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import {
  getPasswordResetRequests,
  logout,
  processPasswordResetRequest,
  rejectPasswordResetRequest
} from "../services/api";

const roleLabels = {
  guru: "Guru",
  siswa: "Siswa",
  orangtua: "Orang Tua",
  kepala_sekolah: "Kepala Sekolah"
};

const statusLabels = {
  pending: "Menunggu",
  completed: "Selesai",
  rejected: "Ditolak"
};

const statusFilters = [
  { value: "pending", label: "Menunggu" },
  { value: "completed", label: "Selesai" },
  { value: "rejected", label: "Ditolak" },
  { value: "all", label: "Semua" }
];

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (isNaN(date)) return value;
  return date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function getStatusClass(status) {
  if (status === "completed") return "approved";
  if (status === "rejected") return "rejected";
  return "pending";
}

function getMatchedAccountText(item) {
  if (!item.matchedUser) return "Belum cocok otomatis";
  return `${item.matchedUser.name} (${item.matchedUser.email})`;
}

function getProcessedText(item) {
  if (item.status === "completed") {
    return item.processedBy ? `Reset oleh ${item.processedBy.name}` : "Reset selesai";
  }
  if (item.status === "rejected") {
    return item.processedBy ? `Ditolak oleh ${item.processedBy.name}` : "Permintaan ditolak";
  }
  return "Menunggu tindakan admin";
}

function AdminResetPasswordRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [resetCredential, setResetCredential] = useState(null);
  const [pageNotice, setPageNotice] = useState(null);
  const [dialog, setDialog] = useState(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    const result = await getPasswordResetRequests("all");
    setRequests(result.success ? result.data || [] : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    let isActive = true;

    getPasswordResetRequests("all")
      .then((result) => {
        if (isActive) setRequests(result.success ? result.data || [] : []);
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const summary = useMemo(() => {
    return requests.reduce(
      (accumulator, item) => ({
        ...accumulator,
        [item.status]: (accumulator[item.status] || 0) + 1,
        total: accumulator.total + 1
      }),
      { pending: 0, completed: 0, rejected: 0, total: 0 }
    );
  }, [requests]);

  const filteredRequests = useMemo(() => {
    if (status === "all") return requests;
    return requests.filter((item) => item.status === status);
  }, [requests, status]);

  const openResetDialog = (item) => {
    setPageNotice(null);
    setDialog({ type: "reset", item, password: "" });
  };

  const openRejectDialog = (item) => {
    setPageNotice(null);
    setDialog({ type: "reject", item, reason: "Data tidak cocok dengan akun sekolah" });
  };

  const closeDialog = () => {
    if (!actionLoading) setDialog(null);
  };

  const handleDialogChange = (event) => {
    const { name, value } = event.target;
    setDialog((current) => ({ ...current, [name]: value }));
  };

  const handleComplete = async (event) => {
    event.preventDefault();
    if (!dialog?.item) return;

    const temporaryPassword = String(dialog.password || "").trim();
    setActionLoading(true);
    const result = await processPasswordResetRequest(
      dialog.item.id,
      temporaryPassword ? { password: temporaryPassword } : {}
    );
    setActionLoading(false);

    if (!result.success) {
      setPageNotice({ type: "error", text: result.message });
      return;
    }

    const visiblePassword = result.data?.generated_password || temporaryPassword;
    if (visiblePassword) {
      setResetCredential({
        email: result.data?.user?.email || dialog.item.email,
        password: visiblePassword
      });
    }

    setPageNotice({ type: "success", text: result.message });
    setDialog(null);
    loadRequests();
  };

  const handleReject = async (event) => {
    event.preventDefault();
    if (!dialog?.item) return;

    const reason = String(dialog.reason || "").trim() || "Ditolak administrator";
    setActionLoading(true);
    const result = await rejectPasswordResetRequest(dialog.item.id, { reason });
    setActionLoading(false);

    if (!result.success) {
      setPageNotice({ type: "error", text: result.message });
      return;
    }

    setPageNotice({ type: "success", text: result.message });
    setDialog(null);
    loadRequests();
  };

  const handleLogout = () => {
    logout();
    navigate("/admin-login");
  };

  return (
    <div className="dashboard-layout">
      <AdminSidebar active="/admin/reset-password" />

      <main className="dashboard-content reset-request-page">
        <div className="dashboard-header reset-request-header">
          <div>
            <span className="reset-page-eyebrow">Verifikasi bantuan akun</span>
            <h1>Permintaan Reset Password</h1>
            <p>Admin mengecek identitas guru, siswa, dan orang tua sebelum memberi kata sandi sementara.</p>
          </div>

          <div className="dashboard-actions">
            <Link to="/" className="btn secondary">Situs web</Link>
            <button onClick={handleLogout} className="btn primary">Keluar</button>
          </div>
        </div>

        <section className="reset-summary-grid" aria-label="Ringkasan permintaan reset password">
          <div className="reset-summary-card pending">
            <span>Menunggu</span>
            <strong>{summary.pending}</strong>
            <p>Perlu keputusan admin</p>
          </div>
          <div className="reset-summary-card completed">
            <span>Selesai</span>
            <strong>{summary.completed}</strong>
            <p>Password sudah diatur</p>
          </div>
          <div className="reset-summary-card rejected">
            <span>Ditolak</span>
            <strong>{summary.rejected}</strong>
            <p>Data tidak disetujui</p>
          </div>
          <div className="reset-summary-card total">
            <span>Total</span>
            <strong>{summary.total}</strong>
            <p>Semua permintaan</p>
          </div>
        </section>

        {pageNotice && (
          <div className={`reset-page-notice ${pageNotice.type}`} role="status">
            {pageNotice.text}
          </div>
        )}

        {resetCredential && (
          <section className="dashboard-card credential-card reset-credential-card">
            <div>
              <span className="reset-page-eyebrow">Kredensial sementara</span>
              <h3>Kata sandi sementara berhasil dibuat</h3>
              <p>Simpan dan berikan ke pemilik akun. Pengguna wajib mengganti kata sandi saat login berikutnya.</p>
            </div>
            <div className="credential-grid">
              <div>
                <strong>{resetCredential.email}</strong>
                <code>{resetCredential.password}</code>
              </div>
            </div>
            <button type="button" className="reset-close-credential" onClick={() => setResetCredential(null)}>Tutup</button>
          </section>
        )}

        <section className="admin-kegiatan-card reset-request-panel">
          <div className="reset-request-toolbar">
            <div className="student-list-title">
              <h2>Daftar Permintaan</h2>
              <p>Permintaan publik dibuat sederhana, sedangkan kecocokan akun ditampilkan hanya untuk admin.</p>
            </div>

            <div className="reset-status-tabs" role="tablist" aria-label="Filter status permintaan reset password">
              {statusFilters.map((filter) => {
                const count = filter.value === "all" ? summary.total : summary[filter.value] || 0;
                return (
                  <button
                    key={filter.value}
                    type="button"
                    className={`reset-status-tab ${status === filter.value ? "active" : ""}`}
                    onClick={() => setStatus(filter.value)}
                    aria-pressed={status === filter.value}
                  >
                    <span>{filter.label}</span>
                    <strong>{count}</strong>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="reset-request-list">
            {loading ? (
              <div className="reset-empty-state">
                <span>Memuat</span>
                <strong>Memuat permintaan reset password...</strong>
                <p>Mohon tunggu sebentar.</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="reset-empty-state">
                <span>0</span>
                <strong>Belum ada permintaan pada status ini</strong>
                <p>Jika pengguna sudah mengirim permintaan, data akan muncul otomatis di sini.</p>
              </div>
            ) : (
              filteredRequests.map((item, index) => (
                <article className={`reset-request-card ${item.status}`} key={item.id}>
                  <div className="reset-request-card-main">
                    <span className="reset-request-number">{index + 1}</span>
                    <div className="reset-request-info">
                      <div className="reset-request-title-row">
                        <div>
                          <span className="reset-role-pill">{roleLabels[item.role] || item.role}</span>
                          <h3>{item.name}</h3>
                        </div>
                        <span className={`status-badge ${getStatusClass(item.status)}`}>
                          {statusLabels[item.status] || item.status}
                        </span>
                      </div>

                      <p className="reset-request-subtitle">
                        Diajukan {formatDate(item.createdAt)} - {getProcessedText(item)}
                      </p>

                      <div className="reset-request-meta-grid">
                        <span><strong>Email</strong>{item.email || "-"}</span>
                        <span><strong>NISN</strong>{item.nisn || "-"}</span>
                        <span><strong>Kelas</strong>{item.class_name || "-"}</span>
                        <span><strong>Akun Cocok</strong>{getMatchedAccountText(item)}</span>
                      </div>

                      {item.notes && <p className="reset-request-note">{item.notes}</p>}
                      {item.rejection_reason && <p className="reset-request-note danger">Alasan ditolak: {item.rejection_reason}</p>}
                    </div>
                  </div>

                  <div className="reset-request-actions">
                    {item.status === "pending" ? (
                      <>
                        {!item.matchedUser && <span>Perlu verifikasi manual</span>}
                        <button
                          type="button"
                          className="reset-action-primary"
                          onClick={() => openResetDialog(item)}
                          disabled={!item.matchedUser}
                          title={!item.matchedUser ? "Akun belum cocok otomatis" : "Reset password akun ini"}
                        >
                          Reset Password
                        </button>
                        <button type="button" className="reset-action-danger" onClick={() => openRejectDialog(item)}>
                          Tolak
                        </button>
                      </>
                    ) : (
                      <span>{item.processed_at ? `Diproses ${formatDate(item.processed_at)}` : "Sudah diproses"}</span>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        {dialog && (
          <div className="management-modal-backdrop" role="presentation">
            <div className="management-modal-card small reset-request-dialog" role="dialog" aria-modal="true">
              <button type="button" className="management-modal-close" onClick={closeDialog} aria-label="Tutup dialog">×</button>
              <div className="management-modal-header">
                <span>{dialog.type === "reset" ? "Reset password" : "Tolak permintaan"}</span>
                <h2>{dialog.type === "reset" ? "Buat Kata Sandi Sementara" : "Konfirmasi Penolakan"}</h2>
                <p>
                  {dialog.type === "reset"
                    ? "Kosongkan field password jika ingin sistem membuat kata sandi otomatis."
                    : "Tuliskan alasan singkat agar riwayat keputusan admin tetap jelas."}
                </p>
              </div>

              <div className="management-dialog-student">
                <span>Permintaan</span>
                <strong>{dialog.item.name}</strong>
                <p>{roleLabels[dialog.item.role] || dialog.item.role} - {dialog.item.email}</p>
              </div>

              <form className="management-dialog-form single reset-dialog-form" onSubmit={dialog.type === "reset" ? handleComplete : handleReject}>
                {dialog.type === "reset" ? (
                  <div className="form-group">
                    <label>Kata Sandi Sementara (opsional)</label>
                    <input
                      type="text"
                      name="password"
                      value={dialog.password}
                      onChange={handleDialogChange}
                      placeholder="Kosongkan untuk generate otomatis"
                      minLength={6}
                    />
                    <small>Minimal 6 karakter jika diisi manual.</small>
                  </div>
                ) : (
                  <div className="form-group">
                    <label>Alasan Penolakan</label>
                    <textarea
                      name="reason"
                      value={dialog.reason}
                      onChange={handleDialogChange}
                      rows={4}
                      placeholder="Contoh: Data tidak cocok dengan akun sekolah"
                    />
                  </div>
                )}

                <div className="management-modal-actions">
                  <button type="button" className="cancel-btn" onClick={closeDialog} disabled={actionLoading}>Batal</button>
                  <button type="submit" className={dialog.type === "reset" ? "save-btn" : "delete-btn"} disabled={actionLoading}>
                    {actionLoading ? "Memproses..." : dialog.type === "reset" ? "Simpan Reset" : "Tolak Permintaan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminResetPasswordRequests;
