// File: src/validators/query.validator.js
const Joi = require('joi');

const createQuerySchema = Joi.object({
  title: Joi.string().max(200).required(),
  sql_query: Joi.string().required(),
  context: Joi.string().max(2000).required(),
  tags: Joi.array().items(Joi.string().trim().allow('')).max(10).optional(),
  module: Joi.string().allow('', null).optional(),
  dev: Joi.string().max(100).allow('', null).optional()
});

const updateQuerySchema = Joi.object({
  title: Joi.string().max(200).optional(),
  sql_query: Joi.string().optional(),
  context: Joi.string().max(2000).optional(),
  tags: Joi.array().items(Joi.string().trim().allow('')).max(10).optional(),
  module: Joi.string().allow('', null).optional(),
  dev: Joi.string().max(100).allow('', null).optional()
});

const searchSchema = Joi.object({
  query: Joi.string().required().min(1)
});

module.exports = {
  createQuerySchema,
  updateQuerySchema,
  searchSchema
};
