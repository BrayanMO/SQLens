// File: src/controllers/teams.controller.js
const teamsService = require('../services/teams.service');
const { asyncHandler } = require('./queries.controller');

const getAll = asyncHandler(async (req, res) => {
  const teams = await teamsService.getAllTeams();
  res.status(200).json({ success: true, data: teams });
});

const create = asyncHandler(async (req, res) => {
  const { name, icon, color, position } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name is required' });

  const newTeam = await teamsService.createTeam({ name, icon, color, position });
  res.status(201).json({ success: true, data: newTeam });
});

const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, icon, color, position } = req.body;
  const updated = await teamsService.updateTeam(id, { name, icon, color, position });

  if (!updated) return res.status(404).json({ success: false, error: 'Team not found' });
  res.status(200).json({ success: true, data: updated });
});

const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await teamsService.deleteTeam(id);

  if (!deleted) return res.status(404).json({ success: false, error: 'Team not found' });
  res.status(200).json({ success: true, data: { message: 'Team deleted' } });
});

module.exports = { getAll, create, update, remove };
