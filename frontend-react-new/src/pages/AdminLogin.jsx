import schoolLogo from "../assets/logo.jpeg";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser, saveAuth } from "../services/api";

function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("admin@cnb.sch.id");
  const [password, setPassword] = useState("admin123");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const result = await loginUser({
      email,
      password,
      role: "admin"
    });

    if (!result.success) {
      alert(result.message);
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

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="admin@cnb.sch.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Kata Sandi</label>
            <input
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button className="submit-btn">Masuk</button>
        </form>

        <Link to="/login" className="auth-link auth-back-link">Kembali ke pilihan masuk</Link>
      </div>
    </div>
  );
}

export default AdminLogin;
