import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { registerGuru } from "../services/api";

function RegisterGuru() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    profession: ""
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Password dan konfirmasi password tidak sama.");
      return;
    }

    const result = await registerGuru({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      profession: formData.profession
    });

    if (!result.success) {
      alert(result.message);
      return;
    }

    alert("Registrasi guru berhasil. Silakan login.");
    navigate("/login-guru");
  };

  return (
    <>
      <Navbar />

      <main className="auth-page container">
        <div className="auth-card">
          <h1>Registrasi Guru</h1>
          <p>Buat akun guru untuk mengakses sistem portal sekolah.</p>

          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label>Nama Lengkap</label>
              <input
                type="text"
                name="name"
                placeholder="Masukkan nama lengkap"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                placeholder="guru@cnb.sch.id"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                placeholder="Masukkan password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Konfirmasi Password</label>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Ulangi password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Jabatan / Profesi</label>
              <input
                type="text"
                name="profession"
                placeholder="Contoh: Guru Matematika"
                value={formData.profession}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" className="submit-btn">
              Registrasi
            </button>
          </form>

          <Link to="/login-guru" className="auth-link">
            Sudah punya akun? Login Guru
          </Link>
        </div>
      </main>

      <Footer />
    </>
  );
}

export default RegisterGuru;