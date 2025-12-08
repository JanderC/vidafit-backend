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
const clientProductRoutes = require('./src/routes/clientProductRoutes');
const productAssignmentRoutes = require('./src/routes/productAssignmentRoutes');

const app = express();

// Lista de orígenes permitidos
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://vidafit-frontend.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean); // Elimina valores undefined

// Configuración de CORS
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir peticiones sin origin (como Postman o apps móviles)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
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
      sales: '/api/sales',
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
app.use('/api/sales', clientProductRoutes);
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║     🏋️  VIDA FIT API Server 🏋️       ║
  ╠═══════════════════════════════════════╣
  ║  Server running on port: ${PORT}       ║
  ║  Environment: ${process.env.NODE_ENV || 'development'}           ║
  ║  CORS enabled for:                    ║
  ${allowedOrigins.map(o => `  ║  - ${o}`).join('\n')}
  ╚═══════════════════════════════════════╝
  `);
  
  console.log(`✅ Server started successfully`);
  console.log(`📍 URL: http://0.0.0.0:${PORT}`);
});

module.exports = app;