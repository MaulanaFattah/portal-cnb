import schoolLogo from "../assets/logo-transparent.png";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser, saveAuth } from "../services/api";
import PasswordField from "../components/PasswordField";

function LoginGuru() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    const result = await loginUser({ email, password, role: "guru" });

    if (!result.success) {
      setError(result.message || "Gagal masuk sebagai guru");
      return;
    }

    saveAuth(result.token, result.user);
    navigate(result.user?.must_change_password ? "/change-password" : "/dashboard-guru");
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <img src={schoolLogo} alt="Logo" className="admin-login-logo" />
        <h1>Masuk Guru</h1>
        <p>Masukkan email dan kata sandi akun guru untuk mengakses portal.</p>
        {error && <div className="auth-error" role="alert">{error}</div>}

        <form onSubmit={handleLogin} autoComplete="off">
          <div className="form-group">
            <label>Email</label>
            <input type="email" placeholder="Masukkan nama@cnb.sch.id" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" required />
          </div>
          <div className="form-group">
            <label>Kata Sandi</label>
            <PasswordField placeholder="Masukkan kata sandi" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
          </div>
          <button type="submit" className="submit-btn">Masuk</button>
        </form>

        <div className="auth-links-stack">
          <Link to="/register-guru" className="auth-link">Belum punya akun? Registrasi Guru</Link>
          <Link to="/lupa-password?role=guru" className="auth-link">Lupa kata sandi?</Link>
          <Link to="/" className="auth-home-link">Kembali ke Beranda</Link>
        </div>
      </div>
    </div>
  );
}

export default LoginGuru;
