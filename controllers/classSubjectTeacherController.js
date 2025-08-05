const { ClassSubjectTeacher, Class, Section, Subject, User } = require("../models");
const { Op } = require("sequelize");
console.log("Models Loaded: ", { ClassSubjectTeacher, Class, Section, Subject, User });

/**
 * Create new mapping (Assign Subject to Teacher for a Class & Section)
 */
exports.createClassSubjectTeacher = async (req, res) => {
  try {
    // Extract data and confirmDuplicate flag from client
    const { class_id, section_id, subject_id, teacher_id, confirmDuplicate } = req.body;

    // Validate if the teacher exists and has the role "teacher"
    // const teacher = await User.findOne({ where: { id: teacher_id, role: "teacher" } });
    const teacher = await User.findOne({
        where: { id: teacher_id },
        include: {
          association: "roles",
          where: { slug: "teacher" }, // You can also use Op.iLike if needed
        },
      });

    if (!teacher) {
      return res.status(400).json({ message: "Invalid teacher ID or user is not a teacher" });
    }

    // Check for duplicate assignment based on class, section, and subject (ignoring teacher)
    const duplicate = await ClassSubjectTeacher.findOne({
      where: { class_id, section_id, subject_id },
    });
    if (duplicate && !confirmDuplicate) {
      return res.status(409).json({
        message: "An assignment with the same class, section, and subject already exists. Do you want to proceed?",
        duplicate: true,
      });
    }

    const newEntry = await ClassSubjectTeacher.create({
      class_id,
      section_id,
      subject_id,
      teacher_id,
    });

    return res.status(201).json({ message: "Teacher assigned to subject", data: newEntry });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Get all mappings with associated Class, Section, Subject, and Teacher data
 */
exports.getAllClassSubjectTeachers = async (req, res) => {
  try {
    const assignments = await ClassSubjectTeacher.findAll({
      include: [
        { model: Class, as: "Class", attributes: ["id", "class_name"] },
        { model: Section, as: "Section", attributes: ["id", "section_name"] },
        { model: Subject, as: "Subject", attributes: ["id", "name"] },
        { model: User, as: "Teacher", attributes: ["id", "name", "email", "role"] },
      ],
    });
    return res.status(200).json(assignments);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Get a single assignment by ID
 */
exports.getClassSubjectTeacherById = async (req, res) => {
  try {
    const { id } = req.params;
    const assignment = await ClassSubjectTeacher.findByPk(id, {
      include: [
        { model: Class, as: "Class", attributes: ["id", "class_name"] },
        { model: Section, as: "Section", attributes: ["id", "section_name"] },
        { model: Subject, as: "Subject", attributes: ["id", "name"] },
        { model: User, as: "Teacher", attributes: ["id", "name", "email", "role"] },
      ],
    });
    if (!assignment) return res.status(404).json({ message: "Not found" });
    return res.status(200).json(assignment);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Update an assignment
 */
exports.updateClassSubjectTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    // Extract fields from client including confirmDuplicate flag
    const { class_id, section_id, subject_id, teacher_id, confirmDuplicate } = req.body;

    // Ensure the teacher exists and has the correct role
    // const teacher = await User.findOne({ where: { id: teacher_id, role: "teacher" } });
    const teacher = await User.findOne({
      where: { id: teacher_id },
      include: {
        association: "roles",
        where: { slug: "teacher" }, // You can also use Op.iLike if needed
      },
    });

    if (!teacher) {
      return res.status(400).json({ message: "Invalid teacher ID or user is not a teacher" });
    }

    const assignment = await ClassSubjectTeacher.findByPk(id);
    if (!assignment) return res.status(404).json({ message: "Not found" });

    // Check for duplicate assignment (excluding current record)
    const duplicate = await ClassSubjectTeacher.findOne({
      where: {
        class_id,
        section_id,
        subject_id,
        id: { [Op.ne]: id },
      },
    });
    if (duplicate && !confirmDuplicate) {
      return res.status(409).json({
        message: "An assignment with the same class, section, and subject already exists. Do you want to proceed?",
        duplicate: true,
      });
    }

    await assignment.update({ class_id, section_id, subject_id, teacher_id });
    return res.status(200).json({ message: "Updated successfully", data: assignment });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Delete an assignment
 */
exports.deleteClassSubjectTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const assignment = await ClassSubjectTeacher.findByPk(id);
    if (!assignment) return res.status(404).json({ message: "Not found" });
    await assignment.destroy();
    return res.status(200).json({ message: "Deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Get subjects and classes assigned to the logged in teacher (deduplicated)
 */
exports.getSubjectsForTeacher = async (req, res) => {
  try {
    // Ensure req.user is populated (authentication middleware should run)
    const teacherId = req.user.id;

    // Find all mappings for the logged in teacher, including associated Subject and Class data
    const mappings = await ClassSubjectTeacher.findAll({
      where: { teacher_id: teacherId },
      include: [
        {
          model: Subject,
          as: "Subject",
          attributes: ["id", "name"]
        },
        {
          model: Class,
          as: "Class",
          attributes: ["id", "class_name"]
        }
      ]
    });

    // Deduplicate the mappings by grouping by a combination of Subject and Class IDs
    const dedupedMap = {};
    mappings.forEach(mapping => {
      if (mapping.Subject && mapping.Class) {
        const key = `${mapping.Subject.id}-${mapping.Class.id}`;
        dedupedMap[key] = {
          subject: mapping.Subject,
          class: mapping.Class
        };
      }
    });
    const assignments = Object.values(dedupedMap);

    return res.status(200).json({ assignments });
  } catch (error) {
    console.error("Error fetching teacher subjects and classes:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};
