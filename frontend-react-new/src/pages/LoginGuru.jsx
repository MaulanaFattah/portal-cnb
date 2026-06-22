import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { loginUser, saveAuth } from "../services/api";

function LoginGuru() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    const result = await loginUser({
      email,
      password,
      role: "guru"
    });

    if (!result.success) {
      alert(result.message);
      return;
    }

    saveAuth(result.token, result.user);
    alert("Berhasil masuk sebagai guru");
    navigate(result.user?.must_change_password ? "/change-password" : "/dashboard-guru");
  };

  return (
    <>
      <Navbar />

      <main className="auth-page container">
        <div className="auth-card">
          <h1>Masuk Guru</h1>
          <p>Masukkan email dan kata sandi akun guru untuk mengakses portal.</p>

          <form onSubmit={handleLogin} autoComplete="off">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="Masukkan email guru"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <button type="submit" className="submit-btn">
              Masuk
            </button>
          </form>

          <Link to="/register-guru" className="auth-link">
            Belum punya akun? Registrasi Guru
          </Link>

          <Link to="/lupa-password?role=guru" className="auth-link">
            Lupa kata sandi?
          </Link>

        </div>
      </main>

      <Footer />
    </>
  );
}

export default LoginGuru;
