import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./assets/style.css";

/**
 * Titik masuk (entry point) aplikasi React.
 *
 * Peran: melakukan bootstrap aplikasi dengan membuat root React pada elemen DOM
 * ber-id "root", lalu merender komponen <App /> yang berisi seluruh routing.
 * Dibungkus dengan <React.StrictMode> untuk membantu mendeteksi potensi masalah
 * selama pengembangan. Berkas global stylesheet (style.css) juga diimpor di sini.
 */
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);