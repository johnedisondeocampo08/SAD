const crypto = require('node:crypto');

function requireBookingToken(request, response, next) {
  const expectedToken = process.env.BOOKING_API_TOKEN;
  if (!expectedToken || expectedToken.length < 32) {
    return response.status(503).json({
      success: false,
      message: 'Booking intake is not configured. Set a strong BOOKING_API_TOKEN on the backend.'
    });
  }

  const authorization = request.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return response.status(401).json({ success: false, message: 'A valid bearer token is required.' });
  }

  const supplied = Buffer.from(match[1]);
  const expected = Buffer.from(expectedToken);
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
    return response.status(401).json({ success: false, message: 'A valid bearer token is required.' });
  }

  return next();
}

module.exports = requireBookingToken;
