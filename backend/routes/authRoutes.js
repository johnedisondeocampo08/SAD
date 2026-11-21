const express = require('express');
const {
  getAuthStatus,
  getCurrentOwner,
  initializeOwners,
  signIn,
  signOut,
  requestPasswordRecovery
} = require('../controllers/authController');
const { requireOwner } = require('../middleware/requireOwner');

const router = express.Router();

router.get('/status', getAuthStatus);
router.get('/me', requireOwner, getCurrentOwner);
router.post('/setup', initializeOwners);
router.post('/signin', signIn);
router.post('/signout', requireOwner, signOut);
router.post('/recovery', requestPasswordRecovery);

module.exports = router;
