const ProductAssignment = require('../models/productAssignment');
const { Client, Product } = require('../models');

class ProductAssignmentController {
  /**
   * Obtener todas las asignaciones de productos
   */
  static async getAll(req, res) {
    try {
      const { estado, cliente_id } = req.query;
      const filters = {};

      if (estado) {
        filters.estado = estado;
      }

      if (cliente_id) {
        filters.cliente_id = cliente_id;
      }

      const assignments = await ProductAssignment.getAll(filters);

      res.json({
        success: true,
        data: assignments
      });
    } catch (error) {
      console.error('Error al obtener asignaciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener asignaciones de productos',
        error: error.message
      });
    }
  }

  /**
   * Obtener asignaciones por cliente
   */
  static async getByClient(req, res) {
    try {
      const { clientId } = req.params;

      const assignments = await ProductAssignment.getByClient(clientId);
      const totalDebt = await ProductAssignment.getTotalDebt(clientId);

      res.json({
        success: true,
        data: {
          assignments,
          total_deuda: totalDebt
        }
      });
    } catch (error) {
      console.error('Error al obtener asignaciones del cliente:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener asignaciones del cliente',
        error: error.message
      });
    }
  }

  /**
   * Crear nueva asignación de producto (fiado o venta directa)
   */
  static async create(req, res) {
    try {
      const { cliente_id, producto_id, cantidad, estado_pago, notas } = req.body;

      // Validar que el cliente existe
      const client = await Client.findById(cliente_id);
      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      // Validar que el producto existe y obtener su precio
      const product = await Product.findById(producto_id);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      // Verificar stock suficiente
      if (product.stock < cantidad) {
        return res.status(400).json({
          success: false,
          message: `Stock insuficiente. Disponible: ${product.stock}`
        });
      }

      // Crear la asignación
      const assignmentData = {
        cliente_id,
        producto_id,
        cantidad: parseInt(cantidad),
        precio_unitario: parseFloat(product.precio),
        estado_pago: estado_pago || 'pendiente',
        notas
      };

      const assignment = await ProductAssignment.create(assignmentData);

      res.status(201).json({
        success: true,
        message: estado_pago === 'pagado' 
          ? 'Venta registrada exitosamente' 
          : 'Producto fiado registrado exitosamente',
        data: assignment
      });
    } catch (error) {
      console.error('Error al crear asignación:', error);
      res.status(500).json({
        success: false,
        message: error.message === 'Stock insuficiente' 
          ? 'Stock insuficiente' 
          : 'Error al crear asignación',
        error: error.message
      });
    }
  }

  /**
   * Marcar como pagado
   */
  static async markAsPaid(req, res) {
    try {
      const { id } = req.params;

      const assignment = await ProductAssignment.findById(id);
      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: 'Asignación no encontrada'
        });
      }

      if (assignment.estado_pago === 'pagado') {
        return res.status(400).json({
          success: false,
          message: 'Esta venta ya está marcada como pagada'
        });
      }

      if (assignment.estado_pago === 'cancelado') {
        return res.status(400).json({
          success: false,
          message: 'No se puede marcar como pagada una venta cancelada'
        });
      }

      const updatedAssignment = await ProductAssignment.markAsPaid(id);

      res.json({
        success: true,
        message: 'Pago registrado exitosamente',
        data: updatedAssignment
      });
    } catch (error) {
      console.error('Error al marcar como pagado:', error);
      res.status(500).json({
        success: false,
        message: 'Error al registrar el pago',
        error: error.message
      });
    }
  }

  /**
   * Cancelar asignación
   */
  static async cancel(req, res) {
    try {
      const { id } = req.params;

      const assignment = await ProductAssignment.findById(id);
      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: 'Asignación no encontrada'
        });
      }

      if (assignment.estado_pago === 'cancelado') {
        return res.status(400).json({
          success: false,
          message: 'Esta venta ya está cancelada'
        });
      }

      const canceledAssignment = await ProductAssignment.cancel(id);

      res.json({
        success: true,
        message: 'Venta cancelada exitosamente. Stock restaurado.',
        data: canceledAssignment
      });
    } catch (error) {
      console.error('Error al cancelar asignación:', error);
      res.status(500).json({
        success: false,
        message: 'Error al cancelar la asignación',
        error: error.message
      });
    }
  }

  /**
   * Obtener pendientes de pago
   */
  static async getPending(req, res) {
    try {
      const assignments = await ProductAssignment.getAll({ estado: 'pendiente' });

      res.json({
        success: true,
        data: assignments
      });
    } catch (error) {
      console.error('Error al obtener pendientes:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener productos pendientes de pago',
        error: error.message
      });
    }
  }

  /**
   * Obtener estadísticas de ventas
   */
  static async getStats(req, res) {
    try {
      const stats = await ProductAssignment.getStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
      });
    }
  }
}

module.exports = ProductAssignmentController;