const { Membership, Plan, Client } = require('../models');
const pool = require('../config/database');

class MembershipController {
  static async getAll(req, res) {
    try {
      const { estado, vencimiento_proximo } = req.query;
      const filters = {};

      if (estado) {
        filters.estado = estado;
      }

      if (vencimiento_proximo === 'true') {
        filters.vencimiento_proximo = true;
      }

      const memberships = await Membership.getAll(filters);

      res.json({
        success: true,
        data: memberships
      });
    } catch (error) {
      console.error('Error al obtener membresías:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener membresías',
        error: error.message
      });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const membership = await Membership.findById(id);

      if (!membership) {
        return res.status(404).json({
          success: false,
          message: 'Membresía no encontrada'
        });
      }

      res.json({
        success: true,
        data: membership
      });
    } catch (error) {
      console.error('Error al obtener membresía:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener membresía',
        error: error.message
      });
    }
  }

  static async getByClient(req, res) {
    try {
      const { clientId } = req.params;
      const { estado } = req.query;
      const filters = {};

      if (estado) {
        filters.estado = estado;
      }

      const memberships = await Membership.getByClient(clientId, filters);

      res.json({
        success: true,
        data: memberships
      });
    } catch (error) {
      console.error('Error al obtener membresías del cliente:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener membresías del cliente',
        error: error.message
      });
    }
  }

  static async create(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { cliente_id, plan_id, fecha_inicio, monto_pagado, metodo_pago, notas } = req.body;

      const clientExists = await Client.findById(cliente_id);
      if (!clientExists) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      const plan = await Plan.findById(plan_id);
      if (!plan) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Plan no encontrado'
        });
      }

      const activeMembership = await Membership.getActive(cliente_id);
      if (activeMembership) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'El cliente ya tiene una membresía activa'
        });
      }

      const startDate = new Date(fecha_inicio);
      const expirationDate = new Date(startDate);
      expirationDate.setDate(expirationDate.getDate() + plan.duracion_dias);

      const membershipData = {
        cliente_id,
        plan_id,
        fecha_inicio: startDate,
        fecha_vencimiento: expirationDate,
        monto_pagado: monto_pagado || plan.precio,
        metodo_pago,
        notas
      };

      const membership = await Membership.create(membershipData);

      const pagoQuery = `
        INSERT INTO pagos (membresia_id, cliente_id, monto, metodo_pago, notas)
        VALUES ($1, $2, $3, $4, $5)
      `;
      await client.query(pagoQuery, [
        membership.id,
        cliente_id,
        monto_pagado || plan.precio,
        metodo_pago,
        'Pago inicial de membresía'
      ]);

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'Membresía creada exitosamente',
        data: membership
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error al crear membresía:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear membresía',
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const membershipData = req.body;

      const existingMembership = await Membership.findById(id);
      if (!existingMembership) {
        return res.status(404).json({
          success: false,
          message: 'Membresía no encontrada'
        });
      }

      const updatedMembership = await Membership.update(id, membershipData);

      res.json({
        success: true,
        message: 'Membresía actualizada exitosamente',
        data: updatedMembership
      });
    } catch (error) {
      console.error('Error al actualizar membresía:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar membresía',
        error: error.message
      });
    }
  }

  static async cancel(req, res) {
    try {
      const { id } = req.params;

      const membership = await Membership.findById(id);
      if (!membership) {
        return res.status(404).json({
          success: false,
          message: 'Membresía no encontrada'
        });
      }

      const canceledMembership = await Membership.cancel(id);

      res.json({
        success: true,
        message: 'Membresía cancelada exitosamente',
        data: canceledMembership
      });
    } catch (error) {
      console.error('Error al cancelar membresía:', error);
      res.status(500).json({
        success: false,
        message: 'Error al cancelar membresía',
        error: error.message
      });
    }
  }

  static async suspend(req, res) {
    try {
      const { id } = req.params;

      const membership = await Membership.findById(id);
      if (!membership) {
        return res.status(404).json({
          success: false,
          message: 'Membresía no encontrada'
        });
      }

      const suspendedMembership = await Membership.suspend(id);

      res.json({
        success: true,
        message: 'Membresía suspendida exitosamente',
        data: suspendedMembership
      });
    } catch (error) {
      console.error('Error al suspender membresía:', error);
      res.status(500).json({
        success: false,
        message: 'Error al suspender membresía',
        error: error.message
      });
    }
  }

  static async reactivate(req, res) {
    try {
      const { id } = req.params;

      const membership = await Membership.findById(id);
      if (!membership) {
        return res.status(404).json({
          success: false,
          message: 'Membresía no encontrada'
        });
      }

      const reactivatedMembership = await Membership.reactivate(id);

      res.json({
        success: true,
        message: 'Membresía reactivada exitosamente',
        data: reactivatedMembership
      });
    } catch (error) {
      console.error('Error al reactivar membresía:', error);
      res.status(500).json({
        success: false,
        message: 'Error al reactivar membresía',
        error: error.message
      });
    }
  }
}

module.exports = MembershipController;