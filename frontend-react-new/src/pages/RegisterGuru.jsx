import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { registerGuru } from "../services/api";

const initialForm = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  subject: ""
};

function RegisterGuru() {
  const [formData, setFormData] = useState(initialForm);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleRegister = async (event) => {
    event.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Konfirmasi kata sandi tidak sesuai");
      return;
    }

    if (!formData.subject.trim()) {
      alert("Mata pelajaran wajib diisi untuk registrasi guru.");
      return;
    }

    const result = await registerGuru({
      name: formData.name,
      nama: formData.name,
      email: formData.email,
      password: formData.password,
      kata_sandi: formData.password,
      teacher_type: "mapel",
      tipe_guru: "mapel",
      is_homeroom: false,
      wali_kelas: false,
      is_subject_teacher: true,
      guru_mata_pelajaran: true,
      homeroom_classroom_id: null,
      kelas_wali_id: null,
      subjects: formData.subject,
      mata_pelajaran: formData.subject,
      profession: formData.subject
    });

    if (!result.success) {
      alert(result.message);
      return;
    }

    alert("Registrasi guru berhasil. Akun menunggu verifikasi admin. Jika ditetapkan sebagai wali kelas, admin akan mengaturnya dari dashboard.");
    setFormData(initialForm);
  };

  return (
    <>
      <Navbar />

      <main className="auth-page">
        <div className="auth-card">
          <h1>Registrasi Guru</h1>
          <p>Guru mendaftar sebagai guru mata pelajaran. Penugasan wali kelas akan ditentukan oleh admin sekolah setelah verifikasi.</p>

          <form className="teacher-register-form" onSubmit={handleRegister} autoComplete="off">
            <div className="form-group"><label>Nama Lengkap</label><input type="text" name="name" placeholder="Masukkan nama lengkap" value={formData.name} onChange={handleChange} autoComplete="off" required /></div>
            <div className="form-group"><label>Email</label><input type="email" name="email" placeholder="Masukkan email guru" value={formData.email} onChange={handleChange} autoComplete="off" required /></div>
            <div className="form-group full"><label>Mata Pelajaran</label><input type="text" name="subject" placeholder="Contoh: Matematika, IPA" value={formData.subject} onChange={handleChange} autoComplete="off" required /></div>
            <div className="form-group"><label>Kata Sandi</label><input type="password" name="password" placeholder="Masukkan kata sandi" value={formData.password} onChange={handleChange} autoComplete="new-password" required /></div>
            <div className="form-group"><label>Konfirmasi Kata Sandi</label><input type="password" name="confirmPassword" placeholder="Ulangi kata sandi" value={formData.confirmPassword} onChange={handleChange} autoComplete="new-password" required /></div>

            <div className="form-group full ppdb-note-box">
              <strong>Catatan wali kelas</strong>
              <span>Guru tidak memilih wali kelas saat registrasi. Admin sekolah akan menetapkan kelas wali jika guru ditugaskan sebagai wali kelas.</span>
            </div>

            <button type="submit" className="submit-btn">Registrasi</button>
          </form>

          <Link to="/login-guru" className="auth-link">Sudah punya akun? Masuk Guru</Link>
        </div>
      </main>

      <Footer />
    </>
  );
}

export default RegisterGuru;