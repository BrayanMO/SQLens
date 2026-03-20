// File: src/routes/modules.routes.js
const express = require('express');
const router = express.Router();
const modulesController = require('../controllers/modules.controller');

router.get('/', modulesController.getAll);
router.post('/', modulesController.create);
router.put('/:id', modulesController.update);
router.delete('/:id', modulesController.remove);

module.exports = router;
