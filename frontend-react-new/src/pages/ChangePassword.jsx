import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PasswordField from "../components/PasswordField";
import { changePassword, logout } from "../services/api";

function ChangePassword() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

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