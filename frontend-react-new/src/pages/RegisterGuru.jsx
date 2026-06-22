import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { registerGuru } from "../services/api";

const initialForm = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  jenjang: "sd",
  smpRole: "mapel",
  subject: ""
};

function RegisterGuru() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialForm);

  const isSmp = formData.jenjang === "smp";
  const isHomeroom = useMemo(
    () => isSmp && formData.smpRole === "wali_mapel",
    [isSmp, formData.smpRole]
  );
  const subjectRequired = isSmp;

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

    if (subjectRequired && !formData.subject.trim()) {
      alert("Mata pelajaran wajib diisi untuk guru SMP.");
      return;
    }

    const result = await registerGuru({
      name: formData.name,
      nama: formData.name,
      email: formData.email,
      password: formData.password,
      kata_sandi: formData.password,
      jenjang: formData.jenjang,
      teacher_type: isHomeroom ? "wali_kelas" : "mapel",
      tipe_guru: isHomeroom ? "wali_kelas" : "mapel",
      is_homeroom: isHomeroom,
      wali_kelas: isHomeroom,
      is_subject_teacher: Boolean(formData.subject.trim()),
      guru_mata_pelajaran: Boolean(formData.subject.trim()),
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

    alert("Registrasi guru berhasil. Akun menunggu verifikasi admin. Silakan masuk setelah akun diverifikasi.");
    setFormData(initialForm);
    navigate("/login-guru");
  };

  return (
    <>
      <Navbar />

      <main className="auth-page">
        <div className="auth-card">
          <h1>Registrasi Guru</h1>
          <p>Pilih jenjang mengajar lalu lengkapi data. Penugasan kelas wali tetap dikonfirmasi admin saat verifikasi.</p>

          <form className="teacher-register-form" onSubmit={handleRegister} autoComplete="off">
            <div className="form-group"><label>Nama Lengkap</label><input type="text" name="name" placeholder="Masukkan nama lengkap" value={formData.name} onChange={handleChange} autoComplete="off" required /></div>
            <div className="form-group"><label>Email</label><input type="email" name="email" placeholder="Masukkan email guru" value={formData.email} onChange={handleChange} autoComplete="off" required /></div>

            <div className="form-group"><label>Jenjang Mengajar</label>
              <select name="jenjang" value={formData.jenjang} onChange={handleChange} required>
                <option value="sd">Guru SD</option>
                <option value="smp">Guru SMP</option>
              </select>
            </div>

            {isSmp && (
              <div className="form-group"><label>Status Guru SMP</label>
                <select name="smpRole" value={formData.smpRole} onChange={handleChange} required>
                  <option value="mapel">Guru Mata Pelajaran</option>
                  <option value="wali_mapel">Guru Wali Kelas + Mata Pelajaran</option>
                </select>
              </div>
            )}

            {isSmp && (
              <div className="form-group full">
                <label>Mata Pelajaran</label>
                <input type="text" name="subject" placeholder="Contoh: Matematika, IPA" value={formData.subject} onChange={handleChange} autoComplete="off" required />
              </div>
            )}

            <div className="form-group"><label>Kata Sandi</label><input type="password" name="password" placeholder="Masukkan kata sandi" value={formData.password} onChange={handleChange} autoComplete="new-password" required /></div>
            <div className="form-group"><label>Konfirmasi Kata Sandi</label><input type="password" name="confirmPassword" placeholder="Ulangi kata sandi" value={formData.confirmPassword} onChange={handleChange} autoComplete="new-password" required /></div>

            <div className="form-group full ppdb-note-box">
              <strong>Catatan</strong>
              <span>{isSmp ? "Guru SMP memilih status mengajar dan mata pelajaran yang diampu. Admin menetapkan kelas wali saat verifikasi." : "Guru SD cukup mengisi data dasar. Mata pelajaran opsional dan kelas ditetapkan admin saat verifikasi."}</span>
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
