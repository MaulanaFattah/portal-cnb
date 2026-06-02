const express = require("express");
const router = express.Router();

const ppdbController = require("../controllers/ppdbController");
const { verifyToken, onlyAdmin } = require("../middlewares/authMiddleware");

router.get("/", verifyToken, onlyAdmin, ppdbController.getAllPPDB);
router.post("/", ppdbController.createPPDB);
router.put("/:id", verifyToken, onlyAdmin, ppdbController.updatePPDB);
router.delete("/:id", verifyToken, onlyAdmin, ppdbController.deletePPDB);

module.exports = router;
