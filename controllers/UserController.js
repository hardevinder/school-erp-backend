// controllers/userController.js
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const {
  User,
  Role,
  Student,
  Class,
  Section,
  Employee,
  Department,
  sequelize,
} = require("../models");

/* ------------ helpers ------------- */
const needEmail = (rolesArr = []) => rolesArr.some((r) => r && r !== "student");
const isEmail = (s) => !!s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/* small helper to send validation arrays uniformly */
const sendValidation = (res, errors, code = 400) =>
  res.status(code).json({ success: false, message: "Validation failed", errors });

/* =========================================================
   REGISTER
========================================================= */
exports.registerUser = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      name,
      username,
      email,
      password,
      google_id,
      admission_number,
      fcmToken,
      roles = [],
      role,
      employee_internal_id, // employee table PK
    } = req.body;

    const errors = [];
    if (!name) errors.push({ field: "name", message: "Name is required." });
    if (!username)
      errors.push({ field: "username", message: "Username is required." });

    const roleArr =
      Array.isArray(roles) && roles.length > 0 ? roles : role ? [role] : [];
    if (!roleArr.length)
      errors.push({
        field: "roles",
        message: "At least one role must be assigned.",
      });

    // staff email requirement
    if (needEmail(roleArr)) {
      if (!email)
        errors.push({
          field: "email",
          message: "Email is required for staff roles.",
        });
      else if (!isEmail(email))
        errors.push({ field: "email", message: "Invalid email address." });
    }

    if (errors.length) {
      await t.rollback();
      return sendValidation(res, errors);
    }

    // Permission to assign requested roles
    const currentUserRoles = req.user?.roles || [];
    const isAdmin = currentUserRoles.includes("admin");
    const isSuperadmin = currentUserRoles.includes("superadmin");
    const isCoordinator = currentUserRoles.includes("academic_coordinator");
    const isHR = currentUserRoles.includes("hr");

    const invalidRoleRequested = roleArr.some((r) => {
      if (r === "superadmin") return !isSuperadmin;
      if (r === "student") return isCoordinator ? false : !(isAdmin || isSuperadmin || isHR);
      return !(isAdmin || isSuperadmin || isHR);
    });

    if (invalidRoleRequested) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: "You are not allowed to assign one or more of the requested roles.",
      });
    }

    // Username uniqueness
    const existingUsername = await User.findOne({
      where: { username },
      transaction: t,
    });
    if (existingUsername) {
      await t.rollback();
      return sendValidation(res, [
        { field: "username", message: "Username is already taken." },
      ]);
    }

    // Email uniqueness (if provided)
    if (email) {
      const existingEmail = await User.findOne({
        where: { email },
        transaction: t,
      });
      if (existingEmail) {
        await t.rollback();
        return sendValidation(res, [
          { field: "email", message: "Email is already registered." },
        ]);
      }
    }

    // Admission number uniqueness for students
    if (roleArr.includes("student") && admission_number) {
      const existingAdmission = await User.findOne({
        where: { admission_number },
        transaction: t,
      });
      if (existingAdmission) {
        await t.rollback();
        return sendValidation(res, [
          {
            field: "admission_number",
            message: "Admission number is already in use.",
          },
        ]);
      }
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const newUser = await User.create(
      {
        name,
        username,
        email: email || null,
        password: hashedPassword,
        google_id,
        admission_number,
        fcmToken: fcmToken || null,
      },
      { transaction: t }
    );

    // Resolve roles by slug or name
    const dbRoles = await Role.findAll({
      where: {
        [Op.or]: [{ slug: roleArr }, { name: roleArr }],
      },
      transaction: t,
    });

    if (!dbRoles.length) {
      await t.rollback();
      return sendValidation(res, [
        { field: "roles", message: "No valid roles found." },
      ]);
    }

    await newUser.setRoles(dbRoles, { transaction: t });

    // Link employee if provided
    if (employee_internal_id) {
      const employee = await Employee.findByPk(employee_internal_id, {
        transaction: t,
      });
      if (!employee) {
        await t.rollback();
        return res
          .status(404)
          .json({ success: false, message: "Employee record not found" });
      }

      if (employee.user_id) {
        await t.rollback();
        return sendValidation(res, [
          { field: "employee_internal_id", message: "Employee already linked to a user." },
        ]);
      }

      await employee.update({ user_id: newUser.id }, { transaction: t });
    }

    await t.commit();

    const clean = newUser.toJSON();
    delete clean.password;

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: clean,
      roles: dbRoles.map((r) => r.slug),
    });
  } catch (error) {
    await t.rollback();
    console.error("❌ Error during registration:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to register user" });
  }
};

/* =========================================================
   LOGIN
========================================================= */
exports.loginUser = async (req, res) => {
  try {
    const {
      google_id,
      login,
      password,
      email,
      username,
      google_email,
      google_name,
      google_username,
      name,
    } = req.body;

    let user;

    if (google_id) {
      // Google path
      user = await User.findOne({
        where: { google_id },
        include: [{ model: Role, as: "roles", attributes: ["name", "slug"] }],
      });

      if (!user) {
        const effectiveEmail = google_email || email;
        const effectiveName = google_name || name;

        if (!effectiveEmail || !effectiveName) {
          return sendValidation(res, [
            { field: "google_email", message: "google_email & google_name required." },
          ]);
        }

        // Attach or create
        user = await User.findOne({ where: { email: effectiveEmail } });

        if (user) {
          user.google_id = google_id;
          await user.save();
        } else {
          user = await User.create({
            name: effectiveName,
            username: google_username || effectiveEmail,
            email: effectiveEmail,
            password: null,
            google_id,
          });

          const studentRole = await Role.findOne({ where: { slug: "student" } });
          if (studentRole) await user.setRoles([studentRole]);
        }

        user = await User.findByPk(user.id, {
          include: [{ model: Role, as: "roles", attributes: ["name", "slug"] }],
        });
      }
    } else {
      // Normal login
      const loginField = login || email || username;
      if (!loginField || !password) {
        return sendValidation(res, [
          { field: "login", message: "Login and password are required." },
        ]);
      }

      user = await User.findOne({
        where: { [Op.or]: [{ email: loginField }, { username: loginField }] },
        include: [{ model: Role, as: "roles", attributes: ["name", "slug"] }],
      });

      if (!user || !user.password) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res.status(401).json({ success: false, message: "Invalid password" });
    }

    const roleSlugs = (user.roles || []).map((r) => r.slug);

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        roles: roleSlugs,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const userData = user.toJSON();
    delete userData.password;

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: userData,
      roles: roleSlugs,
    });
  } catch (error) {
    console.error("Error during login:", error);
    return res.status(500).json({ success: false, message: "Login failed" });
  }
};

/* =========================================================
   UPDATE USER & ROLES
========================================================= */
exports.updateUserAndRoles = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const userId = String(req.params.id || "").trim();
    const { name, username, email, password, roles } = req.body;

    const errors = [];

    // Basic validations
    if (!userId) errors.push({ field: "id", message: "User id is required." });
    if (!name) errors.push({ field: "name", message: "Name is required." });
    if (!username)
      errors.push({ field: "username", message: "Username is required." });
    if (!Array.isArray(roles) || roles.length === 0)
      errors.push({ field: "roles", message: "Select at least one role." });

    // Staff need email
    if (needEmail(roles) && !email) {
      errors.push({
        field: "email",
        message: "Email is required for staff roles.",
      });
    }
    if (email && !isEmail(email)) {
      errors.push({ field: "email", message: "Invalid email address." });
    }
    if (password && String(password).length < 6) {
      errors.push({
        field: "password",
        message: "Password must be at least 6 characters.",
      });
    }

    // Permissions: coordinator can only manage student role
    const requester = req.user || req.authUser || {};
    const requesterRoles = Array.isArray(requester.roles)
      ? requester.roles
      : requester.role
      ? [requester.role]
      : [];
    const isCoordinator = requesterRoles.includes("academic_coordinator");
    if (isCoordinator && roles.some((r) => r !== "student")) {
      errors.push({
        field: "roles",
        message: "Academic Coordinator can only assign the 'student' role.",
      });
    }

    if (errors.length) {
      await t.rollback();
      return sendValidation(res, errors);
    }

    // Ensure user exists
    const user = await User.findByPk(userId, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Uniqueness (exclude current user)
    if (username) {
      const existsUsername = await User.findOne({
        where: { username, id: { [Op.ne]: userId } },
        transaction: t,
      });
      if (existsUsername) {
        await t.rollback();
        return sendValidation(res, [
          { field: "username", message: "Username already in use." },
        ]);
      }
    }
    if (email) {
      const existsEmail = await User.findOne({
        where: { email, id: { [Op.ne]: userId } },
        transaction: t,
      });
      if (existsEmail) {
        await t.rollback();
        return sendValidation(res, [
          { field: "email", message: "Email already in use." },
        ]);
      }
    }

    // Validate roles
    const dbRoles = await Role.findAll({
      where: { [Op.or]: [{ slug: roles }, { name: roles }] },
      transaction: t,
    });
    if (dbRoles.length !== roles.length) {
      const found = new Set(dbRoles.map((r) => r.slug));
      const missing = roles.filter((r) => !found.has(r));
      await t.rollback();
      return sendValidation(res, [
        { field: "roles", message: `Unknown roles: ${missing.join(", ")}` },
      ]);
    }

    // Prepare payload
    const payload = { name, username, email: email || null };
    if (password) payload.password = await bcrypt.hash(password, 10);

    // Update & set roles
    await user.update(payload, { transaction: t });
    await user.setRoles(dbRoles, { transaction: t });

    await t.commit();

    const fresh = await User.findByPk(userId, {
      include: [{ model: Role, as: "roles", attributes: ["id", "name", "slug"] }],
    });

    return res.json({
      success: true,
      message: "User updated",
      user: {
        ...fresh.toJSON(),
        roles: (fresh.roles || []).map((r) => r.slug),
      },
    });
  } catch (e) {
    await t.rollback();
    console.error("PUT /users/:id update error:", e);

    if (e.name === "SequelizeValidationError") {
      const details =
        e.errors?.map((er) => ({ field: er.path, message: er.message })) || [];
      return sendValidation(res, details);
    }
    if (e.name === "SequelizeUniqueConstraintError") {
      const details =
        e.errors?.map((er) => ({
          field: er.path?.includes("username")
            ? "username"
            : er.path?.includes("email")
            ? "email"
            : er.path,
          message: "Already in use.",
        })) || [];
      return sendValidation(res, details);
    }

    return res.status(500).json({ success: false, message: "Failed to update user" });
  }
};

/* =========================================================
   LIST USERS (admin/superadmin/coordinator)
========================================================= */
exports.listUsers = async (req, res) => {
  try {
    const currentUserRoles = req.user?.roles || [];
    const isCoordinator = currentUserRoles.includes("academic_coordinator");
    const isAdminOrSuper =
      currentUserRoles.includes("admin") || currentUserRoles.includes("superadmin");

    const roleInclude = {
      model: Role,
      as: "roles",
      attributes: ["slug", "name"],
      through: { attributes: [] },
      ...(isCoordinator && !isAdminOrSuper
        ? { where: { slug: "student" }, required: true }
        : {}),
    };

    const users = await User.findAll({
      attributes: ["id", "name", "username", "email", "admission_number", "status"],
      include: [roleInclude],
      order: [["id", "ASC"]],
      distinct: true,
    });

    res.json({
      success: true,
      users: users.map((u) => ({
        ...u.toJSON(),
        roles: (u.roles || []).map((r) => r.slug),
      })),
    });
  } catch (e) {
    console.error("GET /users/all error:", e);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
};

/* =========================================================
   LIST STUDENTS (paged; optional)
========================================================= */
exports.listStudents = async (req, res) => {
  try {
    const { page = 1, limit = 10, class_id, section_id } = req.query;
    const offset = (page - 1) * parseInt(limit, 10);

    const currentUserRoles = req.user?.roles || [];
    const isCoordinator = currentUserRoles.includes("academic_coordinator");
    const isAdminOrSuper =
      currentUserRoles.includes("admin") || currentUserRoles.includes("superadmin");

    const where = {};
    if (class_id) where.class_id = class_id;
    if (section_id) where.section_id = section_id;

    const roleInclude = {
      model: Role,
      as: "roles",
      attributes: ["slug", "name"],
      through: { attributes: [] },
      ...(isCoordinator && !isAdminOrSuper
        ? { where: { slug: "student" }, required: true }
        : {}),
    };

    const { count, rows } = await User.findAndCountAll({
      where,
      offset,
      limit: parseInt(limit, 10),
      order: [["id", "ASC"]],
      attributes: [
        "id",
        "name",
        "username",
        "email",
        "admission_number",
        "status",
        "class_id",
        "section_id",
      ],
      include: [roleInclude],
      distinct: true,
    });

    const students = rows.map((u) => {
      const obj = u.toJSON();
      return {
        ...obj,
        status: obj.status || "active",
        roles: (obj.roles || []).map((r) => r.slug),
      };
    });

    return res.json({
      success: true,
      students,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page, 10),
    });
  } catch (e) {
    console.error("GET /users/listStudents error:", e);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch students" });
  }
};

/* =========================================================
   GET STUDENTS (with Student profile join)
========================================================= */
exports.getStudents = async (req, res) => {
  try {
    const { page = 1, limit = 10, class_id, section_id } = req.query;
    const offset = (page - 1) * parseInt(limit, 10);

    const currentRoles = req.user?.roles || [];
    const isCoord = currentRoles.includes("academic_coordinator");
    const isAdminOrSuper =
      currentRoles.includes("admin") || currentRoles.includes("superadmin");

    const studentWhere = {};
    if (class_id) studentWhere.class_id = class_id;
    if (section_id) studentWhere.section_id = section_id;

    const roleInclude = {
      model: Role,
      as: "roles",
      attributes: ["slug", "name"],
      through: { attributes: [] },
      ...(isCoord && !isAdminOrSuper
        ? { where: { slug: "student" }, required: true }
        : {}),
    };

    const { count, rows } = await User.findAndCountAll({
      offset,
      limit: parseInt(limit, 10),
      order: [["id", "ASC"]],
      attributes: [
        "id",
        "name",
        "username",
        "email",
        "admission_number",
        "status",
      ],
      include: [
        roleInclude,
        {
          model: Student,
          as: "studentProfile",
          where: studentWhere,
          attributes: ["class_id", "section_id"],
          required: true,
          include: [
            { model: Class, as: "Class", attributes: ["class_name"] },
            { model: Section, as: "Section", attributes: ["section_name"] },
          ],
        },
      ],
      distinct: true,
    });

    const students = rows.map((u) => {
      const obj = u.toJSON();
      return {
        id: obj.id,
        name: obj.name,
        username: obj.username,
        email: obj.email,
        admission_number: obj.admission_number,
        status: obj.status,
        roles: (obj.roles || []).map((r) => r.slug),
        class_id: obj.studentProfile.class_id,
        section_id: obj.studentProfile.section_id,
        class_name: obj.studentProfile.Class.class_name,
        section_name: obj.studentProfile.Section.section_name,
      };
    });

    return res.json({
      success: true,
      students,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page, 10),
    });
  } catch (err) {
    console.error("GET /users/students error:", err);
    return res
      .status(500)
      .json({ success: false, message: err.message || "Failed to fetch students" });
  }
};

/* =========================================================
   DELETE USER (superadmin only)
========================================================= */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user.roles.includes("superadmin")) {
      return res
        .status(403)
        .json({ success: false, message: "Only superadmin can delete users" });
    }

    const user = await User.findByPk(id);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    await user.destroy();
    res.json({ success: true, message: "User deleted" });
  } catch (e) {
    console.error("DELETE /users/:id error:", e);
    res.status(500).json({ success: false, message: "Failed to delete user" });
  }
};

/* =========================================================
   EDIT PROFILE (self)
========================================================= */
exports.editUserProfile = async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (email && !isEmail(email)) {
      return sendValidation(res, [
        { field: "email", message: "Invalid email address." },
      ]);
    }

    if (email) {
      const existingUser = await User.findOne({
        where: { email, id: { [Op.ne]: userId } },
      });
      if (existingUser) {
        return sendValidation(res, [
          { field: "email", message: "Email is already in use by another account." },
        ]);
      }
    }

    let updatedData = { name, email };

    if (req.file) {
      const profilePhotoPath = `/uploads/${req.file.filename}`;
      const user = await User.findByPk(userId);
      if (
        user.profilePhoto &&
        fs.existsSync(path.join(__dirname, `../..${user.profilePhoto}`))
      ) {
        fs.unlinkSync(path.join(__dirname, `../..${user.profilePhoto}`));
      }
      updatedData.profilePhoto = profilePhotoPath;
    }

    if (currentPassword && newPassword) {
      const user = await User.findByPk(userId);
      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );
      if (!isPasswordValid) {
        return res
          .status(401)
          .json({ success: false, message: "Current password is incorrect." });
      }
      if (String(newPassword).length < 6) {
        return sendValidation(res, [
          {
            field: "newPassword",
            message: "New password must be at least 6 characters.",
          },
        ]);
      }
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      updatedData.password = hashedNewPassword;
    }

    await User.update(updatedData, { where: { id: userId } });
    const updatedUser = await User.findByPk(userId);

    if (updatedUser.profilePhoto) {
      updatedUser.profilePhoto = `${req.protocol}://${req.get(
        "host"
      )}${updatedUser.profilePhoto}`;
    }

    return res
      .status(200)
      .json({ success: true, message: "Profile updated successfully!", user: updatedUser });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error updating profile" });
  }
};

/* =========================================================
   GET PROFILE (self)
========================================================= */
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId, {
      attributes: ["id", "name", "email", "profilePhoto", "username"],
      include: [{ model: Role, as: "roles", attributes: ["name", "slug"] }],
    });

    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    if (user.profilePhoto) {
      user.profilePhoto = `${req.protocol}://${req.get("host")}${
        user.profilePhoto
      }`;
    }

    return res.status(200).json({
      success: true,
      message: "User profile fetched successfully",
      user: {
        ...user.toJSON(),
        roles: (user.roles || []).map((r) => r.slug),
      },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch user profile" });
  }
};

/* =========================================================
   SAVE FCM TOKEN
========================================================= */
exports.saveToken = async (req, res) => {
  try {
    const { username, token } = req.body;
    if (!username || !token) {
      return sendValidation(res, [
        { field: "username", message: "Username is required." },
        { field: "token", message: "Token is required." },
      ]);
    }
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    user.fcmToken = token;
    await user.save();
    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Error saving FCM token:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to save token" });
  }
};

/* =========================================================
   DISABLE USER (admin/superadmin; coordinator only for students)
========================================================= */
exports.disableUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await User.findByPk(id, {
      include: [{ model: Role, as: "roles", attributes: ["slug"] }],
    });

    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.status === "disabled") {
      return res.status(400).json({ success: false, message: "User is already disabled" });
    }

    const targetIsStudent = (user.roles || []).some((r) => r.slug === "student");
    const currentUserRoles = req.user.roles || [];

    const canDisable =
      currentUserRoles.includes("superadmin") ||
      currentUserRoles.includes("admin") ||
      (currentUserRoles.includes("academic_coordinator") && targetIsStudent);

    if (!canDisable) {
      return res
        .status(403)
        .json({ success: false, message: "You are not allowed to disable this user" });
    }

    await user.update({
      status: "disabled",
      disabledAt: new Date(),
      disabledBy: req.user.id,
      disableReason: reason || "No reason provided",
    });

    res.json({ success: true, message: "User disabled successfully" });
  } catch (error) {
    console.error("Error disabling user:", error);
    res.status(500).json({ success: false, message: "Failed to disable user" });
  }
};

/* =========================================================
   ENABLE USER (admin/superadmin; coordinator only for students)
========================================================= */
exports.enableUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      include: [{ model: Role, as: "roles", attributes: ["slug"] }],
    });

    if (!user || user.status !== "disabled") {
      return res.status(404).json({ success: false, message: "Disabled user not found" });
    }

    const targetIsStudent = (user.roles || []).some((r) => r.slug === "student");
    const currentUserRoles = req.user.roles || [];

    const canEnable =
      currentUserRoles.includes("superadmin") ||
      currentUserRoles.includes("admin") ||
      (currentUserRoles.includes("academic_coordinator") && targetIsStudent);

    if (!canEnable) {
      return res
        .status(403)
        .json({ success: false, message: "You are not allowed to enable this user" });
    }

    await user.update({
      status: "active",
      disabledAt: null,
      disabledBy: null,
      disableReason: null,
    });

    res.json({ success: true, message: "User restored successfully" });
  } catch (error) {
    console.error("Error restoring user:", error);
    res.status(500).json({ success: false, message: "Failed to restore user" });
  }
};

/* =========================================================
   EMPLOYEE USERS (non-students)
========================================================= */
exports.getEmployeeUsers = async (req, res) => {
  try {
    const { department_id, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * parseInt(limit, 10);

    const whereEmployee = {};
    if (department_id) whereEmployee.department_id = department_id;

    const { count, rows } = await User.findAndCountAll({
      offset,
      limit: parseInt(limit, 10),
      attributes: ["id", "name", "username", "email", "status"],
      include: [
        {
          model: Role,
          as: "roles",
          where: { slug: { [Op.ne]: "student" } }, // Exclude student-only users
          attributes: ["id", "slug", "name"],
        },
        {
          model: Employee,
          as: "employee",
          required: true,
          where: whereEmployee,
          attributes: ["id", "employee_id", "department_id"],
          include: [
            {
              model: Department,
              as: "department",
              attributes: ["id", "name"],
            },
          ],
        },
      ],
      distinct: true,
      order: [["id", "ASC"]],
    });

    const employees = rows.map((u) => {
      const json = u.toJSON();
      return {
        ...json,
        roles: (json.roles || []).map((r) => r.slug),
        department_id: json.employee?.department_id || null,
        department_name: json.employee?.department?.name || "N/A",
      };
    });

    return res.json({
      success: true,
      employees,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page, 10),
    });
  } catch (err) {
    console.error("getEmployeeUsers error:", err);
    res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
