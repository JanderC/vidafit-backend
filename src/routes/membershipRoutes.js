const express = require('express');
const router = express.Router();
const MembershipController = require('../controllers/membershipController');
const { authMiddleware } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// CRUD básico
router.get('/', MembershipController.getAll);
router.get('/:id', MembershipController.getById);
router.post('/', MembershipController.create);
router.put('/:id', MembershipController.update);

// Operaciones especiales
router.get('/client/:clientId', MembershipController.getByClient);
router.put('/:id/cancel', MembershipController.cancel);
router.put('/:id/suspend', MembershipController.suspend);
router.put('/:id/reactivate', MembershipController.reactivate);

module.exports = router;