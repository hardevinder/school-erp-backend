// controllers/teacherController.js
const { User, Role } = require("../models");

exports.getTeachers = async (req, res) => {
  try {
    const teachers = await User.findAll({
      attributes: ["id", "name", "username", "email", "status"], // include what you need
      include: [
        {
          model: Role,
          as: "roles",
          where: { slug: "teacher" }, // ✅ filter by teacher role
          attributes: [], // No need to return the role info here
        },
      ],
    });

    res.status(200).json({ teachers });
  } catch (error) {
    console.error("Error fetching teachers:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
