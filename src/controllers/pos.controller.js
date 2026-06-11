const posService = require('../services/pos.service');
const { asyncHandler } = require('./queries.controller');

const getAll = asyncHandler(async (req, res) => {
  const pos = await posService.getAllPOs();
  res.status(200).json({ success: true, data: pos });
});

const create = asyncHandler(async (req, res) => {
  const { project_name, owners } = req.body;
  if (!project_name || !owners) {
    return res.status(400).json({ success: false, error: 'Project name and owners are required' });
  }
  
  const newPO = await posService.createPO({ project_name, owners });
  res.status(201).json({ success: true, data: newPO });
});

const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { project_name, owners } = req.body;
  if (!project_name || !owners) {
    return res.status(400).json({ success: false, error: 'Project name and owners are required' });
  }

  const updated = await posService.updatePO(id, { project_name, owners });
  
  if (!updated) return res.status(404).json({ success: false, error: 'PO not found' });
  res.status(200).json({ success: true, data: updated });
});

const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await posService.deletePO(id);
  
  if (!deleted) return res.status(404).json({ success: false, error: 'PO not found' });
  res.status(200).json({ success: true, data: { message: 'PO deleted' } });
});

module.exports = {
  getAll,
  create,
  update,
  remove
};
