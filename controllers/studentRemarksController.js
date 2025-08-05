const {
  Student,
  StudentRemark,
  Incharge,
  sequelize
} = require("../models");

const { Op } = require("sequelize");

// ✅ GET: Students + Existing Remarks
exports.getRemarks = async (req, res) => {
  try {
    const { class_id, section_id, term_id } = req.query;
    const userId = req.user?.id;
    const userRoles = (req.user?.roles || []).map(r => r.slug);

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // ✅ Incharge access check (unless admin/superadmin)
    if (!userRoles.includes("admin") && !userRoles.includes("superadmin")) {
      const isAssigned = await Incharge.findOne({
        where: { teacherId: userId, classId: class_id, sectionId: section_id },
      });

      if (!isAssigned) {
        return res.status(403).json({ message: "Not authorized for this class-section." });
      }
    }

    // ✅ Fetch students
    const students = await Student.findAll({
      where: {
        class_id,
        section_id,
        status: "enabled",
        visible: true,
        roll_number: { [Op.ne]: null },
      },
      order: [["roll_number", "ASC"]],
    });

    // ✅ Fetch existing remarks
    const existingRemarks = await StudentRemark.findAll({
      where: { class_id, section_id, term_id },
    });

    res.json({ students, existingRemarks });
  } catch (err) {
    console.error("🔥 Error in getRemarks:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ POST: Save or Update Remarks
exports.saveRemarks = async (req, res) => {
  const { remarks } = req.body;
  const t = await sequelize.transaction();

  try {
    for (const r of remarks) {
      const { student_id, class_id, section_id, term_id, remark } = r;

      if (!student_id || !class_id || !section_id || !term_id) continue;

      await StudentRemark.upsert(
        { student_id, class_id, section_id, term_id, remark },
        { transaction: t }
      );
    }

    await t.commit();
    res.json({ message: "Remarks saved successfully" });
  } catch (err) {
    await t.rollback();
    console.error("🔥 Error in saveRemarks:", err);
    res.status(500).json({ message: "Failed to save remarks" });
  }
};
