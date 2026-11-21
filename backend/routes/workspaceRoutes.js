const express = require('express');
const { getWorkspace, saveWorkspace } = require('../controllers/workspaceController');
const { requireOwner } = require('../middleware/requireOwner');

const router = express.Router();

router.use(requireOwner);
router.get('/', getWorkspace);
router.put('/', saveWorkspace);

module.exports = router;
