// File: src/controllers/queries.controller.js
const queriesService = require('../services/queries.service');
const { createQuerySchema, updateQuerySchema } = require('../validators/query.validator');

/**
 * Utility to wrap async controllers to avoid try/catch blocks everywhere
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const createQuery = asyncHandler(async (req, res) => {
  // Validate request body
  const { error, value } = createQuerySchema.validate(req.body, { abortEarly: false });
  if (error) {
    throw error; // Will be caught by errorHandler and formatted
  }

  const newQuery = await queriesService.createQuery(value);
  res.status(201).json({
    success: true,
    data: newQuery
  });
});

const getQueries = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;

  const result = await queriesService.getQueries(page, limit);
  res.status(200).json({
    success: true,
    data: result.data,
    meta: result.meta
  });
});

const getQueryById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const query = await queriesService.getQueryById(id);

  if (!query) {
    return res.status(404).json({
      success: false,
      error: 'Query not found'
    });
  }

  res.status(200).json({
    success: true,
    data: query
  });
});

const deleteQuery = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await queriesService.deleteQuery(id);

  if (!deleted) {
    return res.status(404).json({
      success: false,
      error: 'Query not found'
    });
  }

  res.status(200).json({
    success: true,
    data: { message: 'Query deleted successfully' }
  });
});

const updateQuery = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { error, value } = updateQuerySchema.validate(req.body, { abortEarly: false });
  if (error) throw error;

  const updatedQuery = await queriesService.updateQuery(id, value);

  if (!updatedQuery) {
    return res.status(404).json({ success: false, error: 'Query not found or no valid fields provided' });
  }

  res.status(200).json({
    success: true,
    data: updatedQuery
  });
});

module.exports = {
  createQuery,
  getQueries,
  getQueryById,
  updateQuery,
  deleteQuery,
  asyncHandler
};
