/**
 * ============================================================================
 * SKRIP MIGRASI (USANG/DEPRECATED): migrateEnglishSingularSchema
 * ============================================================================
 *
 * TUJUAN:
 * Skrip ini dahulu digunakan untuk migrasi skema versi lama yang memakai nama
 * tabel/kolom berbahasa Inggris bentuk tunggal (singular). Skrip ini SUDAH
 * TIDAK DIGUNAKAN lagi dan dipertahankan hanya sebagai pengalih (shim) agar
 * pemanggilan lama tetap berfungsi.
 *
 * PERILAKU:
 * Saat dijalankan, skrip hanya mencetak peringatan deprecation lalu meneruskan
 * (delegasi) eksekusi ke skrip migrasi skema Bahasa Indonesia
 * (./migrateSchemaIndonesia) yang merupakan migrasi resmi saat ini.
 *
 * PERINGATAN:
 * Karena meneruskan ke migrateSchemaIndonesia, menjalankan skrip ini akan
 * MENGUBAH SKEMA & DATA DATABASE. Jangan dijalankan tanpa backup.
 * ============================================================================
 */

console.warn("migrateEnglishSingularSchema sudah tidak digunakan. Menjalankan migrasi skema Bahasa Indonesia sebagai pengganti.");
// Teruskan eksekusi ke skrip migrasi skema Bahasa Indonesia (migrasi aktif).
require("./migrateSchemaIndonesia");
