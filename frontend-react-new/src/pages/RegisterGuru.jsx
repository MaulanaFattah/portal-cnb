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
    is_subject_teacher: false,
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

  const getRoleSelection = () => {
    if (formData.is_homeroom && formData.is_subject_teacher) return "keduanya";
    if (formData.is_homeroom) return "wali_kelas";
    if (formData.is_subject_teacher) return "mapel";
    return "";
  };

  const handleRoleSelect = (value) => {
    const isHomeroom = value === "wali_kelas" || value === "keduanya";
    const isSubjectTeacher = value === "mapel" || value === "keduanya";

    setFormData((current) => ({
      ...current,
      is_homeroom: isHomeroom,
      is_subject_teacher: isSubjectTeacher,
      homeroom_classroom_id: isHomeroom ? current.homeroom_classroom_id : "",
      subject: isSubjectTeacher ? current.subject : ""
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Kata sandi dan konfirmasi kata sandi tidak sama.");
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
      nama: formData.name,
      email: formData.email,
      password: formData.password,
      kata_sandi: formData.password,
      is_homeroom: formData.is_homeroom,
      wali_kelas: formData.is_homeroom,
      is_subject_teacher: formData.is_subject_teacher,
      guru_mata_pelajaran: formData.is_subject_teacher,
      homeroom_classroom_id: formData.is_homeroom ? formData.homeroom_classroom_id : null,
      kelas_wali_id: formData.is_homeroom ? formData.homeroom_classroom_id : null,
      subjects: formData.is_subject_teacher ? formData.subject : "",
      mata_pelajaran: formData.is_subject_teacher ? formData.subject : "",
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

          <form className="teacher-register-form" onSubmit={handleRegister} autoComplete="off">
            <div className="form-group"><label>Nama Lengkap</label><input type="text" name="name" placeholder="Masukkan nama lengkap" value={formData.name} onChange={handleChange} autoComplete="off" required /></div>
            <div className="form-group"><label>Email</label><input type="email" name="email" placeholder="Masukkan email guru" value={formData.email} onChange={handleChange} autoComplete="off" required /></div>

            <div className="form-group role-field full">
              <label>Peran Guru</label>
              <select className="teacher-role-select" value={getRoleSelection()} onChange={(event) => handleRoleSelect(event.target.value)} required>
                <option value="">Pilih peran guru</option>
                <option value="wali_kelas">Guru Wali Kelas</option>
                <option value="mapel">Guru Mata Pelajaran</option>
                <option value="keduanya">Wali Kelas + Guru Mata Pelajaran</option>
              </select>
              <small className="role-select-help">Pilih satu opsi. Field kelas atau mata pelajaran akan muncul sesuai peran yang dipilih.</small>
            </div>

            {formData.is_homeroom && <div className="form-group"><label>Kelas Wali</label><select name="homeroom_classroom_id" value={formData.homeroom_classroom_id} onChange={handleChange} required><option value="">Pilih kelas</option>{kelas.map((item) => <option key={item.id} value={item.id}>{[item.nama_kelas, item.tingkat, item.tahun_ajaran].filter(Boolean).join(" - ")}</option>)}</select></div>}
            {formData.is_subject_teacher && <div className="form-group"><label>Mata Pelajaran</label><input type="text" name="subject" placeholder="Contoh: Matematika, IPA" value={formData.subject} onChange={handleChange} autoComplete="off" required /></div>}

            <div className="form-group"><label>Kata Sandi</label><input type="password" name="password" placeholder="Masukkan kata sandi" value={formData.password} onChange={handleChange} autoComplete="new-password" required /></div>
            <div className="form-group"><label>Konfirmasi Kata Sandi</label><input type="password" name="confirmPassword" placeholder="Ulangi kata sandi" value={formData.confirmPassword} onChange={handleChange} autoComplete="new-password" required /></div>

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
