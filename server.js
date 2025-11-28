const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Routes
const authRoutes = require('./src/routes/authRoutes');
const clientRoutes = require('./src/routes/clientRoutes');
const membershipRoutes = require('./src/routes/membershipRoutes');
const planRoutes = require('./src/routes/planRoutes');
const productRoutes = require('./src/routes/productRoutes');
const checkinRoutes = require('./src/routes/checkinRoutes');
const clientProductRoutes = require('./src/routes/clientProductRoutes');
const fingerprintRoutes = require('./src/routes/fingerprintRoutes');
const productAssignmentRoutes = require('./src/routes/productAssignmentRoutes');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' })); // Para base64 de imágenes y huellas
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'VIDA FIT API Server Running',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/products', productRoutes);
app.use('/api/checkins', checkinRoutes);
app.use('/api/sales', clientProductRoutes);
app.use('/api/fingerprint', fingerprintRoutes);
app.use('/api/product-assignments', productAssignmentRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║     🏋️  VIDA FIT API Server 🏋️       ║
  ╠═══════════════════════════════════════╣
  ║  Server running on port: ${PORT}       ║
  ║  Environment: ${process.env.NODE_ENV || 'development'}           ║
  ║  Time: ${new Date().toLocaleString('es-DO')}  ║
  ║  Fingerprint: 👆 Enabled              ║
  ╚═══════════════════════════════════════╝
  `);
});

module.exports = app;