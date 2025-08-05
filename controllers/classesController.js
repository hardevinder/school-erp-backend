const { Class } = require("../models"); // Import initialized Class model

exports.getAllClasses = async (req, res) => {
  const classes = await Class.findAll();
  res.json(classes);
};

exports.addClass = async (req, res) => {
  const { class_name, section } = req.body;
  const newClass = await Class.create({ class_name, section });
  res.status(201).json(newClass);
};

exports.getClassById = async (req, res) => {
  const classItem = await Class.findByPk(req.params.id);
  if (!classItem) return res.status(404).send("Class not found");
  res.json(classItem);
};

exports.updateClass = async (req, res) => {
  const { class_name, section } = req.body;
  const classItem = await Class.findByPk(req.params.id);
  if (!classItem) return res.status(404).send("Class not found");
  await classItem.update({ class_name, section });
  res.json(classItem);
};

exports.deleteClass = async (req, res) => {
  const classItem = await Class.findByPk(req.params.id);
  if (!classItem) return res.status(404).send("Class not found");
  await classItem.destroy();
  res.send("Class deleted successfully");
};
