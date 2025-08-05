const express = require("express");
const router = express.Router();
const controller = require("../controllers/examScheduleController");

// ✅ Export and Import first
router.get("/export", controller.exportScheduleToExcel);
router.post("/import", controller.importScheduleFromExcel);

// 🧾 Standard CRUD routes
router.get("/", controller.getAllSchedules);
router.post("/", controller.createSchedule);
router.put("/:id", controller.updateSchedule);
router.delete("/:id", controller.deleteSchedule);


module.exports = router;
