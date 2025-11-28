const express = require('express');
const router = express.Router();
const ClientController = require('../controllers/clientController');
const { authMiddleware } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// CRUD básico
router.get('/', ClientController.getAll);
router.get('/:id', ClientController.getById);
router.post('/', ClientController.create);
router.put('/:id', ClientController.update);
router.delete('/:id', ClientController.delete);

// Búsquedas especiales
router.get('/cedula/:cedula', ClientController.findByCedula);
router.post('/fingerprint/search', ClientController.findByFingerprint);

// Actualización de huella
router.put('/:id/fingerprint', ClientController.updateFingerprint);

module.exports = router;