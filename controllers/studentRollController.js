const { Student, Class, Section, Incharge, sequelize } = require("../models");
const { Op } = require("sequelize");

// ✅ GET enabled & visible/hidden students for all class-sections assigned to incharge
exports.getStudentsForRollNumber = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const showHidden = req.query.showHidden === "true"; // 🔁 NEW

    // 🔍 Get all class-section pairs assigned to this incharge
    const inchargeSections = await Incharge.findAll({
      where: { teacherId },
      attributes: ["classId", "sectionId"],
    });

    if (inchargeSections.length === 0) {
      return res.status(403).json({ error: "Unauthorized: Not incharge for any section" });
    }

    // Build OR filters for class-section match
    const filters = inchargeSections.map((i) => ({
      class_id: i.classId,
      section_id: i.sectionId,
    }));

    const students = await Student.findAll({
      where: {
        [Op.or]: filters,
        status: "enabled",
        visible: showHidden ? false : true, // 🔁 MAIN CHANGE
      },
      include: [
        { model: Class, as: "Class", attributes: ["id", "class_name"] },
        { model: Section, as: "Section", attributes: ["id", "section_name"] },
      ],
      order: [["class_id", "ASC"], ["section_id", "ASC"], ["roll_number", "ASC"]],
    });

    res.json({ message: "Students fetched successfully", students });
  } catch (error) {
    console.error("🔥 Error in getStudentsForRollNumber:", error);
    res.status(500).json({ error: "Failed to fetch students" });
  }
};

// ✅ POST bulk update of roll numbers
exports.updateRollNumbers = async (req, res) => {
  const { updates } = req.body;
  const teacherId = req.user.id;

  if (!Array.isArray(updates)) {
    return res.status(400).json({ error: "Invalid updates format" });
  }

  const transaction = await sequelize.transaction();
  try {
    for (const { id, roll_number } of updates) {
      if (!id || roll_number === undefined) continue;

      const student = await Student.findByPk(id);
      if (!student) continue;

      // 🔒 Check if teacher is incharge for this student's class-section
      const isIncharge = await Incharge.findOne({
        where: {
          classId: student.class_id,
          sectionId: student.section_id,
          teacherId,
        },
      });

      if (!isIncharge) {
        await transaction.rollback();
        return res.status(403).json({
          error: `Unauthorized to update student ${id} - not incharge for class-section`,
        });
      }

      await Student.update({ roll_number }, { where: { id }, transaction });
    }

    await transaction.commit();
    res.json({ message: "Roll numbers updated successfully" });
  } catch (error) {
    await transaction.rollback();
    console.error("🔥 Error in updateRollNumbers:", error);
    res.status(500).json({ error: "Failed to update roll numbers" });
  }
};

// ✅ PUT toggle student visibility
exports.toggleVisibility = async (req, res) => {
  const { student_id } = req.params;
  const teacherId = req.user.id;

  try {
    const student = await Student.findByPk(student_id);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // 🔒 Check if teacher is incharge for this student's class-section
    const isIncharge = await Incharge.findOne({
      where: {
        classId: student.class_id,
        sectionId: student.section_id,
        teacherId,
      },
    });

    if (!isIncharge) {
      return res.status(403).json({ error: "Unauthorized to toggle visibility of this student" });
    }

    const updatedStudent = await student.update({ visible: !student.visible });
    res.json({ message: `Student visibility set to ${updatedStudent.visible}`, student: updatedStudent });
  } catch (error) {
    console.error("🔥 Error in toggleVisibility:", error);
    res.status(500).json({ error: "Failed to toggle student visibility" });
  }
};
