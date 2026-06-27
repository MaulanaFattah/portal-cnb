import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Komponen ScrollToTop.
 *
 * Peran: utilitas navigasi yang tidak merender UI apa pun (mengembalikan null).
 * Setiap kali path rute (pathname) berubah, komponen ini menggulir jendela kembali
 * ke posisi paling atas sehingga halaman baru selalu tampil dari atas.
 *
 * Handler penting:
 * - useEffect yang bergantung pada `pathname`: dipicu pada setiap perpindahan rute
 *   untuk memanggil window.scrollTo ke koordinat (0, 0).
 *
 * @returns {null} Tidak merender elemen apa pun.
 */
// Pastikan setiap perpindahan rute selalu mulai dari atas halaman.
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

export default ScrollToTop;
