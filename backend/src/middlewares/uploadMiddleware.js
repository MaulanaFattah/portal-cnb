const path = require("path");
const multer = require("multer");
const {
  allowedImageExtensions,
  allowedImageMimeTypes,
  maxImageSize,
  sanitizeFilename,
  uploadFolders
} = require("../utils/uploadStorage");

function imageUpload(destinationKey) {
  const destination = uploadFolders[destinationKey];
  if (!destination) throw new Error("Folder upload tidak valid");

  const storage = multer.diskStorage({
    destination(_req, file, cb) {
      file.destinationKey = destinationKey;
      cb(null, destination);
    },
    filename(_req, file, cb) {
      cb(null, sanitizeFilename(file.originalname));
    }
  });

  return multer({
    storage,
    limits: { fileSize: maxImageSize },
    fileFilter(_req, file, cb) {
      const extension = path.extname(file.originalname || "").toLowerCase();
      if (!allowedImageMimeTypes.has(file.mimetype) || !allowedImageExtensions.has(extension)) {
        return cb(new Error("Berkas harus berupa gambar JPG, PNG, atau WebP maksimal 4 MB"));
      }

      return cb(null, true);
    }
  });
}

function handleUploadError(error, _req, res, next) {
  if (!error) return next();

  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ success: false, message: "Ukuran gambar maksimal 4 MB" });
  }

  return res.status(400).json({ success: false, message: error.message || "Unggah berkas tidak valid" });
}

module.exports = { handleUploadError, imageUpload };
