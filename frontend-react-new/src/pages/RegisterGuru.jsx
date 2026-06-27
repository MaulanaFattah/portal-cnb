import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { getKelas, registerGuru } from "../services/api";
import PasswordField from "../components/PasswordField";

const initialForm = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  jenjang: "sd",
  kelas_id: "",
  smpRole: "mapel",
  subject: ""
};

/**
 * Menebak jenjang kelas (SD/SMP) berdasarkan tingkat dan nama kelas.
 * @param {{tingkat?:string, nama_kelas?:string}} kelas Objek kelas.
 * @returns {"smp"|"sd"|""} "smp" atau "sd" bila terdeteksi, "" bila tidak diketahui.
 * Efek: murni (tidak memanggil API maupun mengubah state).
 */
function inferKelasJenjang(kelas) {
  const text = `${kelas?.tingkat || ""} ${kelas?.nama_kelas || ""}`.toLowerCase();
  if (/(smp|vii|viii|ix|\b7\b|\b8\b|\b9\b)/.test(text)) return "smp";
  if (/(sd|\b1\b|\b2\b|\b3\b|\b4\b|\b5\b|\b6\b|\bi\b|\bii\b|\biii\b|\biv\b|\bv\b|\bvi\b)/.test(text)) return "sd";
  return "";
}

/**
 * Halaman Registrasi Guru - halaman publik.
 * Akses: umum (calon guru yang mendaftar; akun menunggu verifikasi admin).
 * Fungsi halaman: form registrasi guru dengan pilihan jenjang (SD/SMP), kelas absensi
 * (SD), status guru SMP (mapel/wali+mapel), mata pelajaran, dan kata sandi. Mengirim data
 * registrasi ke server lalu mengarahkan ke halaman login guru.
 */
function RegisterGuru() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialForm);
  const [kelasOptions, setKelasOptions] = useState([]);

  const isSmp = formData.jenjang === "smp";
  const isSd = formData.jenjang === "sd";
  // Apakah pengisi adalah wali kelas SMP (status wali_mapel).
  const isHomeroom = useMemo(
    () => isSmp && formData.smpRole === "wali_mapel",
    [isSmp, formData.smpRole]
  );
  const subjectRequired = isSmp;
  // Opsi kelas khusus jenjang SD (menyaring kelas yang terdeteksi sebagai SMP).
  const sdKelasOptions = useMemo(
    () => kelasOptions.filter((kelas) => inferKelasJenjang(kelas) !== "smp"),
    [kelasOptions]
  );

  // Efek pemuatan awal: mengambil daftar kelas dari API untuk opsi kelas absensi.
  useEffect(() => {
    (async () => {
      const result = await getKelas();
      if (result.success) setKelasOptions(result.data || []);
    })();
  }, []);

  /**
   * Menangani perubahan input/select pada form registrasi.
   * @param {Event} event Event perubahan (membawa name & value).
   * Efek state: memperbarui field terkait; bila field "jenjang" berubah, mereset
   * kelas_id, subject, dan smpRole ke nilai awal.
   */
  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
      ...(name === "jenjang" ? { kelas_id: "", subject: "", smpRole: "mapel" } : {})
    }));
  };

  /**
   * Memproses registrasi guru.
   * @param {Event} event Event submit form (dicegah default-nya).
   * Validasi: konfirmasi kata sandi cocok, mata pelajaran wajib untuk SMP, kelas wajib untuk SD.
   * Memanggil API: registerGuru({...}) dengan payload peran/jenjang/kelas/mapel.
   * Efek: alert bila gagal/validasi; bila sukses mereset form dan navigate ke "/login-guru".
   */
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

    if (isSd && !formData.kelas_id) {
      alert("Kelas absensi wajib dipilih untuk guru SD.");
      return;
    }

    const result = await registerGuru({
      name: formData.name,
      nama: formData.name,
      email: formData.email,
      password: formData.password,
      kata_sandi: formData.password,
      jenjang: formData.jenjang,
      teacher_type: isSd || isHomeroom ? "wali_kelas" : "mapel",
      tipe_guru: isSd || isHomeroom ? "wali_kelas" : "mapel",
      is_homeroom: isSd || isHomeroom,
      wali_kelas: isSd || isHomeroom,
      is_subject_teacher: Boolean(formData.subject.trim()),
      guru_mata_pelajaran: Boolean(formData.subject.trim()),
      homeroom_classroom_id: isSd ? formData.kelas_id : null,
      kelas_wali_id: isSd ? formData.kelas_id : null,
      kelas_id: isSd ? formData.kelas_id : null,
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
            <div className="form-group"><label>Email</label><input type="email" name="email" placeholder="email@cnb.sch.id" value={formData.email} onChange={handleChange} autoComplete="off" required /></div>

            <div className="form-group"><label>Jenjang Mengajar</label>
              <select name="jenjang" value={formData.jenjang} onChange={handleChange} required>
                <option value="sd">Guru SD</option>
                <option value="smp">Guru SMP</option>
              </select>
            </div>

            {isSd && (
              <div className="form-group full">
                <label>Kelas Absensi</label>
                <select name="kelas_id" value={formData.kelas_id} onChange={handleChange} required>
                  <option value="">Pilih kelas SD</option>
                  {sdKelasOptions.map((kelas) => (
                    <option key={kelas.id} value={kelas.id}>{kelas.nama_kelas} - {kelas.tahun_ajaran}</option>
                  ))}
                </select>
                <small className="field-helper">Kelas ini menjadi kelas absensi utama guru SD dan tetap dapat dikonfirmasi admin.</small>
              </div>
            )}

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

            <div className="form-group"><label>Kata Sandi</label><PasswordField name="password" placeholder="Masukkan kata sandi" value={formData.password} onChange={handleChange} autoComplete="new-password" required /></div>
            <div className="form-group"><label>Konfirmasi Kata Sandi</label><PasswordField name="confirmPassword" placeholder="Ulangi kata sandi" value={formData.confirmPassword} onChange={handleChange} autoComplete="new-password" required /></div>

            <div className="form-group full ppdb-note-box">
              <strong>Catatan</strong>
              <span>{isSmp ? "Guru SMP memilih status mengajar dan mata pelajaran yang diampu. Admin menetapkan kelas wali saat verifikasi." : "Guru SD memilih kelas absensi utama. Mata pelajaran tidak perlu diisi untuk guru SD."}</span>
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
