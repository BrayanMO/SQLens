const express = require('express');
const router = express.Router();
const posController = require('../controllers/pos.controller');

router.get('/', posController.getAll);
router.post('/', posController.create);
router.put('/:id', posController.update);
router.delete('/:id', posController.remove);

module.exports = router;
