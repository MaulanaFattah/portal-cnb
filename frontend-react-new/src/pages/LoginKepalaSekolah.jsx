import schoolLogo from "../assets/logo-transparent.png";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser, saveAuth } from "../services/api";
import PasswordField from "../components/PasswordField";

/**
 * Halaman Login Kepala Sekolah.
 * Akses: umum (untuk pengguna yang akan masuk sebagai kepala sekolah).
 * Fungsi halaman: form login email & kata sandi kepala sekolah; bila berhasil menyimpan
 * sesi dan mengarahkan ke dashboard kepala sekolah (atau halaman ganti kata sandi bila wajib).
 */
function LoginKepalaSekolah() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  /**
   * Memproses login kepala sekolah.
   * @param {Event} event Event submit form (dicegah default-nya).
   * Memanggil API: loginUser({ email, password, role: "kepala_sekolah" }).
   * Efek: setError bila gagal; bila sukses saveAuth(token, user) lalu navigate ke
   * "/change-password" (jika must_change_password) atau "/dashboard-kepala-sekolah".
   */
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
            <input type="email" placeholder="Masukkan nama@cnb.sch.id" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="off" required />
          </div>
          <div className="form-group">
            <label>Kata Sandi</label>
            <PasswordField placeholder="Masukkan kata sandi" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required />
          </div>
          <button type="submit" className="submit-btn">Masuk</button>
        </form>

        <div className="auth-links-stack">
          <Link to="/register-kepala-sekolah" className="auth-link">Belum punya akun? Registrasi Kepala Sekolah</Link>
          <Link to="/lupa-password?role=kepala_sekolah" className="auth-link">Lupa kata sandi?</Link>
          <Link to="/" className="auth-home-link">Kembali ke Beranda</Link>
        </div>
      </div>
    </div>
  );
}

export default LoginKepalaSekolah;
