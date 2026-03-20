// File: src/routes/queries.routes.js
const express = require('express');
const router = express.Router();
const queriesController = require('../controllers/queries.controller');

router.post('/', queriesController.createQuery);
router.get('/', queriesController.getQueries);
router.get('/:id', queriesController.getQueryById);
router.put('/:id', queriesController.updateQuery);
router.delete('/:id', queriesController.deleteQuery);

module.exports = router;
