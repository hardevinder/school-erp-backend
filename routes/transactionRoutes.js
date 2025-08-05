const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/transactionController");
const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware");

// ------- Helpers -------
const authAdmin = [authenticateUser, authorizeRole(["admin", "superadmin"])];
const authSuper = [authenticateUser, authorizeRole(["superadmin"])];

// ------- Create / Bulk -------
router.post("/", ...authAdmin, ctrl.createTransaction);
router.post("/bulk", ...authAdmin, ctrl.createBulkTransactions);

// ------- Lists / Reports (specific paths BEFORE "/:id") -------

// Today’s non-cancelled
router.get("/", ...authAdmin, ctrl.getAllTransactions);

// Cancelled (paged + filters)
router.get("/cancelled", ...authAdmin, ctrl.getCancelledTransactions); // ✅ fixed

// (Optional legacy all-cancelled endpoint – drop if you don’t need)
router.get("/cancelled/all", ...authAdmin, ctrl.getCancelledTransactions);

// Search / filters
router.get("/class/:classId", ...authAdmin, ctrl.searchByClass);
router.get("/admission/:admissionNumber", ...authAdmin, ctrl.searchByAdmissionNumber);
router.get("/searchByClassAndSection", ...authAdmin, ctrl.searchByClassAndSection);

// Fee summaries
router.get("/totals/fee-head/:studentId", ...authAdmin, ctrl.getTotalReceivedByFeeHead);
router.get("/summary/day-summary", ...authAdmin, ctrl.getDaySummary); // shorter, cleaner path
router.get("/vanfee/:studentId", ...authAdmin, ctrl.getVanFeeByStudentId);
router.get("/last-route/:studentId", ...authAdmin, ctrl.getLastRouteByStudentId);
router.get("/slip/:slipId", ...authAdmin, ctrl.getTransactionsBySlipId);

// ------- Single transaction ops -------

// View single
router.get("/:id", ...authAdmin, ctrl.getTransactionById);

// Update
router.put("/:id", ...authAdmin, ctrl.updateTransaction);

// Cancel
router.post("/:id/cancel", ...authAdmin, ctrl.cancelTransaction);

// Restore
router.patch("/:id/restore", ...authAdmin, ctrl.restoreTransaction);

// Permanent delete (superadmin only)
router.delete("/:id", ...authSuper, ctrl.deleteTransaction);

module.exports = router;
