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
      alert("Password baru dan konfirmasi tidak sama.");
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
          <h1>Ganti Password</h1>
          <p>Akun ini memakai password awal dari admin. Buat password baru sebelum membuka dashboard.</p>
          <form onSubmit={handleSubmit}>
            <div className="form-group"><label>Password Saat Ini</label><input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></div>
            <div className="form-group"><label>Password Baru</label><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength="6" required /></div>
            <div className="form-group"><label>Konfirmasi Password Baru</label><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength="6" required /></div>
            <button type="submit" className="submit-btn">Simpan Password Baru</button>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default ChangePassword;
