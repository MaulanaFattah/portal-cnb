import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { getKelas, registerGuru } from "../services/api";

function RegisterGuru() {
  const navigate = useNavigate();
  const [kelas, setKelas] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    is_homeroom: false,
    is_subject_teacher: true,
    homeroom_classroom_id: "",
    subject: ""
  });

  useEffect(() => {
    (async () => {
      const result = await getKelas();
      if (result.success) setKelas(result.data || []);
    })();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Password dan konfirmasi password tidak sama.");
      return;
    }

    if (!formData.is_homeroom && !formData.is_subject_teacher) {
      alert("Pilih minimal satu peran guru.");
      return;
    }

    if (formData.is_homeroom && !formData.homeroom_classroom_id) {
      alert("Guru wali kelas wajib memilih kelas.");
      return;
    }

    if (formData.is_subject_teacher && !formData.subject.trim()) {
      alert("Guru mata pelajaran wajib mengisi minimal satu mata pelajaran.");
      return;
    }

    const result = await registerGuru({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      is_homeroom: formData.is_homeroom,
      is_subject_teacher: formData.is_subject_teacher,
      homeroom_classroom_id: formData.is_homeroom ? formData.homeroom_classroom_id : null,
      subjects: formData.is_subject_teacher ? formData.subject : "",
      profession: [formData.is_homeroom ? "Wali Kelas" : null, formData.is_subject_teacher ? formData.subject : null].filter(Boolean).join(" + ")
    });

    if (!result.success) {
      alert(result.message);
      return;
    }

    alert("Registrasi berhasil. Akun guru menunggu verifikasi admin sebelum bisa login.");
    navigate("/login-guru");
  };

  return (
    <>
      <Navbar />

      <main className="auth-page container">
        <div className="auth-card">
          <h1>Registrasi Guru</h1>
          <p>Guru dapat mendaftar sebagai wali kelas, guru mata pelajaran, atau keduanya. Akun aktif setelah disetujui admin.</p>

          <form onSubmit={handleRegister}>
            <div className="form-group"><label>Nama Lengkap</label><input type="text" name="name" placeholder="Masukkan nama lengkap" value={formData.name} onChange={handleChange} required /></div>
            <div className="form-group"><label>Email</label><input type="email" name="email" placeholder="guru@cnb.sch.id" value={formData.email} onChange={handleChange} required /></div>

            <div className="form-group">
              <label>Peran Guru</label>
              <div className="checkbox-stack">
                <label><input type="checkbox" name="is_homeroom" checked={formData.is_homeroom} onChange={handleChange} /> Guru Wali Kelas</label>
                <label><input type="checkbox" name="is_subject_teacher" checked={formData.is_subject_teacher} onChange={handleChange} /> Guru Mata Pelajaran</label>
              </div>
            </div>

            {formData.is_homeroom && <div className="form-group"><label>Kelas Wali</label><select name="homeroom_classroom_id" value={formData.homeroom_classroom_id} onChange={handleChange} required><option value="">Pilih kelas</option>{kelas.map((item) => <option key={item.id} value={item.id}>{[item.nama_kelas, item.tingkat, item.tahun_ajaran].filter(Boolean).join(" - ")}</option>)}</select></div>}
            {formData.is_subject_teacher && <div className="form-group"><label>Mata Pelajaran</label><input type="text" name="subject" placeholder="Contoh: Matematika, IPA" value={formData.subject} onChange={handleChange} required /></div>}

            <div className="form-group"><label>Password</label><input type="password" name="password" placeholder="Masukkan password" value={formData.password} onChange={handleChange} required /></div>
            <div className="form-group"><label>Konfirmasi Password</label><input type="password" name="confirmPassword" placeholder="Ulangi password" value={formData.confirmPassword} onChange={handleChange} required /></div>

            <button type="submit" className="submit-btn">Registrasi</button>
          </form>

          <Link to="/login-guru" className="auth-link">Sudah punya akun? Login Guru</Link>
        </div>
      </main>

      <Footer />
    </>
  );
}

export default RegisterGuru;
