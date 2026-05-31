import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { loginUser, saveAuth } from "../services/api";

function LoginSiswa() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    const result = await loginUser({
      email,
      password,
      role: "siswa"
    });

    if (!result.success) {
      alert(result.message);
      return;
    }

    saveAuth(result.token, result.user);
    alert("Login siswa berhasil");
    navigate("/");
  };

  return (
    <>
      <Navbar />

      <main className="auth-page container">
        <div className="auth-card">
          <h1>Login Siswa</h1>

          <p>
            Masukkan email dan password akun siswa untuk masuk ke portal.
          </p>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="siswa@cnb.sch.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="submit-btn">
              Login
            </button>
          </form>

          <Link to="/login" className="auth-link">
            ← Kembali ke pilihan login
          </Link>
        </div>
      </main>

      <Footer />
    </>
  );
}

export default LoginSiswa;