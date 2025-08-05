const { Incharge, User, Class, Section, Student } = require('../models');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;



// Assign an incharge
exports.assignIncharge = async (req, res) => {
  try {
    const { classId, sectionId, teacherId, confirm } = req.body;

    // Check if the teacher exists and has the "Teacher" role
    // const teacher = await User.findOne({ where: { id: teacherId, role: 'Teacher' } });
    const teacher = await User.findOne({
      where: { id: teacherId },
      include: {
        association: 'roles',
        where: { slug: 'teacher' },
        required: true,
        attributes: [],
      },
    });

    if (!teacher) {
      return res.status(400).json({ message: 'Invalid Teacher ID or the user is not a teacher' });
    }

    // Check if the class and section exist
    const classExists = await Class.findByPk(classId);
    const sectionExists = await Section.findByPk(sectionId);
    if (!classExists || !sectionExists) {
      return res.status(400).json({ message: 'Invalid Class or Section' });
    }

    // Check if an incharge record with the same class, section, and teacher already exists
    const duplicate = await Incharge.findOne({ where: { classId, sectionId } });
    if (duplicate && !confirm) {
      // If duplicate exists and confirmation is not provided, ask for confirmation
      return res.status(409).json({
        message: 'An incharge record for this teacher, class, and section already exists. Please confirm to create duplicate record by sending confirm:true in your request.'
      });
    }

    // If confirm is provided or no duplicate exists, proceed with creating the record
    const incharge = await Incharge.create({ classId, sectionId, teacherId });
    res.status(201).json({ message: 'Incharge assigned successfully', incharge });
    
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};


// Get all incharges
// Get all incharges
exports.getAllIncharges = async (req, res) => {
    try {
      const incharges = await Incharge.findAll({
        include: [
          { model: User, as: 'Teacher', attributes: ['id', 'name', 'email'] }, // Fixed alias
          { model: Class, attributes: ['id', 'class_name'] },
          { model: Section, attributes: ['id', 'section_name'] }
        ]
      });
      res.json(incharges);
    } catch (error) {
      res.status(500).json({ message: 'Server Error', error: error.message });
    }
  };

  // Update an incharge
exports.updateIncharge = async (req, res) => {
    try {
      const { id } = req.params;
      const { classId, sectionId, teacherId } = req.body;
  
      // Check if the incharge exists
      const incharge = await Incharge.findByPk(id);
      if (!incharge) {
        return res.status(404).json({ message: 'Incharge not found' });
      }
  
      // Check if the teacher exists and has the "Teacher" role
      // const teacher = await User.findOne({ where: { id: teacherId, role: 'Teacher' } });
      const teacher = await User.findOne({
        where: { id: teacherId },
        include: {
          association: 'roles',
          where: { slug: 'teacher' },
          attributes: [], // No need to return role data
        },
      });

      if (!teacher) {
        return res.status(400).json({ message: 'Invalid Teacher ID or the user is not a teacher' });
      }
  
      // Check if the class and section exist
      const classExists = await Class.findByPk(classId);
      const sectionExists = await Section.findByPk(sectionId);
      if (!classExists || !sectionExists) {
        return res.status(400).json({ message: 'Invalid Class or Section' });
      }
  
      // Update the incharge assignment
      await incharge.update({ classId, sectionId, teacherId });
  
      res.status(200).json({ message: 'Incharge updated successfully', incharge });
  
    } catch (error) {
      res.status(500).json({ message: 'Server Error', error: error.message });
    }
  };
  
  

// Remove an incharge
exports.removeIncharge = async (req, res) => {
  try {
    const { id } = req.params;
    const incharge = await Incharge.findByPk(id);
    if (!incharge) {
      return res.status(404).json({ message: 'Incharge not found' });
    }

    await incharge.destroy();
    res.json({ message: 'Incharge removed successfully' });

  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};


// Get list of students for the logged-in teacher (incharge)
// Get list of students for the logged-in teacher (incharge)
exports.getStudentsForIncharge = async (req, res) => {
  try {
    // Assuming the authenticated teacher's id is available in req.user.id
    const teacherId = req.user.id;
    
    // Retrieve all incharge assignments for this teacher
    const inchargeAssignments = await Incharge.findAll({
      where: { teacherId },
      attributes: ['classId', 'sectionId']
    });

    if (!inchargeAssignments || inchargeAssignments.length === 0) {
      return res.status(404).json({ message: 'No incharge assignments found for this teacher' });
    }

    // Extract unique (classId, sectionId) pairs
    const uniquePairs = [];
    const seen = new Set();

    inchargeAssignments.forEach(assignment => {
      const key = `${assignment.classId}-${assignment.sectionId}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniquePairs.push({ classId: assignment.classId, sectionId: assignment.sectionId });
      }
    });

    // Build an array of OR conditions for each (class_id, section_id) pair
    const whereConditions = uniquePairs.map(pair => ({
      class_id: pair.classId,
      section_id: pair.sectionId
    }));

    // Retrieve students that match any of the (class_id, section_id) pairs and have status "enabled"
    const students = await Student.findAll({
      where: {
        status: "enabled",
        [Op.or]: whereConditions
      }
    });

    res.status(200).json({ students });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
