const express = require("express");
const router = express.Router();
const termController = require("../controllers/termController");

// 📥 Get all terms
router.get("/", termController.getAllTerms);

// ➕ Create new term
router.post("/", termController.createTerm);

// ✏️ Update term by ID
router.put("/:id", termController.updateTerm);

// ❌ Delete term by ID
router.delete("/:id", termController.deleteTerm);

module.exports = router;
