import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { requestPasswordReset } from "../services/api";

const roleOptions = [
  {
    value: "siswa",
    label: "Siswa",
    description: "Masukkan NISN siswa yang terdaftar."
  },
  {
    value: "orangtua",
    label: "Orang Tua",
    description: "Masukkan email dan nomor HP orang tua yang terhubung ke siswa."
  },
  {
    value: "guru",
    label: "Guru",
    description: "Masukkan email akun guru."
  },
  {
    value: "kepala_sekolah",
    label: "Kepala Sekolah",
    description: "Masukkan email resmi kepala sekolah."
  }
];

/**
 * Menentukan peran awal yang valid berdasarkan parameter URL.
 * @param {string} value Nilai peran dari query string.
 * @returns {string} Peran yang valid bila cocok dengan roleOptions, jika tidak "siswa".
 * Efek: murni.
 */
function getInitialRole(value) {
  return roleOptions.some((role) => role.value === value) ? value : "siswa";
}

const emptyFields = {
  nisn: "",
  parent_email: "",
  parent_phone: "",
  guru_email: "",
  kepala_email: ""
};

/**
 * Halaman Lupa Kata Sandi - halaman publik.
 * Akses: umum (untuk semua peran: siswa, orang tua, guru, kepala sekolah).
 * Fungsi halaman: memilih jenis akun (atau dikunci via query ?role=), mengisi data
 * verifikasi sesuai peran, lalu mengirim permintaan reset kata sandi ke admin.
 */
function LupaPassword() {
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get("role");
  const isRoleLocked = roleOptions.some((role) => role.value === roleParam);
  const initialRole = useMemo(() => getInitialRole(roleParam), [roleParam]);
  const [formData, setFormData] = useState({ role: initialRole, ...emptyFields });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const selectedRole = roleOptions.find((role) => role.value === formData.role) || roleOptions[0];

  /**
   * Mengganti peran terpilih dan mereset field form.
   * @param {string} role Peran baru yang dipilih.
   * Efek state: setMessage(null) dan setFormData ke peran baru dengan field kosong.
   */
  const handleRoleChange = (role) => {
    setMessage(null);
    setFormData({ role, ...emptyFields });
  };

  /**
   * Menangani perubahan input pada form verifikasi.
   * @param {Event} event Event perubahan input (membawa name & value).
   * Efek state: memperbarui field terkait pada formData.
   */
  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  /**
   * Menyusun payload permintaan reset sesuai peran yang dipilih.
   * @returns {object} Payload berisi role dan identitas (nisn/email/no_telepon). Efek: murni.
   */
  const buildPayload = () => {
    if (formData.role === "siswa") {
      return { role: "siswa", nisn: formData.nisn };
    }

    if (formData.role === "orangtua") {
      return {
        role: "orangtua",
        email: formData.parent_email,
        no_telepon: formData.parent_phone
      };
    }

    if (formData.role === "kepala_sekolah") {
      return { role: "kepala_sekolah", email: formData.kepala_email };
    }

    return { role: "guru", email: formData.guru_email };
  };

  /**
   * Mengirim permintaan reset kata sandi ke server.
   * @param {Event} event Event submit form (dicegah default-nya).
   * Memanggil API: requestPasswordReset(buildPayload()).
   * Efek state: setLoading, setMessage (sukses/gagal); bila sukses mengosongkan field form.
   */
  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await requestPasswordReset(buildPayload());
    setMessage({ type: result.success ? "success" : "error", text: result.message });
    setLoading(false);

    if (result.success) {
      setFormData((current) => ({ role: current.role, ...emptyFields }));
    }
  };

  return (
    <>
      <Navbar />

      <main className="auth-page container forgot-password-page">
        <div className="auth-card forgot-password-card">
          <span className="auth-eyebrow">Bantuan akun portal</span>
          <h1>Lupa Kata Sandi</h1>

          <p>
            {isRoleLocked
              ? `Khusus akun ${selectedRole.label}. Isi identitas yang diminta, lalu admin akan memverifikasi sebelum kata sandi sementara diberikan.`
              : "Pilih jenis akun, isi identitas yang diminta, lalu admin akan memverifikasi sebelum kata sandi sementara diberikan."}
          </p>

          <form onSubmit={handleSubmit} autoComplete="off" className="forgot-password-form">
            {!isRoleLocked && (
              <fieldset className="forgot-role-group">
                <legend>Jenis Akun</legend>
                <div className="forgot-role-grid">
                  {roleOptions.map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      className={`forgot-role-card ${formData.role === role.value ? "active" : ""}`}
                      onClick={() => handleRoleChange(role.value)}
                      aria-pressed={formData.role === role.value}
                    >
                      <strong>{role.label}</strong>
                      <span>{role.description}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            <div className="forgot-dynamic-panel">
              <div>
                <span className="auth-eyebrow">Data verifikasi</span>
                <h2>{selectedRole.label}</h2>
                <p>{selectedRole.description}</p>
              </div>

              {formData.role === "siswa" && (
                <div className="form-group">
                  <label>NISN Siswa</label>
                  <input
                    type="text"
                    name="nisn"
                    placeholder="Masukkan NISN siswa"
                    value={formData.nisn}
                    onChange={handleChange}
                    inputMode="numeric"
                    required
                  />
                </div>
              )}

              {formData.role === "orangtua" && (
                <div className="forgot-field-grid">
                  <div className="form-group">
                    <label>Email Orang Tua</label>
                    <input
                      type="email"
                      name="parent_email"
                      placeholder="Masukkan nama@cnb.sch.id"
                      value={formData.parent_email}
                      onChange={handleChange}
                      autoComplete="email"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Nomor HP Orang Tua</label>
                    <input
                      type="tel"
                      name="parent_phone"
                      placeholder="Contoh: 081234567890"
                      value={formData.parent_phone}
                      onChange={handleChange}
                      autoComplete="tel"
                      required
                    />
                  </div>
                </div>
              )}

              {formData.role === "guru" && (
                <div className="form-group">
                  <label>Email Guru</label>
                  <input
                    type="email"
                    name="guru_email"
                    placeholder="Masukkan nama@cnb.sch.id"
                    value={formData.guru_email}
                    onChange={handleChange}
                    autoComplete="email"
                    required
                  />
                </div>
              )}

              {formData.role === "kepala_sekolah" && (
                <div className="form-group">
                  <label>Email Kepala Sekolah</label>
                  <input
                    type="email"
                    name="kepala_email"
                    placeholder="Masukkan nama@cnb.sch.id"
                    value={formData.kepala_email}
                    onChange={handleChange}
                    autoComplete="email"
                    required
                  />
                </div>
              )}
            </div>

            {message && <p className={`forgot-message ${message.type}`} role="status">{message.text}</p>}

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Mengirim..." : "Kirim Permintaan"}
            </button>
          </form>

          <p className="forgot-admin-note">
            Setelah mengirim permintaan, silakan hubungi admin sekolah untuk meminta persetujuan dan kata sandi sementara.
          </p>

          <Link to="/login" className="auth-link auth-back-link">Kembali ke Masuk</Link>
        </div>
      </main>

      <Footer />
    </>
  );
}

export default LupaPassword;
