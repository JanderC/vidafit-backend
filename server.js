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
//const checkinRoutes = require('./src/routes/checkinRoutes');
const clientProductRoutes = require('./src/routes/clientProductRoutes');
//const fingerprintRoutes = require('./src/routes/fingerprintRoutes');
const productAssignmentRoutes = require('./src/routes/productAssignmentRoutes');

const app = express();

// Configuración de CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'https://vidafit-frontend.vercel.app',
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' })); // Para base64 de imágenes y huellas
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'VIDA FIT API Server Running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🏋️ VIDA FIT API - Server is running',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      clients: '/api/clients',
      memberships: '/api/memberships',
      plans: '/api/plans',
      products: '/api/products',
      checkins: '/api/checkins',
      sales: '/api/sales',
      fingerprint: '/api/fingerprint',
      productAssignments: '/api/product-assignments'
    }
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/products', productRoutes);
//app.use('/api/checkins', checkinRoutes);
app.use('/api/sales', clientProductRoutes);
//app.use('/api/fingerprint', fingerprintRoutes);
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

// Escuchar en 0.0.0.0 para Railway
app.listen(PORT, '0.0.0.0', () => {
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
  
  console.log(`✅ Server started successfully`);
  console.log(`📍 URL: http://0.0.0.0:${PORT}`);
});

module.exports = app;