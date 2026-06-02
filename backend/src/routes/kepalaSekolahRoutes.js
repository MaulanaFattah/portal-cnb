const express = require("express");
const router = express.Router();

const kepalaSekolahController = require("../controllers/kepalaSekolahController");
const { verifyToken, onlyAdmin } = require("../middlewares/authMiddleware");

router.get("/", kepalaSekolahController.getAllKepalaSekolah);
router.post("/", verifyToken, onlyAdmin, kepalaSekolahController.createKepalaSekolah);
router.put("/:id", verifyToken, onlyAdmin, kepalaSekolahController.updateKepalaSekolah);
router.delete("/:id", verifyToken, onlyAdmin, kepalaSekolahController.deleteKepalaSekolah);

module.exports = router;
