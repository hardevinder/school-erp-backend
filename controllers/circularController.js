const { Circular } = require('../models');

// Create a new circular with file uploads and audience selection
exports.createCircular = async (req, res) => {
  try {
    console.log("Request body:", req.body); // Debug log
    const { title, content, audience } = req.body;

    // Validate required fields
    if (!title || !content || !audience) {
      return res.status(400).json({ error: "Title, content, and audience are required." });
    }
    if (!["teacher", "student", "both"].includes(audience)) {
      return res.status(400).json({ error: "Invalid audience." });
    }

    // Create the circular record
    let fileUrl = null;
    if (req.file) {
      // Construct a full URL for the uploaded file.
      // This works because your multer configuration saves the file with its original extension.
      fileUrl = `${req.protocol}://${req.get('host')}/${req.file.path}`;
    }
    const circular = await Circular.create({ title, description: content, fileUrl, audience });

    // Emit socket event for real‑time updates
    const io = req.app.get('socketio');
    if (io) {
      const payload = { circular };
      if (audience === "student" || audience === "both") io.to("students").emit("newCircular", payload);
      if (audience === "teacher" || audience === "both") io.to("teachers").emit("newCircular", payload);
    }

    res.status(201).json({ message: 'Circular created successfully', circular });
  } catch (error) {
    console.error("Error creating circular:", error.stack);
    res.status(500).json({ error: error.message });
  }
};

// Retrieve all circulars
exports.getCirculars = async (req, res) => {
  try {
    const circulars = await Circular.findAll();
    res.status(200).json({ circulars });
  } catch (error) {
    console.error("Error retrieving circulars:", error.stack);
    res.status(500).json({ error: error.message });
  }
};

// Update a circular by its ID
exports.updateCircular = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, audience } = req.body;

    // Validate required fields
    if (!title || !content || !audience) {
      return res.status(400).json({ error: "Title, content, and audience are required." });
    }
    if (!["teacher", "student", "both"].includes(audience)) {
      return res.status(400).json({ error: "Invalid audience." });
    }

    const circular = await Circular.findByPk(id);
    if (!circular) {
      return res.status(404).json({ error: "Circular not found." });
    }

    // Retain the previous fileUrl if no new file is uploaded; update if available
    let fileUrl = circular.fileUrl;
    if (req.file) {
      fileUrl = `${req.protocol}://${req.get('host')}/${req.file.path}`;
    }

    await circular.update({ title, description: content, audience, fileUrl });

    // Emit socket event for real‑time update notifications
    const io = req.app.get('socketio');
    if (io) {
      const payload = { circular };
      if (audience === "student" || audience === "both") io.to("students").emit("circularUpdated", payload);
      if (audience === "teacher" || audience === "both") io.to("teachers").emit("circularUpdated", payload);
    }

    res.status(200).json({ message: "Circular updated successfully", circular });
  } catch (error) {
    console.error("Error updating circular:", error.stack);
    res.status(500).json({ error: error.message });
  }
};

// Delete a circular by its ID
exports.deleteCircular = async (req, res) => {
  try {
    const { id } = req.params;
    const circular = await Circular.findByPk(id);
    if (!circular) {
      return res.status(404).json({ error: "Circular not found." });
    }
    const audience = circular.audience;
    await circular.destroy();

    // Emit socket event for deletion notifications
    const io = req.app.get('socketio');
    if (io) {
      if (audience === "student" || audience === "both") io.to("students").emit("circularDeleted", { id });
      if (audience === "teacher" || audience === "both") io.to("teachers").emit("circularDeleted", { id });
    }

    res.status(200).json({ message: "Circular deleted successfully" });
  } catch (error) {
    console.error("Error deleting circular:", error.stack);
    res.status(500).json({ error: error.message });
  }
};
