// chatUploadRoutes.js
const express = require("express");
const multer = require("multer");
const path = require("path");

const router = express.Router();

// Configure storage for chat file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Store uploaded chat files in the "chat_uploads" folder
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    // Generate a unique filename using Date.now() and the original filename
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// POST /chat/upload route to handle chat file uploads
router.post("/", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded." });
  }
  // Return the URL to access the uploaded file
  res.json({ fileUrl: `/uploads/${req.file.filename}` });
});

module.exports = router;
