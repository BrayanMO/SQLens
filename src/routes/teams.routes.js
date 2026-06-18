// File: src/routes/teams.routes.js
const express = require('express');
const router = express.Router();
const teamsController = require('../controllers/teams.controller');

router.get('/', teamsController.getAll);
router.post('/', teamsController.create);
router.put('/:id', teamsController.update);
router.delete('/:id', teamsController.remove);

module.exports = router;
