// controllers/roleController.js
const { Role } = require("../models");

// Helper: make slug from name
const toSlug = (str = "") =>
  str
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const isDev = process.env.NODE_ENV !== "production";
const handleError = (res, err, fallbackMsg = "Server error") => {
  console.error(fallbackMsg, err);
  return res.status(500).json({
    message: fallbackMsg,
    ...(isDev && { error: err.message, stack: err.stack }),
  });
};

// GET /roles
exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.findAll({
      attributes: ["id", "name", "slug"],
      order: [["name", "ASC"]],
    });
    return res.json({ roles });
  } catch (e) {
    return handleError(res, e, "Failed to fetch roles");
  }
};

// POST /roles
exports.createRole = async (req, res) => {
  try {
    let { name, slug } = req.body;

    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }
    slug = slug && slug.trim() ? slug : toSlug(name);

    const role = await Role.create({ name, slug });
    return res.status(201).json({ role });
  } catch (e) {
    // Handle unique constraint
    if (e.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ message: "Role name or slug already exists" });
    }
    return handleError(res, e, "Failed to create role");
  }
};

// PUT /roles/:id
exports.updateRole = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid role id" });

    const { name, slug } = req.body;
    const role = await Role.findByPk(id);
    if (!role) return res.status(404).json({ message: "Role not found" });

    const payload = {};
    if (name) payload.name = name;
    if (slug && slug.trim()) payload.slug = slug.trim();
    if (!payload.slug && name) payload.slug = toSlug(name);

    await role.update(payload);
    return res.json({ role });
  } catch (e) {
    if (e.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ message: "Role name or slug already exists" });
    }
    return handleError(res, e, "Failed to update role");
  }
};

// DELETE /roles/:id
exports.deleteRole = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid role id" });

    const deleted = await Role.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ message: "Role not found" });

    return res.json({ message: "Role deleted" });
  } catch (e) {
    return handleError(res, e, "Failed to delete role");
  }
};
