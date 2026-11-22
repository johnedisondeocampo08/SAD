
const express = require('express');
const customerRoutes = require('./routes/customerRoutes');
const authRoutes = require('./routes/authRoutes');
const workspaceRoutes = require('./routes/workspaceRoutes');
const bookingRequestRoutes = require('./routes/bookingRequestRoutes');
const initializeDatabase = require('./services/initializeDatabase');

const app = express();
const PORT = Number(process.env.PORT || 5000);

// Allow the server to receive JSON data
app.use(express.json({ limit: '2mb' }));

// Test API endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Simula Studio Backend is Running!'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/workspace', workspaceRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/booking-requests', bookingRequestRoutes);

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Simula Studio server running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Unable to initialize the Simula Studio database:', error);
    process.exitCode = 1;
  });
