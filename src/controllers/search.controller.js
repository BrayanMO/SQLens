// File: src/controllers/search.controller.js
const searchService = require('../services/search.service');
const aiService = require('../services/ai.service');
const { searchSchema } = require('../validators/query.validator');
const { asyncHandler } = require('./queries.controller'); // Reusing the utility

const search = asyncHandler(async (req, res) => {
  // Validate request body
  const { error, value } = searchSchema.validate(req.body, { abortEarly: false });
  if (error) {
    throw error;
  }

  const results = await searchService.searchDatabase(value.query);

  res.status(200).json({
    success: true,
    data: results
  });
});

const smartSearch = asyncHandler(async (req, res) => {
  // Validate request body
  const { error, value } = searchSchema.validate(req.body, { abortEarly: false });
  if (error) {
    throw error;
  }

  // Step 1: Run ILIKE search
  const dbResults = await searchService.searchDatabase(value.query);

  if (dbResults.length > 0) {
    return res.status(200).json({
      success: true,
      data: {
        source: 'database',
        results: dbResults
      }
    });
  }

  // Step 2: If 0 results -> call AI
  // Step 2.1: Get schema context from existing queries
  const schemaContext = await require('../services/queries.service').getKnownTablesSummary();

  const aiResult = await aiService.generateAISqlSuggestion(value.query, schemaContext);

  // Step 3 is handled by ai.service throwing an error, caught by asyncHandler -> errorHandler

  return res.status(200).json({
    success: true,
    data: {
      source: 'ai',
      disclaimer: 'AI-generated based on existing tables',
      suggestion: aiResult
    }
  });
});

const chat = asyncHandler(async (req, res) => {
  const { message, history } = req.body;
  if (!message) return res.status(400).json({ success: false, error: 'Message is required' });

  const aiResponse = await aiService.chatGeneral(message, history || []);
  res.status(200).json({ success: true, data: aiResponse });
});

const generateMetadata = asyncHandler(async (req, res) => {
  if (!req.body.sql_query) {
    return res.status(400).json({ success: false, error: 'sql_query is required para autocompletar' });
  }

  const metadata = await aiService.generateMetadataFromSql(req.body.sql_query);
  res.status(200).json({ success: true, data: metadata });
});

const suggestMetadata = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name is required' });

  const metadata = await aiService.suggestModuleMetadata(name);
  res.status(200).json({ success: true, data: metadata });
});

module.exports = {
  search,
  smartSearch,
  chat,
  generateMetadata,
  suggestMetadata
};
