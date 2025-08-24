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

/* ------------------------------------------------------------------ */
/* Alias helpers: auto-detect association aliases at runtime           */
/* ------------------------------------------------------------------ */

function pickAlias(associations, candidates = []) {
  for (const c of candidates) {
    if (associations[c]) return c;
  }
  // Fallback: return the first association key if present
  const keys = Object.keys(associations || {});
  return keys.length ? keys[0] : null;
}

// Detect alias for User.hasOne(Employee, { as: 'employee' | 'Employee' | 'employeeProfile' | ... })
const USER_EMPLOYEE_ALIAS =
  pickAlias(User.associations, ["employee", "Employee", "employeeProfile"]);

// Detect alias for Employee.belongsTo(User, { as: 'user' | 'userAccount' | ... })
const EMPLOYEE_USER_ALIAS =
  pickAlias(Employee.associations, ["user", "userAccount", "User"]);

// Detect alias for Employee.belongsTo(Department, { as: 'department' | 'Department' })
const EMPLOYEE_DEPT_ALIAS =
  pickAlias(Employee.associations, ["department", "Department"]);

// Detect alias for User.belongsToMany(Role, { as: 'roles' | 'Roles' })
const USER_ROLES_ALIAS =
  pickAlias(User.associations, ["roles", "Roles"]);

/* ------------------------------------------------------------------ */
/**
 * Resolve an incoming teacher identifier (could be User.id or Employee.id)
 * to a valid User with the "teacher" role.
 * Returns: { user: User, employee: Employee|null }
 */
async function resolveTeacherUser(teacher_id_from_client) {
  const incomingId = Number(teacher_id_from_client);
  if (!Number.isFinite(incomingId)) {
    throw new Error("Invalid teacher ID");
  }

  // 1) Try as User.id with teacher role
  const userAsUserId = await User.findOne({
    where: { id: incomingId },
    include: [
      USER_ROLES_ALIAS && {
        model: Role,
        as: USER_ROLES_ALIAS,
        where: { slug: "teacher" },
        required: true,
        through: { attributes: [] },
        attributes: ["id", "slug"],
      },
      USER_EMPLOYEE_ALIAS && {
        model: Employee,
        as: USER_EMPLOYEE_ALIAS,
        include: [
          EMPLOYEE_DEPT_ALIAS && {
            model: Department,
            as: EMPLOYEE_DEPT_ALIAS,
            attributes: ["id", "name"],
          },
        ].filter(Boolean),
        attributes: ["id", "name", "department_id"],
      },
    ].filter(Boolean),
  });

  if (userAsUserId) {
    const employee =
      USER_EMPLOYEE_ALIAS ? userAsUserId[USER_EMPLOYEE_ALIAS] || null : null;
    return { user: userAsUserId, employee };
  }

  // 2) Try as Employee.id → then get its User who has teacher role
  const employeeAsEmpId = await Employee.findOne({
    where: { id: incomingId },
    include: [
      EMPLOYEE_DEPT_ALIAS && {
        model: Department,
        as: EMPLOYEE_DEPT_ALIAS,
        attributes: ["id", "name"],
      },
      EMPLOYEE_USER_ALIAS && {
        model: User,
        as: EMPLOYEE_USER_ALIAS,
        include: [
          USER_ROLES_ALIAS && {
            model: Role,
            as: USER_ROLES_ALIAS,
            where: { slug: "teacher" },
            required: true,
            through: { attributes: [] },
            attributes: ["id", "slug"],
          },
          USER_EMPLOYEE_ALIAS && {
            model: Employee,
            as: USER_EMPLOYEE_ALIAS,
            attributes: ["id", "name", "department_id"],
            include: [
              EMPLOYEE_DEPT_ALIAS && {
                model: Department,
                as: EMPLOYEE_DEPT_ALIAS,
                attributes: ["id", "name"],
              },
            ].filter(Boolean),
          },
        ].filter(Boolean),
      },
    ].filter(Boolean),
  });

  if (employeeAsEmpId && EMPLOYEE_USER_ALIAS && employeeAsEmpId[EMPLOYEE_USER_ALIAS]) {
    return { user: employeeAsEmpId[EMPLOYEE_USER_ALIAS], employee: employeeAsEmpId };
  }

  throw new Error("Invalid teacher ID or user is not a teacher");
}

/* ------------------------------------------------------------------ */
/* Create                                                               */
/* ------------------------------------------------------------------ */

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
        message:
          "An assignment with the same class, section, and subject already exists. Do you want to proceed?",
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

/* ------------------------------------------------------------------ */
/* Read (All)                                                          */
/* ------------------------------------------------------------------ */

exports.getAllClassSubjectTeachers = async (req, res) => {
  try {
    const assignments = await ClassSubjectTeacher.findAll({
      include: [
        { model: Class, as: "Class", attributes: ["id", "class_name"] },
        { model: Section, as: "Section", attributes: ["id", "section_name"] },
        { model: Subject, as: "Subject", attributes: ["id", "name"] },
        {
          model: User,
          as: "Teacher", // ensure your ClassSubjectTeacher belongsTo(User, { as: 'Teacher', foreignKey: 'teacher_id' })
          attributes: ["id", "name", "email", "status"],
          include: [
            USER_ROLES_ALIAS && {
              model: Role,
              as: USER_ROLES_ALIAS,
              attributes: ["id", "slug"],
              through: { attributes: [] },
            },
            USER_EMPLOYEE_ALIAS && {
              model: Employee,
              as: USER_EMPLOYEE_ALIAS,
              attributes: ["id", "name", "department_id"],
              include: [
                EMPLOYEE_DEPT_ALIAS && {
                  model: Department,
                  as: EMPLOYEE_DEPT_ALIAS,
                  attributes: ["id", "name"],
                },
              ].filter(Boolean),
            },
          ].filter(Boolean),
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

/* ------------------------------------------------------------------ */
/* Read (One)                                                          */
/* ------------------------------------------------------------------ */

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
            USER_ROLES_ALIAS && {
              model: Role,
              as: USER_ROLES_ALIAS,
              attributes: ["id", "slug"],
              through: { attributes: [] },
            },
            USER_EMPLOYEE_ALIAS && {
              model: Employee,
              as: USER_EMPLOYEE_ALIAS,
              attributes: ["id", "name", "department_id"],
              include: [
                EMPLOYEE_DEPT_ALIAS && {
                  model: Department,
                  as: EMPLOYEE_DEPT_ALIAS,
                  attributes: ["id", "name"],
                },
              ].filter(Boolean),
            },
          ].filter(Boolean),
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

/* ------------------------------------------------------------------ */
/* Update                                                              */
/* ------------------------------------------------------------------ */

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
        message:
          "An assignment with the same class, section, and subject already exists. Do you want to proceed?",
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

/* ------------------------------------------------------------------ */
/* Delete                                                              */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Self (Subjects for logged-in teacher)                               */
/* ------------------------------------------------------------------ */

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
