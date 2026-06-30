import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import { getPPDB, updatePPDB, getRekapPPDB, setPPDBDaftarUlang, deletePPDB, logout, resolveMediaUrl } from "../services/api";

/**
 * Memformat tanggal ke format lokal Indonesia (mis. "5 Juni 2025").
 *
 * Parameter: value - tanggal (string/Date).
 * Mengembalikan: teks tanggal panjang, "-" bila kosong, atau nilai asli bila
 * tidak bisa diparse.
 */
function formatTanggal(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (isNaN(date)) return value;
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

const STATUS_LABEL = { pending: "Menunggu Verifikasi", diterima: "Diterima", ditolak: "Ditolak", revisi_berkas: "Berkas Perlu Diperbaiki" };
const TYPE_LABEL = { pendaftaran_baru: "Pendaftaran Baru", siswa_pindahan: "Siswa Pindahan" };
const LEVEL_LABEL = { tk: "TK", sd: "SD", smp: "SMP" };

/**
 * Daftar field DATA (biodata) yang dapat diminta diperbaiki oleh admin saat
 * meminta perbaikan (mis. salah nama, NIK keliru, dll).
 */
const DATA_REVISION_FIELDS = [
  { key: "nama_lengkap", label: "Nama Lengkap" },
  { key: "nisn", label: "NISN" },
  { key: "nik", label: "NIK" },
  { key: "no_kk", label: "No. Kartu Keluarga" },
  { key: "tempat_lahir", label: "Tempat Lahir" },
  { key: "tanggal_lahir", label: "Tanggal Lahir" },
  { key: "jenis_kelamin", label: "Jenis Kelamin" },
  { key: "agama", label: "Agama" },
  { key: "alamat", label: "Alamat" },
  { key: "nama_orang_tua", label: "Nama Orang Tua/Wali" },
  { key: "no_telepon", label: "No. HP Orang Tua" },
  { key: "nama_ayah", label: "Nama Ayah" },
  { key: "nama_ibu", label: "Nama Ibu" }
];

/**
 * Membangun daftar berkas wajib/opsional untuk satu pendaftar PPDB.
 *
 * Parameter: item - objek pendaftar PPDB.
 * Mengembalikan: array dokumen { key, label, value (URL media), required }.
 * Kewajiban tiap berkas menyesuaikan jenjang dan jenis pendaftaran (mis.
 * raport wajib untuk SD/SMP, surat pindah wajib untuk siswa pindahan).
 */
function getRequiredDocuments(item) {
  // Berkas wajib untuk semua jenjang.
  const documents = [
    { key: "berkas_akta", label: "Akta Kelahiran", value: resolveMediaUrl(item.berkas_akta), required: true },
    { key: "berkas_kk", label: "Fotokopi KK", value: resolveMediaUrl(item.berkas_kk), required: true },
    { key: "berkas_ktp_ortu", label: "KTP Orang Tua/Wali", value: resolveMediaUrl(item.berkas_ktp_ortu), required: true },
    { key: "foto_siswa", label: "Pas Foto Calon Siswa", value: resolveMediaUrl(item.foto_siswa), required: true }
  ];
  // Rapor hanya untuk jenjang SD/SMP (TK tidak memerlukan).
  if (["sd", "smp"].includes(item.target_jenjang)) {
    documents.push({ key: "berkas_raport", label: "Raport Terakhir", value: resolveMediaUrl(item.berkas_raport), required: true });
  }
  // Surat pindah hanya untuk siswa pindahan.
  if (item.jenis_pendaftaran === "siswa_pindahan") {
    documents.push({ key: "berkas_surat_pindah", label: "Surat Pindahan", value: resolveMediaUrl(item.berkas_surat_pindah), required: true });
  }
  return documents;
}

/**
 * Menentukan jenis berkas berdasarkan nilai/URL-nya.
 *
 * Parameter: value - data URL atau path berkas.
 * Mengembalikan: "missing" (kosong), "image", "pdf", atau "file" (lainnya).
 */
function getFileType(value) {
  if (!value) return "missing";
  const fileValue = String(value).toLowerCase();
  if (fileValue.startsWith("data:image/") || /\.(jpg|jpeg|png|webp)(\?|#|$)/.test(fileValue)) return "image";
  if (fileValue.startsWith("data:application/pdf") || /\.pdf(\?|#|$)/.test(fileValue)) return "pdf";
  return "file";
}

/**
 * Mengubah data URL base64 menjadi objek Blob.
 *
 * Dipakai agar berkas yang tersimpan sebagai data URL (base64) dapat dibuka
 * lewat Object URL (blob:) yang seasal (same-origin) dan aman, alih-alih membuka
 * skema "data:" yang diblokir browser (mengakibatkan about:blank & "not secure").
 *
 * Parameter: dataUrl - string berformat "data:<mime>;base64,<payload>".
 * Mengembalikan: Blob hasil dekode; melempar error bila format tidak valid.
 */
function dataUrlToBlob(dataUrl) {
  const [meta, base64] = String(dataUrl).split(",");
  const mimeMatch = /data:([^;]+)/.exec(meta || "");
  const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
  const binary = atob(base64 || "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Komponen kecil untuk menampilkan satu pasang label dan nilai detail.
 *
 * Parameter (props): label - judul field; value - nilai (default "-" bila kosong).
 * Mengembalikan: elemen tampilan label + nilai.
 */
function DetailField({ label, value }) {
  return (
    <div>
      <strong>{label}</strong>
      <span>{value || "-"}</span>
    </div>
  );
}

/**
 * Komponen pratinjau satu berkas pendaftaran PPDB.
 *
 * Parameter (props): document - objek dokumen ({ label, value, required }).
 * Mengembalikan: kartu yang menampilkan pratinjau (gambar/iframe PDF/placeholder)
 * dan tautan buka berkas bila tersedia, atau pesan "belum diunggah" bila tidak.
 */
function DocumentPreview({ document }) {
  const fileType = getFileType(document.value);
  const available = fileType !== "missing";
  // URL siap-pakai untuk pratinjau & buka berkas. Untuk data URL base64 diubah
  // menjadi Object URL (blob:) yang seasal & aman; selain itu dipakai apa adanya.
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (!available) {
      setPreviewUrl("");
      return undefined;
    }
    const value = document.value;
    if (String(value).startsWith("data:")) {
      try {
        const objectUrl = URL.createObjectURL(dataUrlToBlob(value));
        setPreviewUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
      } catch {
        setPreviewUrl(value);
        return undefined;
      }
    }
    setPreviewUrl(value);
    return undefined;
  }, [document.value, available]);

  return (
    <article className={`ppdb-document-card ${available ? "available" : "missing"}`}>
      <div className="ppdb-document-card-head">
        <div>
          <h4>{document.label}</h4>
          <p>{document.required ? "Wajib diverifikasi" : "Opsional sesuai kondisi pendaftar"}</p>
        </div>
        <span>{available ? "Ada" : document.required ? "Belum ada" : "Opsional"}</span>
      </div>

      {available ? (
        <>
          <div className="ppdb-document-preview">
            {fileType === "image" && previewUrl && <img src={previewUrl} alt={`Preview ${document.label}`} />}
            {fileType === "pdf" && previewUrl && <iframe title={`Preview ${document.label}`} src={previewUrl} />}
            {fileType === "file" && <div className="ppdb-file-placeholder">Preview tidak tersedia</div>}
          </div>
          <a className="ppdb-file-open" href={previewUrl || undefined} target="_blank" rel="noreferrer">Buka berkas di tab baru</a>
        </>
      ) : (
        <p className="ppdb-document-missing">Berkas belum diunggah oleh pendaftar.</p>
      )}
    </article>
  );
}

/**
 * Modal untuk meminta perbaikan berkas (status "revisi_berkas").
 *
 * Admin memilih berkas mana yang bermasalah (checkbox) dan menulis catatan,
 * lalu menekan kirim. Tampil hanya bila prop `item` tidak null.
 *
 * Parameter (props):
 *  - item: data pendaftar (null = tidak dirender).
 *  - onClose: callback menutup modal.
 *  - onSubmit: callback(item, selectedKeys, note) saat dikirim.
 */
function RevisiBerkasModal({ item, onClose, onSubmit }) {
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [note, setNote] = useState("");

  if (!item) return null;

  const documents = getRequiredDocuments(item);

  const toggleKey = (key) => {
    setSelectedKeys((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key]
    );
  };

  const handleSend = () => {
    if (selectedKeys.length === 0) {
      alert("Pilih minimal satu berkas atau data yang perlu diperbaiki.");
      return;
    }
    if (!note.trim()) {
      alert("Catatan perbaikan wajib diisi agar pendaftar tahu yang harus diperbaiki.");
      return;
    }
    onSubmit(item, selectedKeys, note.trim());
  };

  return (
    <div className="ppdb-modal-backdrop" role="presentation" onClick={onClose}>
      <section className="ppdb-detail-modal ppdb-revisi-modal" role="dialog" aria-modal="true" aria-labelledby="ppdb-revisi-title" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="ppdb-modal-close" onClick={onClose} aria-label="Tutup">&times;</button>

        <div className="ppdb-modal-header">
          <div>
            <span className="ppdb-modal-eyebrow">Minta Perbaikan</span>
            <h2 id="ppdb-revisi-title">{item.nama_lengkap}</h2>
            <p>Pilih berkas dan/atau data yang perlu diperbaiki, lalu tulis catatan untuk pendaftar.</p>
          </div>
        </div>

        <p className="ppdb-revisi-group-title">Berkas</p>
        <div className="ppdb-revisi-doclist">
          {documents.map((document) => (
            <label key={document.key} className="ppdb-revisi-doc">
              <input
                type="checkbox"
                checked={selectedKeys.includes(document.key)}
                onChange={() => toggleKey(document.key)}
              />
              <span>{document.label}{document.value ? "" : " (belum diunggah)"}</span>
            </label>
          ))}
        </div>

        <p className="ppdb-revisi-group-title">Data Pendaftar</p>
        <div className="ppdb-revisi-doclist">
          {DATA_REVISION_FIELDS.map((field) => (
            <label key={field.key} className="ppdb-revisi-doc">
              <input
                type="checkbox"
                checked={selectedKeys.includes(field.key)}
                onChange={() => toggleKey(field.key)}
              />
              <span>{field.label}</span>
            </label>
          ))}
        </div>

        <div className="form-group full">
          <label htmlFor="ppdb-revisi-note">Catatan Perbaikan</label>
          <textarea
            id="ppdb-revisi-note"
            rows="3"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Contoh: Foto KK buram dan terpotong, mohon unggah ulang yang jelas."
          />
        </div>

        <div className="ppdb-modal-actions ppdb-verify-actions">
          <button className="verify-accept" onClick={handleSend}>Kirim Permintaan Perbaikan</button>
          <button className="verify-pending" onClick={onClose}>Batal</button>
        </div>
      </section>
    </div>
  );
}

/**
 * Modal detail satu pendaftar PPDB beserta tombol aksi verifikasi.
 *
 * Parameter (props):
 *  - item: data pendaftar (null = modal tidak dirender).
 *  - onClose: callback menutup modal.
 *  - onVerify: callback verifikasi (menerima item & status target).
 *  - onDaftarUlang: callback menandai daftar ulang (menerima item & status "sudah"/"belum").
 * Mengembalikan: tampilan detail biodata, data tambahan/ortu/wali (bila ada),
 * ringkasan kelengkapan berkas, daftar pratinjau dokumen, indikator/aksi daftar
 * ulang untuk pendaftar diterima, dan tombol Terima/Tolak/Set Pending.
 */
function PPDBDetailModal({ item, onClose, onVerify, onDaftarUlang, onRequestRevisi }) {
  if (!item) return null;

  const documents = getRequiredDocuments(item);
  const completedDocuments = documents.filter((document) => document.value || !document.required).length;

  // Field tambahan (form mitra) yang hanya ditampilkan bila ada nilainya.
  const formatNumberOrDash = (value) =>
    value === null || value === undefined || value === "" ? null : String(value);

  const extraSiswaFields = [
    { label: "NIK", value: item.nik },
    { label: "No. Kartu Keluarga", value: item.no_kk },
    { label: "Anak Ke-", value: formatNumberOrDash(item.anak_ke) },
    { label: "Jumlah Saudara Kandung", value: formatNumberOrDash(item.jumlah_saudara_kandung) },
    { label: "Jumlah Saudara Tiri", value: formatNumberOrDash(item.jumlah_saudara_tiri) },
    { label: "Jumlah Saudara Angkat", value: formatNumberOrDash(item.jumlah_saudara_angkat) }
  ].filter((field) => field.value);

  const ortuFields = [
    { label: "Tempat Lahir Ayah", value: item.tempat_lahir_ayah },
    { label: "Tanggal Lahir Ayah", value: item.tanggal_lahir_ayah ? formatTanggal(item.tanggal_lahir_ayah) : null },
    { label: "Pendidikan Ayah", value: item.pendidikan_ayah },
    { label: "Pekerjaan Ayah", value: item.pekerjaan_ayah },
    { label: "Penghasilan Ayah", value: item.penghasilan_ayah },
    { label: "Tempat Lahir Ibu", value: item.tempat_lahir_ibu },
    { label: "Tanggal Lahir Ibu", value: item.tanggal_lahir_ibu ? formatTanggal(item.tanggal_lahir_ibu) : null },
    { label: "Pendidikan Ibu", value: item.pendidikan_ibu },
    { label: "Pekerjaan Ibu", value: item.pekerjaan_ibu },
    { label: "Penghasilan Ibu", value: item.penghasilan_ibu }
  ].filter((field) => field.value);

  const waliFields = [
    { label: "Nama Wali", value: item.nama_wali },
    { label: "Jenis Kelamin Wali", value: item.jenis_kelamin_wali },
    { label: "Tempat Lahir Wali", value: item.tempat_lahir_wali },
    { label: "Tanggal Lahir Wali", value: item.tanggal_lahir_wali ? formatTanggal(item.tanggal_lahir_wali) : null },
    { label: "Pendidikan Wali", value: item.pendidikan_wali },
    { label: "Pekerjaan Wali", value: item.pekerjaan_wali },
    { label: "Alamat Wali", value: item.alamat_wali }
  ].filter((field) => field.value);

  return (
    <div className="ppdb-modal-backdrop" role="presentation" onClick={onClose}>
      <section className="ppdb-detail-modal" role="dialog" aria-modal="true" aria-labelledby="ppdb-detail-title" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="ppdb-modal-close" onClick={onClose} aria-label="Tutup detail PPDB">&times;</button>

        <div className="ppdb-modal-header">
          <div>
            <span className="ppdb-modal-eyebrow">Detail Pendaftar PPDB</span>
            <h2 id="ppdb-detail-title">{item.nama_lengkap}</h2>
            <p>{LEVEL_LABEL[item.target_jenjang] || "-"} - {TYPE_LABEL[item.jenis_pendaftaran] || "-"} - Daftar {formatTanggal(item.createdAt)}</p>
          </div>
          <span className={`status-badge ${item.status}`}>{STATUS_LABEL[item.status]}</span>
        </div>

        <div className="ppdb-modal-summary">
          <div>
            <strong>{completedDocuments}/{documents.length}</strong>
            <span>Kelengkapan berkas</span>
          </div>
          <div>
            <strong>{formatTanggal(item.tanggal_lahir)}</strong>
            <span>Tanggal lahir</span>
          </div>
          <div>
            <strong>{item.no_telepon || "-"}</strong>
            <span>WhatsApp wali</span>
          </div>
        </div>

        <div className="ppdb-verify-detail ppdb-modal-grid">
          <DetailField label="Jenis Kelamin" value={item.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"} />
          <DetailField label="Tahun Ajaran" value={item.tahun_ajaran} />
          <DetailField label="Alamat" value={item.alamat} />
          <DetailField label="Orang Tua/Wali" value={item.nama_orang_tua || item.nama_ayah || item.nama_ibu} />
          <DetailField label="No WhatsApp" value={item.no_telepon} />
          <DetailField label="Email" value={item.email} />
          {item.nomor_registrasi ? <DetailField label="Nomor Registrasi" value={item.nomor_registrasi} /> : null}
          <DetailField label="Catatan Notifikasi" value={item.notification_note || "Belum ada"} />
        </div>

        {item.status === "revisi_berkas" && (
          <div className="ppdb-revisi-banner">
            <strong>Menunggu perbaikan berkas dari pendaftar.</strong>
            {item.catatan_revisi ? <p>Catatan: {item.catatan_revisi}</p> : null}
          </div>
        )}

        {extraSiswaFields.length > 0 && (
          <div className="ppdb-document-section">
            <div className="ppdb-section-title">
              <h3>Data Tambahan Calon Siswa</h3>
            </div>
            <div className="ppdb-verify-detail ppdb-modal-grid">
              {extraSiswaFields.map((field) => <DetailField key={field.label} label={field.label} value={field.value} />)}
            </div>
          </div>
        )}

        {ortuFields.length > 0 && (
          <div className="ppdb-document-section">
            <div className="ppdb-section-title">
              <h3>Data Orang Tua</h3>
            </div>
            <div className="ppdb-verify-detail ppdb-modal-grid">
              {ortuFields.map((field) => <DetailField key={field.label} label={field.label} value={field.value} />)}
            </div>
          </div>
        )}

        {waliFields.length > 0 && (
          <div className="ppdb-document-section">
            <div className="ppdb-section-title">
              <h3>Data Wali</h3>
            </div>
            <div className="ppdb-verify-detail ppdb-modal-grid">
              {waliFields.map((field) => <DetailField key={field.label} label={field.label} value={field.value} />)}
            </div>
          </div>
        )}

        <div className="ppdb-document-section">
          <div className="ppdb-section-title">
            <h3>Berkas Pendaftaran</h3>
            <p>Cek isi file sebelum mengubah status verifikasi.</p>
          </div>
          <div className="ppdb-document-grid">
            {documents.map((document) => <DocumentPreview key={document.key} document={document} />)}
          </div>
        </div>

        {item.status === "diterima" && (
          <div className="ppdb-daftar-ulang-box">
            <span className={`status-badge ${item.status_daftar_ulang === "sudah" ? "diterima" : "pending"}`}>
              Daftar Ulang: {item.status_daftar_ulang === "sudah" ? "Sudah" : "Belum"}
            </span>
            {item.status_daftar_ulang === "sudah"
              ? <button type="button" className="verify-pending" onClick={() => onDaftarUlang(item, "belum")}>Batalkan Daftar Ulang</button>
              : <button type="button" className="verify-accept" onClick={() => onDaftarUlang(item, "sudah")}>Tandai Sudah Daftar Ulang</button>}
          </div>
        )}

        <div className="ppdb-modal-actions ppdb-verify-actions">
          <button className="verify-accept" disabled={item.status === "diterima"} onClick={() => onVerify(item, "diterima")}>Terima</button>
          <button className="verify-reject" disabled={item.status === "ditolak"} onClick={() => onVerify(item, "ditolak")}>Tolak</button>
          <button className="verify-pending" disabled={item.status === "pending"} onClick={() => onVerify(item, "pending")}>Menunggu Verifikasi</button>
          {item.status === "ditolak" && (
            <button className="verify-revisi" onClick={() => onRequestRevisi(item)}>Minta Perbaikan Berkas</button>
          )}
        </div>
      </section>
    </div>
  );
}

/**
 * Halaman Admin Verifikasi PPDB.
 *
 * Halaman ini dipakai admin untuk memverifikasi data pendaftar PPDB yang masuk
 * dari form pendaftaran publik. Admin dapat memfilter berdasarkan status,
 * melihat detail & berkas tiap pendaftar, lalu menerima/menolak/mengembalikan
 * ke pending, dan menandai daftar ulang untuk pendaftar yang diterima. Di atas
 * daftar ditampilkan kartu rekapitulasi PPDB. Pendaftar yang diterima otomatis
 * tercantum di Pengumuman PPDB pada Beranda.
 *
 * Peran/akses: hanya admin (area dashboard admin, butuh sesi login admin).
 */
function AdminPPDB() {
  const navigate = useNavigate();
  const [ppdb, setPPDB] = useState([]);
  const [rekap, setRekap] = useState(null);
  const [filter, setFilter] = useState("all");
  const [selectedPPDB, setSelectedPPDB] = useState(null);
  const [revisiTarget, setRevisiTarget] = useState(null);

  /**
   * Memuat daftar pendaftar PPDB dari server.
   * Efek: memanggil API getPPDB(); mengisi state ppdb bila sukses.
   */
  const loadPPDB = async () => {
    const result = await getPPDB();
    if (result.success) setPPDB(result.data || []);
  };

  /**
   * Memuat rekapitulasi PPDB dari server.
   * Efek: memanggil API getRekapPPDB(); mengisi state rekap bila sukses.
   */
  const loadRekap = async () => {
    const result = await getRekapPPDB();
    if (result.success) setRekap(result.data || null);
  };

  // Memuat data PPDB & rekap sekali saat komponen dipasang.
  useEffect(() => { (async () => { await Promise.all([loadPPDB(), loadRekap()]); })(); }, []);

  /**
   * Memverifikasi (mengubah status) seorang pendaftar PPDB.
   * Parameter:
   *  - item: objek pendaftar.
   *  - status: status target ("diterima", "ditolak", atau "pending").
   * Efek: menyusun catatan notifikasi sesuai status; memanggil API updatePPDB;
   * menampilkan alert; menutup modal detail dan memuat ulang data. Penolakan
   * dilakukan langsung tanpa meminta alasan; perbaikan berkas ditangani lewat
   * tombol "Minta Perbaikan" pada pendaftar yang sudah ditolak.
   */
  const handleVerify = async (item, status) => {
    let notification_note = "Menunggu verifikasi admin.";

    if (status === "diterima") {
      notification_note = "Diterima. Nama calon siswa otomatis masuk ke Pengumuman PPDB di Beranda. Calon siswa diminta datang ke sekolah untuk pendaftaran ulang.";
    }

    if (status === "ditolak") {
      notification_note = "Mohon maaf, pendaftaran belum dapat diterima. Admin dapat meminta perbaikan berkas bila diperlukan.";
    }

    const result = await updatePPDB(item.id, { status, notification_note });
    alert(status === "diterima"
      ? `${result.message}\n\nPengumuman PPDB otomatis diperbarui di Beranda. Semua nama siswa yang diterima akan tercantum dan diminta datang ke sekolah untuk pendaftaran ulang.`
      : result.message);
    setSelectedPPDB(null);
    // Pindahkan tampilan ke tab sesuai status baru agar data "berpindah" ke bagiannya.
    setFilter(status);
    loadPPDB();
    loadRekap();
  };

  /**
   * Membuka modal permintaan perbaikan berkas untuk seorang pendaftar.
   * Parameter: item - objek pendaftar.
   */
  const handleRequestRevisi = (item) => {
    setSelectedPPDB(null);
    setRevisiTarget(item);
  };

  /**
   * Mengirim permintaan perbaikan berkas: set status "revisi_berkas" beserta
   * daftar berkas yang harus diperbaiki dan catatan dari admin.
   * Parameter:
   *  - item: objek pendaftar.
   *  - selectedKeys: array key berkas yang diminta diperbaiki.
   *  - note: catatan perbaikan untuk pendaftar.
   * Efek: memanggil API updatePPDB; alert; menutup modal & memuat ulang data.
   */
  const handleSubmitRevisi = async (item, selectedKeys, note) => {
    const result = await updatePPDB(item.id, {
      status: "revisi_berkas",
      berkas_revisi: selectedKeys,
      catatan_revisi: note
    });
    alert(`${result.message}\n\nPendaftar dapat mengunggah ulang berkas melalui menu "Cek Status Pendaftaran" di halaman PPDB.`);
    setRevisiTarget(null);
    setFilter("revisi_berkas");
    loadPPDB();
    loadRekap();
  };

  /**
   * Menandai status daftar ulang pendaftar yang diterima.
   * Parameter:
   *  - item: objek pendaftar.
   *  - status: "sudah" atau "belum".
   * Efek: memanggil API setPPDBDaftarUlang; alert; menutup modal & memuat ulang data + rekap.
   */
  const handleDaftarUlang = async (item, status) => {
    const result = await setPPDBDaftarUlang(item.id, { status_daftar_ulang: status });
    if (result.message) alert(result.message);
    setSelectedPPDB(null);
    loadPPDB();
    loadRekap();
  };

  /**
   * Menghapus (soft delete) pendaftar PPDB yang berstatus ditolak.
   * Parameter: item - objek pendaftar.
   * Efek: konfirmasi; memanggil API deletePPDB; alert; menutup modal & memuat ulang.
   */
  const handleDelete = async (item) => {
    if (item.status !== "ditolak") return;
    if (!confirm(`Hapus data pendaftar "${item.nama_lengkap}"? Data ditolak akan diarsipkan (soft delete).`)) return;
    const result = await deletePPDB(item.id);
    alert(result.message);
    setSelectedPPDB(null);
    loadPPDB();
    loadRekap();
  };

  /**
   * Keluar dari sesi admin.
   * Efek: memanggil logout() lalu mengarahkan ke halaman login admin.
   */
  const handleLogout = () => { logout(); navigate("/admin-login"); };

  // Jumlah pendaftar per status untuk label tombol filter.
  const counts = {
    all: ppdb.filter((p) => p.status !== "diterima" && p.status !== "ditolak" && p.status !== "revisi_berkas").length,
    pending: ppdb.filter((p) => p.status === "pending").length,
    revisi_berkas: ppdb.filter((p) => p.status === "revisi_berkas").length,
    diterima: ppdb.filter((p) => p.status === "diterima").length,
    ditolak: ppdb.filter((p) => p.status === "ditolak").length
  };
  // Daftar pendaftar sesuai filter status aktif. Tab "Semua" hanya menampilkan
  // pendaftar yang masih menunggu (tanpa diterima/ditolak/perbaikan berkas);
  // pendaftar dalam perbaikan berkas tampil di tab "Perbaikan Berkas".
  const filtered = filter === "all"
    ? ppdb.filter((p) => p.status !== "diterima" && p.status !== "ditolak" && p.status !== "revisi_berkas")
    : ppdb.filter((p) => p.status === filter);

  return (
    <div className="dashboard-layout">
      <AdminSidebar active="/admin/ppdb" />

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Verifikasi PPDB</h1>
            <p>Data pendaftar masuk dari halaman form PPDB dan diverifikasi admin.</p>
          </div>
          <div className="dashboard-actions">
            <Link to="/form-ppdb" className="btn secondary">Lihat Form</Link>
            <button onClick={handleLogout} className="btn primary">Keluar</button>
          </div>
        </div>

        {rekap && (
          <section className="student-summary-grid" aria-label="Rekapitulasi PPDB">
            <div className="student-summary-card">
              <span>Total Pendaftar</span>
              <strong>{rekap.total}</strong>
            </div>
            <div className="student-summary-card">
              <span>Menunggu Verifikasi</span>
              <strong>{rekap.pending}</strong>
            </div>
            <div className="student-summary-card">
              <span>Diterima</span>
              <strong>{rekap.diterima}</strong>
            </div>
            <div className="student-summary-card">
              <span>Perbaikan Berkas</span>
              <strong>{rekap.revisi_berkas ?? 0}</strong>
            </div>
            <div className="student-summary-card">
              <span>Sudah Daftar Ulang</span>
              <strong>{rekap.daftar_ulang}</strong>
            </div>
            <div className="student-summary-card">
              <span>Jenjang TK</span>
              <strong>{rekap.per_jenjang?.tk ?? 0}</strong>
            </div>
            <div className="student-summary-card">
              <span>Jenjang SD</span>
              <strong>{rekap.per_jenjang?.sd ?? 0}</strong>
            </div>
            <div className="student-summary-card">
              <span>Jenjang SMP</span>
              <strong>{rekap.per_jenjang?.smp ?? 0}</strong>
            </div>
          </section>
        )}

        <div className="ppdb-filter">
          <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Semua ({counts.all})</button>
          <button className={filter === "pending" ? "active" : ""} onClick={() => setFilter("pending")}>Menunggu ({counts.pending})</button>
          <button className={filter === "revisi_berkas" ? "active" : ""} onClick={() => setFilter("revisi_berkas")}>Perbaikan Berkas ({counts.revisi_berkas})</button>
          <button className={filter === "diterima" ? "active" : ""} onClick={() => setFilter("diterima")}>Diterima ({counts.diterima})</button>
          <button className={filter === "ditolak" ? "active" : ""} onClick={() => setFilter("ditolak")}>Ditolak ({counts.ditolak})</button>
        </div>

        <div className="ppdb-verify-list">
          {filtered.length === 0 ? <p className="empty-text">Belum ada pendaftar pada kategori ini.</p> : filtered.map((item) => (
            <div className="ppdb-verify-item" key={item.id}>
              <div className="ppdb-verify-head">
                <div>
                  <h4>{item.nama_lengkap}</h4>
                  <p>{LEVEL_LABEL[item.target_jenjang] || "-"} - {TYPE_LABEL[item.jenis_pendaftaran] || "-"} - Daftar {formatTanggal(item.createdAt)}</p>
                </div>
                <div className="ppdb-verify-meta">
                  <span className={`status-badge ${item.status}`}>{STATUS_LABEL[item.status]}</span>
                  {item.status === "diterima" && (
                    <span className={`status-badge ${item.status_daftar_ulang === "sudah" ? "diterima" : "pending"}`}>
                      Daftar Ulang: {item.status_daftar_ulang === "sudah" ? "Sudah" : "Belum"}
                    </span>
                  )}
                  <button type="button" className="ppdb-detail-button" onClick={() => setSelectedPPDB(item)}>Detail & Berkas</button>
                </div>
              </div>

              <div className="ppdb-document-summary" aria-label="Ringkasan kelengkapan berkas">
                {getRequiredDocuments(item).map((document) => (
                  <span key={document.key} className={document.value ? "ready" : document.required ? "missing" : "optional"}>
                    {document.label}: {document.value ? "Ada" : document.required ? "Belum ada" : "Opsional"}
                  </span>
                ))}
              </div>

              <div className="ppdb-verify-actions">
                <button className="verify-accept" disabled={item.status === "diterima"} onClick={() => handleVerify(item, "diterima")}>Terima</button>
                <button className="verify-reject" disabled={item.status === "ditolak"} onClick={() => handleVerify(item, "ditolak")}>Tolak</button>
                <button className="verify-pending" disabled={item.status === "pending"} onClick={() => handleVerify(item, "pending")}>Menunggu Verifikasi</button>
                {item.status === "ditolak" && (
                  <button className="verify-revisi" onClick={() => handleRequestRevisi(item)}>Minta Perbaikan</button>
                )}
                {item.status === "diterima" && (
                  item.status_daftar_ulang === "sudah"
                    ? <button className="verify-pending" onClick={() => handleDaftarUlang(item, "belum")}>Batalkan Daftar Ulang</button>
                    : <button className="verify-accept" onClick={() => handleDaftarUlang(item, "sudah")}>Sudah Daftar Ulang</button>
                )}
                {filter === "ditolak" && item.status === "ditolak" && (
                  <button className="verify-delete" onClick={() => handleDelete(item)}>Hapus</button>
                )}
              </div>
            </div>
          ))}
        </div>

        <PPDBDetailModal item={selectedPPDB} onClose={() => setSelectedPPDB(null)} onVerify={handleVerify} onDaftarUlang={handleDaftarUlang} onRequestRevisi={handleRequestRevisi} />
        <RevisiBerkasModal item={revisiTarget} onClose={() => setRevisiTarget(null)} onSubmit={handleSubmitRevisi} />
      </main>
    </div>
  );
}

export default AdminPPDB;
