import schoolLogo from "../assets/logo-transparent.png";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser, saveAuth } from "../services/api";
import PasswordField from "../components/PasswordField";

/**
 * Halaman Login Orang Tua.
 * Akses: umum (untuk pengguna yang akan masuk sebagai orang tua/wali).
 * Fungsi halaman: form login email & kata sandi orang tua; bila berhasil menyimpan sesi
 * dan mengarahkan ke dashboard orang tua (atau halaman ganti kata sandi bila wajib).
 */
function LoginOrangTua() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  /**
   * Memproses login orang tua.
   * @param {Event} e Event submit form (dicegah default-nya).
   * Memanggil API: loginUser({ email, password, role: "orangtua" }).
   * Efek: setError bila gagal; bila sukses saveAuth(token, user) lalu navigate ke
   * "/change-password" (jika must_change_password) atau "/dashboard-orangtua".
   */
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    const result = await loginUser({ email, password, role: "orangtua" });

    if (!result.success) {
      setError(result.message || "Gagal masuk sebagai orang tua");
      return;
    }

    saveAuth(result.token, result.user);
    navigate(result.user?.must_change_password ? "/change-password" : "/dashboard-orangtua");
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <img src={schoolLogo} alt="Logo" className="admin-login-logo" />
        <h1>Masuk Orang Tua</h1>
        <p>Masukkan email dan kata sandi akun orang tua untuk melihat informasi siswa.</p>
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
          <Link to="/lupa-password?role=orangtua" className="auth-link">Lupa kata sandi?</Link>
          <Link to="/" className="auth-home-link">Kembali ke Beranda</Link>
        </div>
      </div>
    </div>
  );
}

export default LoginOrangTua;
