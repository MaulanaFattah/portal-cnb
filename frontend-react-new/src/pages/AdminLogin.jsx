import schoolLogo from "../assets/logo.jpeg";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
    navigate("/dashboard-admin");
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <img src={schoolLogo} alt="Logo" className="admin-login-logo" />

        <h1>Admin Login</h1>
        <p>Masukkan email dan password administrator.</p>

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
            <label>Password</label>
            <input
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button className="submit-btn">Login</button>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;