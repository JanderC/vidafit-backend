const express = require('express');
const router = express.Router();
const PlanController = require('../controllers/planController');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// CRUD básico
router.get('/', PlanController.getAll);
router.get('/:id', PlanController.getById);

// Solo admin puede crear, editar y eliminar planes
router.post('/', adminOnly, PlanController.create);
router.put('/:id', adminOnly, PlanController.update);
router.delete('/:id', adminOnly, PlanController.delete);

module.exports = router;