const fs = require("fs");
const path = require("path");

const uploadRoot = path.resolve(__dirname, "../../uploads");
const allowedImageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedImageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const maxImageSize = 4 * 1024 * 1024;

const uploadFolders = {
  activities: path.join(uploadRoot, "activities"),
  students: path.join(uploadRoot, "students"),
  gallery: path.join(uploadRoot, "gallery"),
  principal: path.join(uploadRoot, "principal")
};

function ensureUploadFolders() {
  fs.mkdirSync(uploadRoot, { recursive: true });
  Object.values(uploadFolders).forEach((folder) => fs.mkdirSync(folder, { recursive: true }));
}

function sanitizeFilename(filename) {
  const extension = path.extname(filename || "").toLowerCase();
  const base = path.basename(filename || "image", extension)
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "image";

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${base}${extension}`;
}

function toRelativeUploadPath(file) {
  if (!file) return null;
  return `/uploads/${file.destinationKey}/${file.filename}`;
}

function isLocalUploadPath(value) {
  return typeof value === "string" && value.startsWith("/uploads/") && !value.includes("..");
}

function deleteLocalUpload(value) {
  if (!isLocalUploadPath(value)) return;

  const absolutePath = path.resolve(uploadRoot, value.replace(/^\/uploads\//, ""));
  if (!absolutePath.startsWith(uploadRoot)) return;
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
