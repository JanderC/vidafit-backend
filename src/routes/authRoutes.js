const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

// Rutas públicas
router.post('/login', AuthController.login);
router.post('/register', AuthController.register);

// Rutas protegidas
router.get('/profile', authMiddleware, AuthController.getProfile);
router.put('/password', authMiddleware, AuthController.updatePassword);

module.exports = router;