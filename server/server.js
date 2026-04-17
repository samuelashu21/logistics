const http = require('http');
const path = require('path');
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Load env vars
dotenv.config();

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const socketManager = require('./utils/socketManager');

// Route files
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const vehicleRoutes = require('./routes/vehicles');
const driverRoutes = require('./routes/drivers');
const orderRoutes = require('./routes/orders');
const advertisementRoutes = require('./routes/advertisements');
const reviewRoutes = require('./routes/reviews');
const notificationRoutes = require('./routes/notifications');
const trackingRoutes = require('./routes/tracking');
const reportRoutes = require('./routes/reports');

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false, // Disabling CSP temporarily helps debug Socket issues
})); 
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/vehicles', vehicleRoutes);
app.use('/api/v1/drivers', driverRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/advertisements', advertisementRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/tracking', trackingRoutes);
app.use('/api/v1/reports', reportRoutes);

// Error handler
app.use(errorHandler);

// Create HTTP server and initialize Socket.io
const server = http.createServer(app);
socketManager.init(server);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
