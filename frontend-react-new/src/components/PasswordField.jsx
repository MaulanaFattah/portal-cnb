import { useState } from "react";

/**
 * Komponen EyeIcon.
 *
 * Peran: menampilkan ikon mata (SVG) untuk tombol toggle visibilitas kata sandi.
 * Bentuk ikon berubah sesuai status `visible`: ikon mata terbuka saat kata sandi
 * ditampilkan, dan ikon mata tercoret saat kata sandi disembunyikan.
 *
 * @param {Object} props - Properti komponen.
 * @param {boolean} props.visible - Status apakah kata sandi sedang ditampilkan.
 * @returns {JSX.Element} Elemen SVG ikon mata.
 */
function EyeIcon({ visible }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {visible ? (
        <>
          <path d="M2.8 12s3.3-6 9.2-6 9.2 6 9.2 6-3.3 6-9.2 6-9.2-6-9.2-6Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 5.2A9.8 9.8 0 0 1 12 5c5.9 0 9.2 7 9.2 7a15.7 15.7 0 0 1-3.1 4.1" />
          <path d="M6.5 6.8C4.2 8.4 2.8 12 2.8 12s3.3 7 9.2 7a9.1 9.1 0 0 0 4.1-1" />
          <path d="M9.9 9.9A3 3 0 0 0 14.1 14" />
        </>
      )}
    </svg>
  );
}

/**
 * Komponen PasswordField.
 *
 * Peran: input kata sandi dengan tombol untuk menampilkan/menyembunyikan teks.
 * Menyimpan status visibilitas pada state lokal `visible`; saat true tipe input
 * menjadi "text", saat false menjadi "password". Seluruh props lain diteruskan
 * (spread) ke elemen <input> sehingga komponen ini fleksibel dipakai di mana saja.
 *
 * @param {Object} props - Properti komponen.
 * @param {string} [props.className=""] - Kelas CSS tambahan untuk wrapper.
 * @param {...*} props - Properti lain yang diteruskan langsung ke elemen <input>.
 * @returns {JSX.Element} Elemen input kata sandi beserta tombol toggle.
 */
function PasswordField({ className = "", ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`password-input-wrap ${className}`.trim()}>
      <input {...props} type={visible ? "text" : "password"} />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
        aria-pressed={visible}
      >
        <EyeIcon visible={visible} />
      </button>
    </div>
  );
}

export default PasswordField;