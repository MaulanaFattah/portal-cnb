const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const uploadRoot = path.resolve(__dirname, "../../uploads");
const allowedImageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedImageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const maxImageSize = 4 * 1024 * 1024;

const uploadFolders = {
  kegiatan: path.join(uploadRoot, "kegiatan"),
  siswa: path.join(uploadRoot, "siswa"),
  galeri: path.join(uploadRoot, "galeri"),
  fasilitas: path.join(uploadRoot, "fasilitas"),
  kepala_sekolah: path.join(uploadRoot, "kepala-sekolah")
};

function ensureUploadFolders() {
  fs.mkdirSync(uploadRoot, { recursive: true });
  Object.values(uploadFolders).forEach((folder) => fs.mkdirSync(folder, { recursive: true }));
}

function sanitizeFilename(filename) {
  const extension = path.extname(filename || "").toLowerCase();
  const base = path.basename(filename || "gambar", extension)
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "gambar";

  return `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${base}${extension}`;
}

function toRelativeUploadPath(file) {
  if (!file) return null;
  const publicFolder = path.basename(uploadFolders[file.destinationKey] || file.destinationKey);
  return `/uploads/${publicFolder}/${file.filename}`;
}

function isLocalUploadPath(value) {
  return typeof value === "string" && value.startsWith("/uploads/") && !value.includes("..");
}

function deleteLocalUpload(value) {
  if (!isLocalUploadPath(value)) return;

  const absolutePath = path.resolve(uploadRoot, value.replace(/^\/uploads\//, ""));
  const insideUploadRoot = absolutePath === uploadRoot || absolutePath.startsWith(`${uploadRoot}${path.sep}`);
  if (!insideUploadRoot) return;
  if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
}

ensureUploadFolders();

module.exports = {
  allowedImageExtensions,
  allowedImageMimeTypes,
  deleteLocalUpload,
  ensureUploadFolders,
  isLocalUploadPath,
  maxImageSize,
  sanitizeFilename,
  toRelativeUploadPath,
  uploadFolders,
  uploadRoot
};
