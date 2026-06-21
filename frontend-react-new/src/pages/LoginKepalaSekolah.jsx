import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { loginUser, saveAuth } from "../services/api";

function LoginKepalaSekolah() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();
    const result = await loginUser({ email, password, role: "kepala_sekolah" });

    if (!result.success) {
      alert(result.message);
      return;
    }

    saveAuth(result.token, result.user);
    navigate(result.user?.must_change_password ? "/change-password" : "/dashboard-kepala-sekolah");
  };

  return (
    <>
      <Navbar />
      <main className="auth-page container">
        <div className="auth-card">
          <h1>Masuk Kepala Sekolah</h1>
          <p>Masuk untuk memantau data guru, siswa, kegiatan, pengumuman, dan rekap absensi sekolah.</p>

          <form onSubmit={handleLogin} autoComplete="off">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="Masukkan email kepala sekolah"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="off"
                required
              />
            </div>

            <div className="form-group">
              <label>Kata Sandi</label>
              <input
                type="password"
                placeholder="Masukkan kata sandi"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <button type="submit" className="submit-btn">Masuk</button>
          </form>

          <Link to="/login" className="auth-link auth-back-link">Kembali ke pilihan masuk</Link>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default LoginKepalaSekolah;
