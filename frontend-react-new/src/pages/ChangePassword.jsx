import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PasswordField from "../components/PasswordField";
import { changePassword, logout } from "../services/api";

/**
 * Halaman Ganti Kata Sandi.
 * Akses: pengguna yang sudah login (terutama akun dengan kata sandi sementara yang wajib
 * menggantinya).
 * Fungsi halaman: form mengisi kata sandi baru + konfirmasi; setelah berhasil, pengguna
 * di-logout dan diarahkan ke halaman login.
 */
function ChangePassword() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  /**
   * Memproses penggantian kata sandi.
   * @param {Event} event Event submit form (dicegah default-nya).
   * Validasi: kata sandi baru dan konfirmasi harus sama.
   * Memanggil API: changePassword({ newPassword }).
   * Efek state/efek: setSaving, setMessage; bila sukses memanggil logout() lalu navigate
   * ke "/login".
   */
  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Kata sandi baru dan konfirmasi tidak sama." });
      return;
    }

    setSaving(true);
    const result = await changePassword({ newPassword });
    setSaving(false);
    setMessage({ type: result.success ? "success" : "error", text: result.message });

    if (result.success) {
      logout();
      navigate("/login");
    }
  };

  return (
    <>
      <Navbar />
      <main className="auth-page container">
        <div className="auth-card">
          <h1>Ganti Kata Sandi</h1>
          <p>Masukkan kata sandi baru. Untuk akun yang memakai kata sandi sementara, tidak perlu mengisi kata sandi saat ini.</p>
          {message && <div className={`auth-error ${message.type === "success" ? "success" : ""}`} role="status">{message.text}</div>}
          <form onSubmit={handleSubmit} autoComplete="off">
            <div className="form-group">
              <label>Kata Sandi Baru</label>
              <PasswordField value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength="6" required />
            </div>
            <div className="form-group">
              <label>Konfirmasi Kata Sandi Baru</label>
              <PasswordField value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength="6" required />
            </div>
            <button type="submit" className="submit-btn" disabled={saving}>{saving ? "Menyimpan..." : "Simpan Kata Sandi Baru"}</button>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default ChangePassword;