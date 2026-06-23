import schoolLogo from "../assets/logo-transparent.png";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser, saveAuth } from "../services/api";

function LoginKepalaSekolah() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    const result = await loginUser({ email, password, role: "kepala_sekolah" });

    if (!result.success) {
      setError(result.message || "Gagal masuk sebagai kepala sekolah");
      return;
    }

    saveAuth(result.token, result.user);
    navigate(result.user?.must_change_password ? "/change-password" : "/dashboard-kepala-sekolah");
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <img src={schoolLogo} alt="Logo" className="admin-login-logo" />
        <h1>Masuk Kepala Sekolah</h1>
        <p>Masuk untuk memantau guru, siswa, dan rekap absensi sesuai jenjang.</p>
        {error && <div className="auth-error" role="alert">{error}</div>}

        <form onSubmit={handleLogin} autoComplete="off">
          <div className="form-group">
            <label>Email</label>
            <input type="email" placeholder="Masukkan email kepala sekolah" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="off" required />
          </div>
          <div className="form-group">
            <label>Kata Sandi</label>
            <input type="password" placeholder="Masukkan kata sandi" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required />
          </div>
          <button type="submit" className="submit-btn">Masuk</button>
        </form>

        <Link to="/register-kepala-sekolah" className="auth-link">Belum punya akun? Registrasi Kepala Sekolah</Link>
        <Link to="/lupa-password?role=kepala_sekolah" className="auth-link">Lupa kata sandi?</Link>
      </div>
    </div>
  );
}

export default LoginKepalaSekolah;
