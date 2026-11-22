const express = require('express');
const { createBookingRequest, listBookingRequests, reviewBookingRequest } = require('../controllers/bookingRequestController');
const { requireOwner } = require('../middleware/requireOwner');
const requireBookingToken = require('../middleware/requireBookingToken');

const router = express.Router();

router.post('/', requireBookingToken, createBookingRequest);
router.get('/', requireOwner, listBookingRequests);
router.patch('/:requestId/review', requireOwner, reviewBookingRequest);

module.exports = router;
