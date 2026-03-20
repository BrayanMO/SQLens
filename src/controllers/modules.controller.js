// File: src/controllers/modules.controller.js
const modulesService = require('../services/modules.service');
const { asyncHandler } = require('./queries.controller');

const getAll = asyncHandler(async (req, res) => {
  const modules = await modulesService.getAllModules();
  res.status(200).json({ success: true, data: modules });
});

const create = asyncHandler(async (req, res) => {
  const { name, icon, color } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name is required' });
  
  const newModule = await modulesService.createModule({ name, icon, color });
  res.status(201).json({ success: true, data: newModule });
});

const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, icon, color } = req.body;
  const updated = await modulesService.updateModule(id, { name, icon, color });
  
  if (!updated) return res.status(404).json({ success: false, error: 'Module not found' });
  res.status(200).json({ success: true, data: updated });
});

const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await modulesService.deleteModule(id);
  
  if (!deleted) return res.status(404).json({ success: false, error: 'Module not found' });
  res.status(200).json({ success: true, data: { message: 'Module deleted' } });
});

module.exports = {
  getAll,
  create,
  update,
  remove
};
