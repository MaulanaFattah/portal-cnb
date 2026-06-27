import schoolLogo from "../assets/logo-transparent.png";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser, saveAuth } from "../services/api";
import PasswordField from "../components/PasswordField";

/**
 * Halaman Login Administrator.
 *
 * Halaman ini menampilkan form masuk khusus administrator (email + kata sandi).
 * Setelah login berhasil, sesi disimpan dan pengguna diarahkan ke dashboard
 * admin, atau ke halaman ganti kata sandi bila akun masih wajib mengganti
 * sandi (must_change_password).
 *
 * Peran/akses: publik (hanya untuk calon admin yang ingin masuk). Hanya
 * kredensial dengan peran "admin" yang diterima oleh proses login ini.
 */
function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  /**
   * Memproses pengiriman form login admin.
   *
   * Parameter: e - event submit form (reload halaman dicegah).
   * Efek: mengosongkan pesan error, memanggil API loginUser dengan peran
   * "admin". Bila gagal, mengisi state error dengan pesan dari server. Bila
   * sukses, menyimpan token & data user (saveAuth) lalu mengarahkan ke
   * "/change-password" (jika wajib ganti sandi) atau "/dashboard-admin".
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const result = await loginUser({
      email,
      password,
      role: "admin"
    });

    if (!result.success) {
      setError(result.message || "Gagal masuk sebagai administrator");
      return;
    }

    saveAuth(result.token, result.user);
    navigate(result.user?.must_change_password ? "/change-password" : "/dashboard-admin");
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <img src={schoolLogo} alt="Logo" className="admin-login-logo" />

        <h1>Masuk Administrator</h1>
        <p>Masukkan email dan kata sandi administrator.</p>
        {error && <div className="auth-error" role="alert">{error}</div>}

        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="Masukkan nama@cnb.sch.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              required
            />
          </div>

          <div className="form-group">
            <label>Kata Sandi</label>
            <PasswordField
              placeholder="Masukkan kata sandi"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <button className="submit-btn">Masuk</button>
        </form>

        <div className="auth-links-stack">
          <Link to="/" className="auth-home-link">Kembali ke Beranda</Link>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
