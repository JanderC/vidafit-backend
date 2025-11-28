const express = require('express');
const router = express.Router();
const CheckInController = require('../controllers/checkInController');
const { authMiddleware } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Check-ins
router.post('/', CheckInController.create);
router.post('/fingerprint', CheckInController.checkinByFingerprint);
router.post('/cedula', CheckInController.checkinByCedula);

// Consultas
router.get('/', CheckInController.getAll);
router.get('/today', CheckInController.getTodayCount);
router.get('/stats', CheckInController.getStats);
router.get('/client/:clientId', CheckInController.getByClient);

module.exports = router;