const { Product } = require('../models');

class ProductController {
  static async getAll(req, res) {
    try {
      const { activo, categoria, search } = req.query;
      const filters = {};

      if (activo !== undefined) {
        filters.activo = activo === 'true';
      }

      if (categoria) {
        filters.categoria = categoria;
      }

      if (search) {
        filters.search = search;
      }

      const products = await Product.getAll(filters);

      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      console.error('Error al obtener productos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener productos',
        error: error.message
      });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const product = await Product.findById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error('Error al obtener producto:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener producto',
        error: error.message
      });
    }
  }

  static async create(req, res) {
    try {
      const productData = req.body;
      const product = await Product.create(productData);

      res.status(201).json({
        success: true,
        message: 'Producto creado exitosamente',
        data: product
      });
    } catch (error) {
      console.error('Error al crear producto:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear producto',
        error: error.message
      });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const productData = req.body;

      const existingProduct = await Product.findById(id);
      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      const updatedProduct = await Product.update(id, productData);

      res.json({
        success: true,
        message: 'Producto actualizado exitosamente',
        data: updatedProduct
      });
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar producto',
        error: error.message
      });
    }
  }

  static async updateStock(req, res) {
    try {
      const { id } = req.params;
      const { quantity } = req.body;

      const existingProduct = await Product.findById(id);
      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      const updatedProduct = await Product.updateStock(id, quantity);

      res.json({
        success: true,
        message: 'Stock actualizado exitosamente',
        data: updatedProduct
      });
    } catch (error) {
      console.error('Error al actualizar stock:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar stock',
        error: error.message
      });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;

      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      await Product.delete(id);

      res.json({
        success: true,
        message: 'Producto eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar producto',
        error: error.message
      });
    }
  }

  static async getLowStock(req, res) {
    try {
      const { threshold } = req.query;
      const products = await Product.getLowStock(threshold ? parseInt(threshold) : 10);

      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      console.error('Error al obtener productos con stock bajo:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener productos con stock bajo',
        error: error.message
      });
    }
  }

  static async getCategories(req, res) {
    try {
      const categories = await Product.getCategories();

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Error al obtener categorías:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener categorías',
        error: error.message
      });
    }
  }
}

module.exports = ProductController;