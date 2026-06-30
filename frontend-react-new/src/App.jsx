import { BrowserRouter, Routes, Route } from "react-router-dom";

import ScrollToTop from "./components/ScrollToTop";
import Home from "./pages/Home";
import Profil from "./pages/Profil";
import Kegiatan from "./pages/Kegiatan";
import Pengumuman from "./pages/Pengumuman";
import Galeri from "./pages/Galeri";
import Fasilitas from "./pages/Fasilitas";
import PPDB from "./pages/PPDB";
import FormPPDB from "./pages/FormPPDB";
import PerbaikiBerkasPPDB from "./pages/PerbaikiBerkasPPDB";
import Kontak from "./pages/Kontak";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import DashboardAdmin from "./pages/DashboardAdmin";
import LoginGuru from "./pages/LoginGuru";
import RegisterGuru from "./pages/RegisterGuru";
import LoginSiswa from "./pages/LoginSiswa";
import LoginOrangTua from "./pages/LoginOrangTua";
import LoginKepalaSekolah from "./pages/LoginKepalaSekolah";
import RegisterKepalaSekolah from "./pages/RegisterKepalaSekolah";
import LupaPassword from "./pages/LupaPassword";
import ChangePassword from "./pages/ChangePassword";
import AdminKegiatan from "./pages/AdminKegiatan";
import AdminPengumuman from "./pages/AdminPengumuman";
import AdminGaleri from "./pages/AdminGaleri";
import AdminFasilitas from "./pages/AdminFasilitas";
import AdminPPDB from "./pages/AdminPPDB";
import AdminKelas from "./pages/AdminKelas";
import AdminAkunSiswa from "./pages/AdminAkunSiswa";
import AdminProfilSekolah from "./pages/AdminProfilSekolah";
import AdminVerifikasiGuru from "./pages/AdminVerifikasiGuru";
import AdminDataGuru from "./pages/AdminDataGuru";
import AdminResetPasswordRequests from "./pages/AdminResetPasswordRequests";
import AdminKepalaSekolah from "./pages/AdminKepalaSekolah";
import DashboardGuru from "./pages/DashboardGuru";
import DashboardSiswa from "./pages/DashboardSiswa";
import DashboardOrangTua from "./pages/DashboardOrangTua";
import DashboardKepalaSekolah from "./pages/DashboardKepalaSekolah";

/**
 * Komponen App.
 *
 * Peran: komponen akar aplikasi yang mengatur seluruh routing menggunakan
 * react-router-dom. Membungkus aplikasi dengan <BrowserRouter>, menyertakan
 * <ScrollToTop /> agar setiap perpindahan rute mulai dari atas, lalu mendefinisikan
 * seluruh <Route> di dalam <Routes>.
 *
 * Peta routing (path -> komponen):
 *  Halaman publik:
 *   - "/"                         -> Home (beranda)
 *   - "/profil"                   -> Profil (profil sekolah)
 *   - "/kegiatan"                 -> Kegiatan (daftar kegiatan)
 *   - "/pengumuman"               -> Pengumuman (daftar pengumuman)
 *   - "/galeri"                   -> Galeri (galeri foto)
 *   - "/fasilitas"                -> Fasilitas (daftar fasilitas)
 *   - "/ppdb"                     -> PPDB (informasi PPDB)
 *   - "/form-ppdb"                -> FormPPDB (formulir pendaftaran PPDB)
 *   - "/kontak"                   -> Kontak (halaman kontak)
 *
 *  Autentikasi & registrasi:
 *   - "/login"                    -> Login (login umum)
 *   - "/admin-login"              -> AdminLogin (login administrator)
 *   - "/login-guru"               -> LoginGuru (login guru)
 *   - "/register-guru"            -> RegisterGuru (registrasi guru)
 *   - "/login-siswa"              -> LoginSiswa (login siswa)
 *   - "/login-orangtua"           -> LoginOrangTua (login orang tua)
 *   - "/login-kepala-sekolah"     -> LoginKepalaSekolah (login kepala sekolah)
 *   - "/register-kepala-sekolah"  -> RegisterKepalaSekolah (registrasi kepala sekolah)
 *   - "/lupa-password"            -> LupaPassword (permintaan reset kata sandi)
 *   - "/change-password"          -> ChangePassword (ubah kata sandi)
 *
 *  Dashboard per peran:
 *   - "/dashboard-admin"          -> DashboardAdmin (dasbor administrator)
 *   - "/dashboard-guru"           -> DashboardGuru (dasbor guru)
 *   - "/dashboard-siswa"          -> DashboardSiswa (dasbor siswa)
 *   - "/dashboard-orangtua"       -> DashboardOrangTua (dasbor orang tua)
 *   - "/dashboard-kepala-sekolah" -> DashboardKepalaSekolah (dasbor kepala sekolah)
 *
 *  Modul administrasi:
 *   - "/admin/kegiatan"           -> AdminKegiatan (kelola kegiatan)
 *   - "/admin/pengumuman"         -> AdminPengumuman (kelola pengumuman)
 *   - "/admin/galeri"             -> AdminGaleri (kelola galeri)
 *   - "/admin/fasilitas"          -> AdminFasilitas (kelola fasilitas)
 *   - "/admin/ppdb"               -> AdminPPDB (kelola pendaftaran PPDB)
 *   - "/admin/kelas"              -> AdminKelas (kelola kelas)
 *   - "/admin/siswa"              -> AdminAkunSiswa (kelola siswa & orang tua)
 *   - "/admin/akun-siswa"         -> AdminAkunSiswa (alias kelola siswa & orang tua)
 *   - "/admin/profil-sekolah"     -> AdminProfilSekolah (kelola profil sekolah)
 *   - "/admin/verifikasi-guru"    -> AdminVerifikasiGuru (verifikasi pendaftaran guru)
 *   - "/admin/reset-password"     -> AdminResetPasswordRequests (kelola permintaan reset password)
 *   - "/admin/kepala-sekolah"     -> AdminKepalaSekolah (kelola kepala sekolah)
 *
 * Catatan: "/admin/siswa" dan "/admin/akun-siswa" sama-sama memetakan ke
 * komponen AdminAkunSiswa.
 *
 * @returns {JSX.Element} Pohon routing aplikasi yang terbungkus BrowserRouter.
 */
function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/profil" element={<Profil />} />
        <Route path="/kegiatan" element={<Kegiatan />} />
        <Route path="/pengumuman" element={<Pengumuman />} />
        <Route path="/galeri" element={<Galeri />} />
        <Route path="/fasilitas" element={<Fasilitas />} />
        <Route path="/ppdb" element={<PPDB />} />
        <Route path="/form-ppdb" element={<FormPPDB />} />
        <Route path="/perbaiki-berkas" element={<PerbaikiBerkasPPDB />} />
        <Route path="/kontak" element={<Kontak />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/dashboard-admin" element={<DashboardAdmin />} />
        <Route path="/login-guru" element={<LoginGuru />} />
        <Route path="/dashboard-guru" element={<DashboardGuru />} />
        <Route path="/dashboard-siswa" element={<DashboardSiswa />} />
        <Route path="/dashboard-orangtua" element={<DashboardOrangTua />} />
        <Route path="/dashboard-kepala-sekolah" element={<DashboardKepalaSekolah />} />
        <Route path="/register-guru" element={<RegisterGuru />} />
        <Route path="/login-siswa" element={<LoginSiswa />} />
        <Route path="/login-orangtua" element={<LoginOrangTua />} />
        <Route path="/login-kepala-sekolah" element={<LoginKepalaSekolah />} />
        <Route path="/register-kepala-sekolah" element={<RegisterKepalaSekolah />} />
        <Route path="/lupa-password" element={<LupaPassword />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/admin/kegiatan" element={<AdminKegiatan />} />
        <Route path="/admin/pengumuman" element={<AdminPengumuman />} />
        <Route path="/admin/galeri" element={<AdminGaleri />} />
        <Route path="/admin/fasilitas" element={<AdminFasilitas />} />
        <Route path="/admin/ppdb" element={<AdminPPDB />} />
        <Route path="/admin/kelas" element={<AdminKelas />} />
        <Route path="/admin/siswa" element={<AdminAkunSiswa />} />
        <Route path="/admin/akun-siswa" element={<AdminAkunSiswa />} />
        <Route path="/admin/profil-sekolah" element={<AdminProfilSekolah />} />
        <Route path="/admin/verifikasi-guru" element={<AdminVerifikasiGuru />} />
        <Route path="/admin/guru" element={<AdminDataGuru />} />
        <Route path="/admin/reset-password" element={<AdminResetPasswordRequests />} />
        <Route path="/admin/kepala-sekolah" element={<AdminKepalaSekolah />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
