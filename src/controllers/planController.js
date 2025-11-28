const { Plan } = require('../models');

class PlanController {
  static async getAll(req, res) {
    try {
      const { activo, tipo } = req.query;
      const filters = {};

      if (activo !== undefined) {
        filters.activo = activo === 'true';
      }

      if (tipo) {
        filters.tipo = tipo;
      }

      const plans = await Plan.getAll(filters);

      res.json({
        success: true,
        data: plans
      });
    } catch (error) {
      console.error('Error al obtener planes:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener planes',
        error: error.message
      });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const plan = await Plan.getWithStats(id);

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Plan no encontrado'
        });
      }

      res.json({
        success: true,
        data: plan
      });
    } catch (error) {
      console.error('Error al obtener plan:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener plan',
        error: error.message
      });
    }
  }

  static async create(req, res) {
    try {
      const planData = req.body;
      const plan = await Plan.create(planData);

      res.status(201).json({
        success: true,
        message: 'Plan creado exitosamente',
        data: plan
      });
    } catch (error) {
      console.error('Error al crear plan:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear plan',
        error: error.message
      });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const planData = req.body;

      const existingPlan = await Plan.findById(id);
      if (!existingPlan) {
        return res.status(404).json({
          success: false,
          message: 'Plan no encontrado'
        });
      }

      const updatedPlan = await Plan.update(id, planData);

      res.json({
        success: true,
        message: 'Plan actualizado exitosamente',
        data: updatedPlan
      });
    } catch (error) {
      console.error('Error al actualizar plan:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar plan',
        error: error.message
      });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;

      const plan = await Plan.findById(id);
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Plan no encontrado'
        });
      }

      await Plan.delete(id);

      res.json({
        success: true,
        message: 'Plan eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar plan:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar plan',
        error: error.message
      });
    }
  }
}

module.exports = PlanController;