import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { changePassword, logout } from "../services/api";

function ChangePassword() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      alert("Kata sandi baru dan konfirmasi tidak sama.");
      return;
    }

    const result = await changePassword({ currentPassword, newPassword });
    alert(result.message);
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
          <p>Akun ini memakai kata sandi awal dari administrator. Buat kata sandi baru sebelum membuka dasbor.</p>
          <form onSubmit={handleSubmit}>
            <div className="form-group"><label>Kata Sandi Saat Ini</label><input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></div>
            <div className="form-group"><label>Kata Sandi Baru</label><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength="6" required /></div>
            <div className="form-group"><label>Konfirmasi Kata Sandi Baru</label><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength="6" required /></div>
            <button type="submit" className="submit-btn">Simpan Kata Sandi Baru</button>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default ChangePassword;
