const {
  ReportCardFormat,
  ReportCardFormatClass,
  Class,
  ClassSubjectTeacher,
} = require("../models");
const { Op } = require("sequelize");

module.exports = {
  // ✅ Create new report card format
  createFormat: async (req, res) => {
    try {
      const {
        title,
        header_html,
        footer_html,
        school_logo_url,
        board_logo_url,
        class_ids,
      } = req.body;

      // 🔁 Step 1: Remove any previous mappings for these classes
      await ReportCardFormatClass.destroy({
        where: {
          class_id: {
            [Op.in]: class_ids,
          },
        },
      });

      // ✅ Step 2: Create the new format
      const format = await ReportCardFormat.create({
        title,
        header_html,
        footer_html,
        school_logo_url,
        board_logo_url,
      });

      // ✅ Step 3: Assign selected classes to this new format
      const mappingRows = class_ids.map((class_id) => ({
        report_card_format_id: format.id,
        class_id,
      }));
      await ReportCardFormatClass.bulkCreate(mappingRows);

      res.status(201).json({
        message: "Report card format created successfully.",
        format_id: format.id,
      });
    } catch (error) {
      console.error("Error creating format:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  // ✅ Get all formats (admin/coordinator)
  getAllFormats: async (req, res) => {
    try {
      const formats = await ReportCardFormat.findAll({
        include: [
          {
            model: Class,
            as: "classes",
            attributes: ["id", "class_name"],
            through: { attributes: [] },
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      res.json(formats);
    } catch (error) {
      console.error("Error fetching formats:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  // ✅ Get format by class (for printing)
  getFormatByClass: async (req, res) => {
    try {
      const { class_id } = req.query;
      if (!class_id) {
        return res.status(400).json({ message: "class_id is required" });
      }

      const mapping = await ReportCardFormatClass.findOne({
        where: { class_id },
        include: {
          model: ReportCardFormat,
          as: "format",
        },
      });

      if (!mapping || !mapping.format) {
        return res.status(404).json({ message: "No format found for this class" });
      }

      res.json(mapping.format);
    } catch (error) {
      console.error("Error fetching format by class:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  // ✅ Get all classes (for dropdown)
  getAssignedClasses: async (req, res) => {
    try {
      const authUser = req.authUser || req.user;
      const userRoles = authUser.roles || [];

      const allowedRoles = ["academic_coordinator", "teacher", "admin", "superadmin"];
      const hasAccess = userRoles.some((role) => allowedRoles.includes(role));

      if (!hasAccess) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const classes = await Class.findAll({
        order: [["class_name", "ASC"]],
      });

      const formatted = classes.map((cls) => ({
        class_id: cls.id,
        class_name: cls.class_name,
        label: cls.class_name,
      }));

      return res.json(formatted);
    } catch (error) {
      console.error("Error fetching assigned classes:", error);
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  },

  // ✅ Update existing format
  updateFormat: async (req, res) => {
    try {
      const formatId = req.params.id;
      const {
        title,
        header_html,
        footer_html,
        school_logo_url,
        board_logo_url,
        class_ids = [],
      } = req.body;

      const format = await ReportCardFormat.findByPk(formatId);
      if (!format) {
        return res.status(404).json({ message: "Format not found" });
      }

      // 🔁 Step 1: Remove this format’s previous class mappings
      await ReportCardFormatClass.destroy({
        where: { report_card_format_id: formatId },
      });

      // 🔁 Step 2: Remove any class mappings (from other formats) for the same classes
      await ReportCardFormatClass.destroy({
        where: {
          class_id: { [Op.in]: class_ids },
          report_card_format_id: { [Op.ne]: formatId },
        },
      });

      // ✅ Step 3: Update the format
      await format.update({
        title,
        header_html,
        footer_html,
        school_logo_url,
        board_logo_url,
      });

      // ✅ Step 4: Create new class mappings
      const newMappings = class_ids.map((class_id) => ({
        report_card_format_id: formatId,
        class_id,
      }));
      await ReportCardFormatClass.bulkCreate(newMappings);

      res.json({ message: "Format updated successfully." });
    } catch (error) {
      console.error("Error updating format:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  // ✅ Delete a format and its class mappings
  deleteFormat: async (req, res) => {
    try {
      const formatId = req.params.id;

      const format = await ReportCardFormat.findByPk(formatId);
      if (!format) {
        return res.status(404).json({ message: "Format not found" });
      }

      await ReportCardFormatClass.destroy({
        where: { report_card_format_id: formatId },
      });

      await format.destroy();

      res.json({ message: "Format deleted successfully." });
    } catch (error) {
      console.error("Error deleting format:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
};

