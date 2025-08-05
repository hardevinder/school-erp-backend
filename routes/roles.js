const router = require("express").Router();
const ctrl = require("../controllers/roleController");

router.get("/", ctrl.getRoles);
router.post("/", ctrl.createRole);
router.put("/:id", ctrl.updateRole);
router.delete("/:id", ctrl.deleteRole);

module.exports = router;
