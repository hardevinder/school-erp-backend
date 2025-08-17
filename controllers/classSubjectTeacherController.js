// controllers/classSubjectTeacherController.js
const { Op } = require("sequelize");
const {
  ClassSubjectTeacher,
  Class,
  Section,
  Subject,
  User,
  Role,
  Employee,
  Department,
} = require("../models");

// --- Helpers -----------------------------

/**
 * Resolve an incoming teacher identifier (could be User.id or Employee.id)
 * to a valid User with the "teacher" role.
 * @param {number|string} teacher_id_from_client
 * @returns {Promise<{ user: User, employee: Employee|null }>}
 */
async function resolveTeacherUser(teacher_id_from_client) {
  const incomingId = Number(teacher_id_from_client);
  if (!Number.isFinite(incomingId)) {
    throw new Error("Invalid teacher ID");
  }

  // Try as User.id with teacher role
  const user = await User.findOne({
    where: { id: incomingId },
    include: [
      { model: Role, as: "roles", where: { slug: "teacher" }, required: true, through: { attributes: [] } },
      // Must match your model alias: User.hasOne(Employee, { as: 'employee' })
      { model: Employee, as: "employee", include: [{ model: Department, as: "department" }] },
    ],
  });
  if (user) return { user, employee: user.employee || null };

  // Try as Employee.id -> then get its User who has teacher role
  const employee = await Employee.findOne({
    where: { id: incomingId },
    include: [
      { model: Department, as: "department" },
      // Must match your model alias: Employee.belongsTo(User, { as: 'user' })
      { model: User, as: "user", include: [{ model: Role, as: "roles", where: { slug: "teacher" }, required: true, through: { attributes: [] } }] },
    ],
  });
  if (employee?.user) return { user: employee.user, employee };

  throw new Error("Invalid teacher ID or user is not a teacher");
}

// --- Create ------------------------------

/**
 * Create new mapping (Assign Subject to Teacher for a Class & Section)
 * Accepts teacher_id as either User.id or Employee.id (resolved to User.id for storage).
 */
exports.createClassSubjectTeacher = async (req, res) => {
  try {
    const { class_id, section_id, subject_id, teacher_id, confirmDuplicate } = req.body;

    // Resolve & validate teacher
    const { user: teacherUser } = await resolveTeacherUser(teacher_id);

    // Duplicate check (class+section+subject), regardless of teacher
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
      teacher_id: teacherUser.id, // store User.id
    });

    return res.status(201).json({ message: "Teacher assigned to subject", data: newEntry });
  } catch (error) {
    console.error("createClassSubjectTeacher:", error);
    return res.status(400).json({ message: error.message || "Server error" });
  }
};

// --- Read (All) --------------------------

/**
 * Get all mappings with associated Class, Section, Subject, and Teacher (User + Employee) data
 */
exports.getAllClassSubjectTeachers = async (req, res) => {
  try {
    const assignments = await ClassSubjectTeacher.findAll({
      include: [
        { model: Class, as: "Class", attributes: ["id", "class_name"] },
        { model: Section, as: "Section", attributes: ["id", "section_name"] },
        { model: Subject, as: "Subject", attributes: ["id", "name"] },
        {
          model: User,
          as: "Teacher", // alias from ClassSubjectTeacher model
          attributes: ["id", "name", "email", "status"],
          include: [
            { model: Role, as: "roles", attributes: ["id", "slug"], through: { attributes: [] } },
            {
              model: Employee,
              as: "employee", // lowercase alias — must match your model
              attributes: ["id", "name", "department_id"], // removed employee_code to avoid unknown column error
              include: [{ model: Department, as: "department", attributes: ["id", "name"] }],
            },
          ],
        },
      ],
      order: [
        [{ model: Class, as: "Class" }, "class_name", "ASC"],
        [{ model: Section, as: "Section" }, "section_name", "ASC"],
        [{ model: Subject, as: "Subject" }, "name", "ASC"],
      ],
    });
    return res.status(200).json(assignments);
  } catch (error) {
    console.error("getAllClassSubjectTeachers:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// --- Read (One) --------------------------

exports.getClassSubjectTeacherById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

    const assignment = await ClassSubjectTeacher.findByPk(id, {
      include: [
        { model: Class, as: "Class", attributes: ["id", "class_name"] },
        { model: Section, as: "Section", attributes: ["id", "section_name"] },
        { model: Subject, as: "Subject", attributes: ["id", "name"] },
        {
          model: User,
          as: "Teacher",
          attributes: ["id", "name", "email", "status"],
          include: [
            { model: Role, as: "roles", attributes: ["id", "slug"], through: { attributes: [] } },
            {
              model: Employee,
              as: "employee",
              attributes: ["id", "name", "department_id"], // removed employee_code
              include: [{ model: Department, as: "department", attributes: ["id", "name"] }],
            },
          ],
        },
      ],
    });
    if (!assignment) return res.status(404).json({ message: "Not found" });
    return res.status(200).json(assignment);
  } catch (error) {
    console.error("getClassSubjectTeacherById:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// --- Update ------------------------------

/**
 * Update an assignment
 * Accepts teacher_id as either User.id or Employee.id (resolved to User.id for storage).
 */
exports.updateClassSubjectTeacher = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

    const { class_id, section_id, subject_id, teacher_id, confirmDuplicate } = req.body;

    const assignment = await ClassSubjectTeacher.findByPk(id);
    if (!assignment) return res.status(404).json({ message: "Not found" });

    const { user: teacherUser } = await resolveTeacherUser(teacher_id);

    // Duplicate check (excluding current)
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

    await assignment.update({
      class_id,
      section_id,
      subject_id,
      teacher_id: teacherUser.id, // keep storing User.id
    });

    return res.status(200).json({ message: "Updated successfully", data: assignment });
  } catch (error) {
    console.error("updateClassSubjectTeacher:", error);
    return res.status(400).json({ message: error.message || "Server error" });
  }
};

// --- Delete ------------------------------

exports.deleteClassSubjectTeacher = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

    const assignment = await ClassSubjectTeacher.findByPk(id);
    if (!assignment) return res.status(404).json({ message: "Not found" });

    await assignment.destroy();
    return res.status(200).json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("deleteClassSubjectTeacher:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// --- Self (Subjects for logged-in teacher) --

/**
 * Get subjects and classes assigned to the logged-in teacher (deduplicated)
 * Uses req.user.id (User id) from auth middleware
 */
exports.getSubjectsForTeacher = async (req, res) => {
  try {
    const teacherUserId = Number(req.user?.id);
    if (!Number.isFinite(teacherUserId)) return res.status(400).json({ message: "Invalid user id" });

    const mappings = await ClassSubjectTeacher.findAll({
      where: { teacher_id: teacherUserId },
      include: [
        { model: Subject, as: "Subject", attributes: ["id", "name"] },
        { model: Class, as: "Class", attributes: ["id", "class_name"] },
      ],
    });

    // Deduplicate by Subject+Class
    const deduped = {};
    for (const m of mappings) {
      if (m.Subject && m.Class) {
        deduped[`${m.Subject.id}-${m.Class.id}`] = {
          subject: m.Subject,
          class: m.Class,
        };
      }
    }

    return res.status(200).json({ assignments: Object.values(deduped) });
  } catch (error) {
    console.error("getSubjectsForTeacher:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};
