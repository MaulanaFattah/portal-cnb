import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { getProfilSekolah } from "../services/api";

const fallbackProfile = {
  nama_sekolah: "Cipta Nusa Bakti",
  visi: "Menjadi sekolah unggulan yang berkarakter, berakhlak mulia, cerdas, kreatif, dan inovatif.",
  misi: "Menyelenggarakan pendidikan bermutu yang mengembangkan karakter, kompetensi, dan keterampilan peserta didik.",
  sejarah: "Cipta Nusa Bakti hadir sebagai lembaga pendidikan yang berkomitmen memberi layanan pendidikan terbaik bagi masyarakat.",
  fasilitas: "Ruang kelas, perpustakaan, area olahraga, dan lingkungan sekolah yang aman.",
  struktur_sekolah: "Kepala sekolah, wakil kepala sekolah, guru, wali kelas, dan tenaga kependidikan."
};

function Profil() {
  const [profile, setProfile] = useState(fallbackProfile);

  useEffect(() => {
    (async () => {
      const result = await getProfilSekolah();
      if (result.success && result.data) setProfile({ ...fallbackProfile, ...result.data });
    })();
  }, []);

  const sections = [
    ["Visi", profile.visi],
    ["Misi", profile.misi],
    ["Sejarah", profile.sejarah],
    ["Fasilitas", profile.fasilitas],
    ["Struktur Sekolah", profile.struktur_sekolah]
  ];

  return (
    <>
      <Navbar />

      <main>
        <section className="page-hero container">
          <span className="badge">Profil Sekolah</span>
          <h1>{profile.nama_sekolah}</h1>
          <p>Visi, misi, sejarah, fasilitas, dan struktur sekolah.</p>
        </section>

        <section className="container">
          <div className="profile-wrapper">
            {sections.map(([title, content]) => (
              <article className="profile-card" key={title}>
                <h3>{title}</h3>
                <p>{content || "Belum diisi oleh admin."}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default Profil;
