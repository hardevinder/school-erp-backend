const bcrypt = require("bcrypt");
const { User } = require("../models"); // ✅ Fixed import
const { Op } = require("sequelize");

// ✅ Create a new user (Admin, Student, Teacher, HR, or Academic Coordinator)
exports.createUser = async (req, res) => {
  try {
    const { name, username, email, password, role } = req.body;

    // Validate role
    const validRoles = ["admin", "student", "teacher", "hr", "academic_coordinator"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: `Invalid role. Allowed roles: ${validRoles.join(", ")}.` });
    }

    // Validate username
    if (!username) {
      return res.status(400).json({ message: "Username is required." });
    }

    // Check for duplicate username or email
    const existingUser = await User.findOne({ where: { [Op.or]: [{ username }, { email }] } });
    if (existingUser) {
      return res.status(400).json({ message: "Username or email is already taken." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await User.create({
      name,
      username,
      email: email || null,
      password: hashedPassword, // ✅ Ensure password is stored
      role,
    });

    res.status(201).json({ message: "User created successfully", user: newUser });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Failed to create user", error: error.message });
  }
};

// ✅ Update User Details (works for both self-update and super admin update)
//
// - If the authenticated user is a superadmin and provides a userId, the update applies to that user.
// - Otherwise, it updates the authenticated user's own data.
// - For each field, we only update if it's provided and not equal to the string "undefined".
exports.updateUserRole = async (req, res) => {
  try {
    console.log("Authenticated user:", req.user);
    console.log("Request body:", req.body);

    // Determine whose data to update: superadmin can specify a userId, others update their own details.
    const targetUserId =
      req.user.role === "superadmin" && req.body.userId
        ? req.body.userId
        : req.user.id;

    if (!targetUserId) {
      return res.status(400).json({ message: "No valid user identifier found." });
    }

    // Destructure potential update fields
    const { name, username, email, role, password } = req.body;
    const validRoles = ["admin", "student", "teacher", "hr", "academic_coordinator"];

    // Retrieve the user from the database
    const user = await User.findByPk(targetUserId);
    if (!user) {
      console.error("User not found for id:", targetUserId);
      return res.status(404).json({ message: "User not found." });
    }

    // Process role update: only allowed if the authenticated user is superadmin.
    if (role !== undefined) {
      if (req.user.role === "superadmin") {
        if (!validRoles.includes(role)) {
          return res
            .status(400)
            .json({ message: `Invalid role. Allowed roles: ${validRoles.join(", ")}.` });
        }
        user.role = role;
      } else {
        return res.status(403).json({ message: "Permission denied to update role." });
      }
    }

    // Update other fields only if they are provided and not the literal "undefined"
    if (name !== undefined && name !== "undefined") {
      user.name = name;
    }
    if (username !== undefined && username !== "undefined") {
      user.username = username;
    }
    if (email !== undefined && email !== "undefined") {
      user.email = email;
    }

    // If a new password is provided, hash it before saving.
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    // Save the updated user data
    await user.save();
    console.log("User updated successfully:", user);

    res.status(200).json({ message: "User updated successfully", user });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Failed to update user", error: error.message });
  }
};

// ✅ List all users (without sensitive fields)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ["id", "name", "email", "role", "createdAt"], // ✅ Exclude password
    });

    res.status(200).json({ message: "Users fetched successfully", users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users", error: error.message });
  }
};

// ✅ Delete User (ensuring superadmin is not deleted)
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.role === "superadmin") {
      return res.status(403).json({ message: "Cannot delete a Super Admin." });
    }

    await user.destroy();
    res.status(200).json({ message: "User deleted successfully." });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Failed to delete user", error: error.message });
  }
};
