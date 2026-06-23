import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { registerKepalaSekolah } from "../services/api";

const initialForm = {
  name: "",
  nip: "",
  email: "",
  no_telepon: "",
  jenjang: "sd",
  password: "",
  confirmPassword: ""
};

function RegisterKepalaSekolah() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Konfirmasi kata sandi tidak sesuai");
      return;
    }

    setIsSubmitting(true);

    const result = await registerKepalaSekolah({
      name: formData.name,
      nama: formData.name,
      nip: formData.nip,
      email: formData.email,
      no_telepon: formData.no_telepon,
      jenjang: formData.jenjang,
      password: formData.password,
      kata_sandi: formData.password
    });

    setIsSubmitting(false);

    if (!result.success) {
      alert(result.message);
      return;
    }

    alert("Registrasi kepala sekolah berhasil. Akun menunggu verifikasi admin. Silakan masuk setelah akun diverifikasi.");
    setFormData(initialForm);
    navigate("/login-kepala-sekolah");
  };

  return (
    <>
      <Navbar />

      <main className="auth-page">
        <div className="auth-card">
          <h1>Registrasi Kepala Sekolah</h1>
          <p>Pilih jenjang sekolah lalu lengkapi data. Sama seperti registrasi guru, akun menunggu verifikasi admin sebelum bisa masuk.</p>

          <form className="teacher-register-form" onSubmit={handleSubmit} autoComplete="off">
            <div className="form-group"><label>Nama Lengkap</label><input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Masukkan nama lengkap" autoComplete="off" required /></div>
            <div className="form-group"><label>Email</label><input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Masukkan email kepala sekolah" autoComplete="off" required /></div>

            <div className="form-group"><label>Jenjang Sekolah</label>
              <select name="jenjang" value={formData.jenjang} onChange={handleChange} required>
                <option value="sd">Kepala Sekolah SD</option>
                <option value="smp">Kepala Sekolah SMP</option>
              </select>
            </div>

            <div className="form-group"><label>NIP</label><input type="text" name="nip" value={formData.nip} onChange={handleChange} placeholder="Masukkan NIP" autoComplete="off" required /></div>
            <div className="form-group"><label>No. Telepon</label><input type="tel" name="no_telepon" value={formData.no_telepon} onChange={handleChange} placeholder="Contoh: 081234567890" autoComplete="off" /></div>

            <div className="form-group"><label>Kata Sandi</label><input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Masukkan kata sandi" autoComplete="new-password" minLength="6" required /></div>
            <div className="form-group"><label>Konfirmasi Kata Sandi</label><input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Ulangi kata sandi" autoComplete="new-password" minLength="6" required /></div>

            <div className="form-group full ppdb-note-box">
              <strong>Catatan</strong>
              <span>Akun kepala sekolah akan masuk daftar verifikasi admin. Setelah status diaktifkan, kepala sekolah bisa masuk sesuai jenjang SD/SMP.</span>
            </div>

            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? "Mengirim..." : "Registrasi"}
            </button>
          </form>

          <Link to="/login-kepala-sekolah" className="auth-link">Sudah punya akun? Masuk Kepala Sekolah</Link>
        </div>
      </main>

      <Footer />
    </>
  );
}

export default RegisterKepalaSekolah;
