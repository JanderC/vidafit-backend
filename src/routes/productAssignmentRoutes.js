const express = require('express');
const router = express.Router();
const ProductAssignmentController = require('../controllers/productAssignmentController');
const { authMiddleware } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas principales
router.get('/', ProductAssignmentController.getAll);
router.get('/client/:clientId', ProductAssignmentController.getByClient);
router.get('/pending', ProductAssignmentController.getPending);
router.get('/stats', ProductAssignmentController.getStats);

router.post('/', ProductAssignmentController.create);

router.put('/:id/pay', ProductAssignmentController.markAsPaid);
router.put('/:id/cancel', ProductAssignmentController.cancel);

module.exports = router;