const express = require("express");
const router = express.Router();
const controller = require("../controllers/combinedExamSchemeController");

router.get("/", controller.getCombinedSchemes);
router.post("/", controller.createCombinedScheme);
router.put("/:id", controller.updateCombinedScheme);
router.delete("/:id", controller.deleteCombinedScheme);

module.exports = router;
