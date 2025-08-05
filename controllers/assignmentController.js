const { Assignment, AssignmentFile, Subject } = require('../models');

// Create a new assignment with file uploads
exports.createAssignment = async (req, res) => {
  try {
    console.log("Request body:", req.body); // Debug log
    const { title, content, youtubeUrl, subjectId } = req.body;

    // Simple validation check - subjectId is required along with title and content.
    if (!title || !content || !subjectId) {
      return res.status(400).json({ error: "Title, content, and subject are required." });
    }

    // Use logged-in teacher's id from req.user
    const teacherId = req.user.id;
    
    // Create the assignment record with subjectId
    const assignment = await Assignment.create({ teacherId, subjectId, title, content, youtubeUrl });
    
    // If files are uploaded, create records in AssignmentFiles table with an absolute URL
    if (req.files && req.files.length > 0) {
      const filesData = req.files.map(file => ({
        assignmentId: assignment.id,
        fileName: file.originalname,
        // Construct a full URL for the uploaded file
        filePath: `${req.protocol}://${req.get('host')}/${file.path}`
      }));
      await AssignmentFile.bulkCreate(filesData);
    }
    
    // Emit socket event for real-time updates
    const io = req.app.get('socketio');
    io.emit('assignment_update', assignment);
    
    res.status(201).json({ message: 'Assignment created successfully', assignment });
  } catch (error) {
    console.error("Error creating assignment:", error.stack);
    res.status(500).json({ error: error.message });
  }
};

// Get all assignments with associated files and subject details
exports.getAssignments = async (req, res) => {
  try {
    const assignments = await Assignment.findAll({
      include: [
        {
          model: AssignmentFile,
          as: 'AssignmentFiles'
        },
        {
          model: Subject,
          as: 'subject'
        }
      ]
    });
    res.status(200).json({ assignments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a single assignment by its ID including files and subject details
exports.getAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const assignment = await Assignment.findByPk(id, {
      include: [
        {
          model: AssignmentFile,
          as: 'AssignmentFiles'
        },
        {
          model: Subject,
          as: 'Subject'
        }
      ]
    });
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    res.status(200).json({ assignment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update an assignment by its ID
exports.updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, youtubeUrl, subjectId, existingFiles } = req.body;
    
    // Find the assignment along with its current attachments
    const assignment = await Assignment.findByPk(id, {
      include: [
        { model: AssignmentFile, as: 'AssignmentFiles' }
      ]
    });
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Update assignment details
    await assignment.update({ title, content, youtubeUrl, subjectId });

    // Process attachment updates:
    // Parse the list of file IDs that the user wants to keep
    const keepIds = existingFiles ? JSON.parse(existingFiles) : [];
    
    // Delete attachments that are not in the list to keep
    for (const file of assignment.AssignmentFiles) {
      if (!keepIds.includes(file.id)) {
        await file.destroy();
        // Optionally: delete the physical file here, if needed.
      }
    }

    // If new files are uploaded, add them as new attachments
    if (req.files && req.files.length > 0) {
      const filesData = req.files.map(file => ({
        assignmentId: assignment.id,
        fileName: file.originalname,
        // Construct a full URL for the uploaded file
        filePath: `${req.protocol}://${req.get('host')}/${file.path}`
      }));
      await AssignmentFile.bulkCreate(filesData);
    }

    // Fetch the updated assignment including its attachments and subject details
    const updatedAssignment = await Assignment.findByPk(id, {
      include: [
        { model: AssignmentFile, as: 'AssignmentFiles' },
        { model: Subject, as: 'subject' }
      ]
    });

    // Emit socket event for real-time updates
    const io = req.app.get('socketio');
    io.emit('assignment_update', updatedAssignment);

    res.status(200).json({ message: 'Assignment updated successfully', assignment: updatedAssignment });
  } catch (error) {
    console.error("Error updating assignment:", error.stack);
    res.status(500).json({ error: error.message });
  }
};

// Delete an assignment by its ID
exports.deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const assignment = await Assignment.findByPk(id);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    await assignment.destroy();
    res.status(200).json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createAssignmentSingle = async (req, res) => {
  try {
    console.log("Request body:", req.body);
    const { title, content, youtubeUrl, subjectId } = req.body;

    // Validate required fields
    if (!title || !content || !subjectId) {
      return res.status(400).json({ error: "Title, content, and subject are required." });
    }

    // Use logged-in teacher's id from req.user
    const teacherId = req.user.id;
    
    // Create the assignment record
    const assignment = await Assignment.create({ teacherId, subjectId, title, content, youtubeUrl });
    
    // If a file is uploaded, create a record in AssignmentFiles table
    if (req.file) {
      const fileData = {
        assignmentId: assignment.id,
        fileName: req.file.originalname,
        // Construct a full URL for the uploaded file
        filePath: `${req.protocol}://${req.get('host')}/${req.file.path}`
      };
      await AssignmentFile.create(fileData);
    }
    
    // Emit socket event for real-time updates
    const io = req.app.get('socketio');
    io.emit('assignment_update', assignment);
    
    return res.status(201).json({ message: 'Assignment created successfully', assignment });
  } catch (error) {
    console.error("Error creating assignment with single file:", error.stack);
    return res.status(500).json({ error: error.message });
  }
};

