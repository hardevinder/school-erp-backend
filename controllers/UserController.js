// controllers/userController.js
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const { User, Role, Student, Class, Section, Employee, Department, sequelize } = require("../models");


/* ------------ helpers ------------- */
const needEmail = (rolesArr = []) => rolesArr.some((r) => r && r !== "student");

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
      employee_internal_id, // ✅ actual employee table primary key
    } = req.body;

    if (!name || !username) {
      await t.rollback();
      return res.status(400).json({ error: "Name & username are required" });
    }

    // 🔍 Prepare final role array
    const roleArr = Array.isArray(roles) && roles.length > 0 ? roles : role ? [role] : [];

    if (roleArr.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: "At least one role must be assigned" });
    }

    // ✅ Check for username uniqueness
    const existingUsername = await User.findOne({ where: { username }, transaction: t });
    if (existingUsername) {
      await t.rollback();
      return res.status(400).json({ error: "Username is already taken" });
    }

    // 🔐 Role creation permission
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
      return res.status(403).json({ error: "You are not allowed to assign one or more of the requested roles." });
    }

    // 📧 Email validation
    if (needEmail(roleArr)) {
      if (!email) {
        await t.rollback();
        return res.status(400).json({ error: "Email is required for staff roles" });
      }
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        await t.rollback();
        return res.status(400).json({ error: "Please provide a valid email address" });
      }
      const existingEmail = await User.findOne({ where: { email }, transaction: t });
      if (existingEmail) {
        await t.rollback();
        return res.status(400).json({ error: "Email is already registered" });
      }
    }

    // 🎓 Admission number (for students)
    if (roleArr.includes("student") && admission_number) {
      const existingAdmission = await User.findOne({ where: { admission_number }, transaction: t });
      if (existingAdmission) {
        await t.rollback();
        return res.status(400).json({ error: "Admission number is already in use" });
      }
    }

    // 🔐 Password
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

    // 🎭 Assign roles
    const dbRoles = await Role.findAll({
      where: {
        [Op.or]: [
          { slug: roleArr },
          { name: roleArr },
        ],
      },
      transaction: t,
    });

    if (!dbRoles.length) {
      await t.rollback();
      return res.status(400).json({ error: "No valid roles found" });
    }

    await newUser.setRoles(dbRoles, { transaction: t });

    // 🔗 Always link to Employee if internal ID provided
    if (employee_internal_id) {
      const employee = await Employee.findByPk(employee_internal_id, { transaction: t });
      if (!employee) {
        await t.rollback();
        return res.status(404).json({ error: "Employee record not found" });
      }

      if (employee.user_id) {
        await t.rollback();
        return res.status(400).json({ error: "This employee already has a user account" });
      }

      await employee.update({ user_id: newUser.id }, { transaction: t });
    }

    await t.commit();

    const clean = newUser.toJSON();
    delete clean.password;

    return res.status(201).json({
      message: "User registered successfully",
      user: clean,
      roles: dbRoles.map((r) => r.slug),
    });
  } catch (error) {
    await t.rollback();
    console.error("❌ Error during registration:", error);
    return res.status(500).json({ error: "Failed to register user", details: error.message });
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
          return res.status(400).json({ error: "google_email & google_name required" });
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
        return res.status(400).json({ error: "Login and password required" });
      }

      user = await User.findOne({
        where: { [Op.or]: [{ email: loginField }, { username: loginField }] },
        include: [{ model: Role, as: "roles", attributes: ["name", "slug"] }],
      });

      if (!user || !user.password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(401).json({ error: "Invalid password" });
    }

    const roleSlugs = user.roles.map((r) => r.slug);

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
      message: "Login successful",
      token,
      user: userData,
      roles: roleSlugs,
    });
  } catch (error) {
    console.error("Error during login:", error);
    return res.status(500).json({ error: "Login failed", details: error.message });
  }
};

/* =========================================================
   UPDATE USER & ROLES
========================================================= */
exports.updateUserAndRoles = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const userId = req.params.id;
    const { name, username, email, password, roles } = req.body;

    if (!userId) {
      await t.rollback();
      return res.status(400).json({ message: "userId is required" });
    }
    if (!Array.isArray(roles) || roles.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: "roles array is required" });
    }

    const user = await User.findByPk(userId, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ message: "User not found" });
    }

    if (needEmail(roles) && !email) {
      await t.rollback();
      return res.status(400).json({ message: "Email is required for staff roles" });
    }

    const payload = {};
    if (name) payload.name = name;
    if (username) payload.username = username;
    if (email) payload.email = email;
    if (password) payload.password = await bcrypt.hash(password, 10);

    await user.update(payload, { transaction: t });

    const dbRoles = await Role.findAll({
      where: { [Op.or]: [{ slug: roles }, { name: roles }] },
      transaction: t,
    });

    if (dbRoles.length !== roles.length) {
      await t.rollback();
      return res.status(400).json({ message: "One or more roles not found" });
    }

    await user.setRoles(dbRoles, { transaction: t });

    await t.commit();

    const fresh = await User.findByPk(userId, {
      include: [{ model: Role, as: "roles", attributes: ["id", "name", "slug"] }],
    });

    return res.json({
      message: "User updated",
      user: {
        ...fresh.toJSON(),
        roles: fresh.roles.map((r) => r.slug),
      },
    });
  } catch (e) {
    await t.rollback();
    console.error("PUT /super-admin/update-role error:", e);
    return res.status(500).json({ message: "Failed to update user", error: e.message });
  }
};

/* =========================================================
   LIST USERS (admin/superadmin)
========================================================= */
exports.listUsers = async (req, res) => {
  try {
    const currentUserRoles = req.user?.roles || [];

    const whereClause = {};
    const includeRoles = [{ model: Role, as: "roles", attributes: ["slug", "name"] }];

    // If the user is only an academic_coordinator, restrict to students
    const isCoordinator = currentUserRoles.includes("academic_coordinator");
    const isAdminOrSuper = currentUserRoles.includes("admin") || currentUserRoles.includes("superadmin");

    if (isCoordinator && !isAdminOrSuper) {
      // Sequelize will filter users whose roles include 'student'
      whereClause["$roles.slug$"] = "student";
    }

    const users = await User.findAll({
      where: whereClause,
      attributes: ["id", "name", "username", "email", "admission_number", "status"],
      include: includeRoles,
      order: [["id", "ASC"]],
    });

    res.json({
      users: users.map((u) => ({
        ...u.toJSON(),
        roles: u.roles.map((r) => r.slug),
      })),
    });
  } catch (e) {
    console.error("GET /users/all error:", e);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};


exports.listStudents = async (req, res) => {
  try {
    const { page = 1, limit = 10, class_id, section_id } = req.query;
    const offset = (page - 1) * parseInt(limit, 10);

    // Only students if coordinator, otherwise all roles
    const currentUserRoles = req.user?.roles || [];
    const isCoordinator  = currentUserRoles.includes("academic_coordinator");
    const isAdminOrSuper = currentUserRoles.includes("admin") || currentUserRoles.includes("superadmin");

    // Base where: filter by class or section if provided
    const where = {};
    if (class_id)   where.class_id   = class_id;
    if (section_id) where.section_id = section_id;

    // Build role include
    const roleInclude = {
      model: Role,
      as: "roles",
      attributes: ["slug","name"],
      through: { attributes: [] }
    };
    if (isCoordinator && !isAdminOrSuper) {
      roleInclude.where    = { slug: "student" };
      roleInclude.required = true;
    }

    // Query with count for pagination
    const { count, rows } = await User.findAndCountAll({
      where,
      offset,
      limit: parseInt(limit, 10),
      order: [["id","ASC"]],
      attributes: [
        "id","name","username","email","admission_number",
        "status","class_id","section_id"
      ],
      include: [ roleInclude ]
    });

    // Map into the shape your front‑end expects
    const students = rows.map(u => {
      const obj = u.toJSON();
      return {
        ...obj,
        // ensure status never undefined
        status: obj.status || "active",
        roles: obj.roles.map(r => r.slug)
      };
    });

    return res.json({
      students,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page, 10)
    });
  } catch (e) {
    console.error("GET /users/students error:", e);
    return res.status(500).json({ message: "Failed to fetch students" });
  }
};

/* =========================================================
   DELETE USER (admin/superadmin)
========================================================= */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user.roles.includes("superadmin")) {
      return res.status(403).json({ message: "Only superadmin can delete users" });
    }

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    await user.destroy();
    res.json({ message: "User deleted" });
  } catch (e) {
    console.error("DELETE /users/:id error:", e);
    res.status(500).json({ message: "Failed to delete user" });
  }
};


/* =========================================================
   EDIT PROFILE (self)
========================================================= */
exports.editUserProfile = async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (email) {
      const existingUser = await User.findOne({
        where: { email, id: { [Op.ne]: userId } },
      });
      if (existingUser) {
        return res.status(400).json({ message: "Email is already in use by another account." });
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
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Current password is incorrect." });
      }
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      updatedData.password = hashedNewPassword;
    }

    await User.update(updatedData, { where: { id: userId } });
    const updatedUser = await User.findByPk(userId);

    if (updatedUser.profilePhoto) {
      updatedUser.profilePhoto = `${req.protocol}://${req.get("host")}${updatedUser.profilePhoto}`;
    }

    return res.status(200).json({ message: "Profile updated successfully!", user: updatedUser });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({ message: "Error updating profile", error: error.message });
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

    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.profilePhoto) {
      user.profilePhoto = `${req.protocol}://${req.get("host")}${user.profilePhoto}`;
    }

    return res.status(200).json({
      message: "User profile fetched successfully",
      user: {
        ...user.toJSON(),
        roles: user.roles.map((r) => r.slug),
      },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return res.status(500).json({ message: "Failed to fetch user profile", error: error.message });
  }
};

/* =========================================================
   GET STUDENTS
========================================================= */
// controllers/UserController.js

exports.getStudents = async (req, res) => {
  try {
    const { page = 1, limit = 10, class_id, section_id } = req.query;
    const offset = (page - 1) * parseInt(limit, 10);

    const currentRoles  = req.user?.roles || [];
    const isCoord       = currentRoles.includes("academic_coordinator");
    const isAdminOrSuper= currentRoles.includes("admin") || currentRoles.includes("superadmin");

    // Filter Student by class/section if passed
    const studentWhere = {};
    if (class_id)   studentWhere.class_id   = class_id;
    if (section_id) studentWhere.section_id = section_id;

    // Role include (restrict to students for coordinators)
    const roleInclude = {
      model: Role,
      as: "roles",
      attributes: ["slug","name"],
      through: { attributes: [] },
    };
    if (isCoord && !isAdminOrSuper) {
      roleInclude.where    = { slug: "student" };
      roleInclude.required = true;
    }

    const { count, rows } = await User.findAndCountAll({
      offset,
      limit: parseInt(limit, 10),
      order: [["id","ASC"]],
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
          as: "studentProfile",          // whatever alias you’ve defined
          where: studentWhere,
          attributes: ["class_id","section_id"],
          required: true,               // only users who actually have a student record
          include: [
            { model: Class,   as: "Class",   attributes: ["class_name"] },
            { model: Section, as: "Section", attributes: ["section_name"] },
          ]
        }
      ]
    });

    const students = rows.map(u => {
      const obj = u.toJSON();
      return {
        id:             obj.id,
        name:           obj.name,
        username:       obj.username,
        email:          obj.email,
        admission_number: obj.admission_number,
        status:         obj.status,
        roles:          obj.roles.map(r => r.slug),
        class_id:       obj.studentProfile.class_id,
        section_id:     obj.studentProfile.section_id,
        class_name:     obj.studentProfile.Class.class_name,
        section_name:   obj.studentProfile.Section.section_name,
      };
    });

    return res.json({
      students,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page, 10),
    });
  } catch (err) {
    console.error("GET /users/students error:", err);
    return res
      .status(500)
      .json({ message: err.message || "Failed to fetch students" });
  }
};

/* =========================================================
   SAVE FCM TOKEN
========================================================= */
exports.saveToken = async (req, res) => {
  try {
    const { username, token } = req.body;
    if (!username || !token) {
      return res.status(400).json({ success: false, message: "Username and token are required" });
    }
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    user.fcmToken = token;
    await user.save();
    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Error saving FCM token:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};



/* =========================================================
   DISABLE USER (with coordinator privilege for students)
========================================================= */
exports.disableUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await User.findByPk(id, {
      include: [{ model: Role, as: "roles", attributes: ["slug"] }],
    });

    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.status === "disabled") {
      return res.status(400).json({ message: "User is already disabled" });
    }

    // check roles
    const targetIsStudent = user.roles.some((r) => r.slug === "student");
    const currentUserRoles = req.user.roles;

    const canDisable =
      currentUserRoles.includes("superadmin") ||
      currentUserRoles.includes("admin") ||
      (currentUserRoles.includes("academic_coordinator") && targetIsStudent);

    if (!canDisable) {
      return res.status(403).json({ message: "You are not allowed to disable this user" });
    }

    await user.update({
      status: "disabled",
      disabledAt: new Date(),
      disabledBy: req.user.id,
      disableReason: reason || "No reason provided",
    });

    res.json({ message: "User disabled successfully" });
  } catch (error) {
    console.error("Error disabling user:", error);
    res.status(500).json({ message: "Failed to disable user", error: error.message });
  }
};


/* =========================================================
   ENABLE USER (with coordinator privilege for students)
========================================================= */
exports.enableUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      include: [{ model: Role, as: "roles", attributes: ["slug"] }],
    });

    if (!user || user.status !== "disabled") {
      return res.status(404).json({ message: "Disabled user not found" });
    }

    // check roles
    const targetIsStudent = user.roles.some((r) => r.slug === "student");
    const currentUserRoles = req.user.roles;

    const canEnable =
      currentUserRoles.includes("superadmin") ||
      currentUserRoles.includes("admin") ||
      (currentUserRoles.includes("academic_coordinator") && targetIsStudent);

    if (!canEnable) {
      return res.status(403).json({ message: "You are not allowed to enable this user" });
    }

    await user.update({
      status: "active",
      disabledAt: null,
      disabledBy: null,
      disableReason: null,
    });

    res.json({ message: "User restored successfully" });
  } catch (error) {
    console.error("Error restoring user:", error);
    res.status(500).json({ message: "Failed to restore user", error: error.message });
  }
};


exports.getEmployeeUsers = async (req, res) => {
  try {
    const { department_id, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const whereEmployee = {};
    if (department_id) whereEmployee.department_id = department_id;

    const { count, rows } = await User.findAndCountAll({
      offset,
      limit: parseInt(limit),
      attributes: ["id", "name", "username", "email", "status"],
      include: [
        {
          model: Role,
          as: "roles",
          where: { slug: { [Op.ne]: "student" } }, // ❗ Exclude users with 'student' role
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
              as: "department", // ✅ corrected alias
              attributes: ["id", "name"],
            },
          ],
        },
      ],
      distinct: true, // important to get correct count with includes
      order: [["id", "ASC"]],
    });

    const employees = rows.map((u) => {
      const json = u.toJSON();
      return {
        ...json,
        roles: json.roles.map((r) => r.slug),
        department_id: json.employee?.department_id || null,
        department_name: json.employee?.department?.name || "N/A", // ✅ corrected alias
      };
    });

    return res.json({
      employees,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
    });
  } catch (err) {
    console.error("getEmployeeUsers error:", err);
    console.error("💥 Stack:", err.stack);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
};

