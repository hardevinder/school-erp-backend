const { ClassSubjectTeacher, Student, Class, User} = require('../models');
const { Op } = require('sequelize');

const getStudentsForTeacherClasses = async (req, res) => {
  try {
    // Get logged in teacher's id (assumes authentication middleware populates req.user)
    const teacherId = req.user.id;

    // Find all class and section assignments for this teacher
    const assignments = await ClassSubjectTeacher.findAll({
      where: { teacher_id: teacherId },
      attributes: ['class_id', 'section_id'],
      raw: true,
    });

    if (!assignments.length) {
      return res.status(404).json({ error: "No classes found for this teacher." });
    }

    // Build an array of conditions for each (class_id, section_id) pair
    const conditions = assignments.map(a => ({
      class_id: a.class_id,
      section_id: a.section_id,
    }));

    // Fetch students that belong to any of these class/section pairs,
    // including the associated Class (with class_name) and the User (with actual id)
    const students = await Student.findAll({
      where: {
        [Op.or]: conditions,
      },
      include: [
        {
          model: Class,
          as: "Class",
          attributes: ["class_name"],
        },
        {
          model: User,
          as: "User", // alias defined in the association
          attributes: ["id"], // fetching the actual user id
        },
      ],
    });

    return res.status(200).json({ students });
  } catch (error) {
    console.error("Error fetching students for teacher:", error.stack);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getStudentsForTeacherClasses,
};
