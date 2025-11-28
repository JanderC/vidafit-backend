const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/productController');
const { authMiddleware } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// CRUD básico
router.get('/', ProductController.getAll);
router.get('/categories', ProductController.getCategories);
router.get('/low-stock', ProductController.getLowStock);
router.get('/:id', ProductController.getById);
router.post('/', ProductController.create);
router.put('/:id', ProductController.update);
router.put('/:id/stock', ProductController.updateStock);
router.delete('/:id', ProductController.delete);

module.exports = router;