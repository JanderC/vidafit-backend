const { CheckIn, Client, Membership } = require('../models');

class CheckInController {
  static async create(req, res) {
    try {
      const { cliente_id, metodo, nota } = req.body;

      const client = await Client.findById(cliente_id);
      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      if (!client.activo) {
        return res.status(403).json({
          success: false,
          message: 'Cliente inactivo',
          exitoso: false
        });
      }

      const activeMembership = await Membership.getActive(cliente_id);

      let exitoso = true;
      let mensaje = 'Check-in exitoso';
      let diasRestantes = null;

      if (!activeMembership) {
        exitoso = false;
        mensaje = 'No tiene membresía activa';
      } else {
        const today = new Date();
        const expirationDate = new Date(activeMembership.fecha_vencimiento);
        const diffTime = expirationDate - today;
        diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diasRestantes < 0) {
          exitoso = false;
          mensaje = 'Membresía vencida';
        } else if (diasRestantes <= 3) {
          mensaje = `Check-in exitoso. Membresía vence en ${diasRestantes} día(s)`;
        } else {
          mensaje = `Check-in exitoso. ${diasRestantes} día(s) restantes`;
        }
      }

      const checkinData = {
        cliente_id,
        metodo: metodo || 'huella',
        exitoso,
        nota: nota || mensaje
      };

      const checkin = await CheckIn.create(checkinData);

      const clientData = await Client.getWithActiveMembership(cliente_id);

      res.status(exitoso ? 200 : 403).json({
        success: true,
        exitoso,
        message: mensaje,
        data: {
          checkin,
          cliente: clientData,
          dias_restantes: diasRestantes
        }
      });
    } catch (error) {
      console.error('Error al crear check-in:', error);
      res.status(500).json({
        success: false,
        message: 'Error al registrar check-in',
        error: error.message
      });
    }
  }

  static async checkinByFingerprint(req, res) {
    try {
      const { huella_template } = req.body;

      const client = await Client.findByFingerprint(huella_template);

      if (!client) {
        return res.status(404).json({
          success: false,
          exitoso: false,
          message: 'Huella no reconocida'
        });
      }

      req.body.cliente_id = client.id;
      req.body.metodo = 'huella';

      return CheckInController.create(req, res);
    } catch (error) {
      console.error('Error en check-in por huella:', error);
      res.status(500).json({
        success: false,
        message: 'Error al registrar check-in por huella',
        error: error.message
      });
    }
  }

  static async checkinByCedula(req, res) {
    try {
      const { cedula } = req.body;

      const client = await Client.findByCedula(cedula);

      if (!client) {
        return res.status(404).json({
          success: false,
          exitoso: false,
          message: 'Cliente no encontrado con esta cédula'
        });
      }

      req.body.cliente_id = client.id;
      req.body.metodo = 'cedula';

      return CheckInController.create(req, res);
    } catch (error) {
      console.error('Error en check-in por cédula:', error);
      res.status(500).json({
        success: false,
        message: 'Error al registrar check-in por cédula',
        error: error.message
      });
    }
  }

  static async getAll(req, res) {
    try {
      const { fecha, fecha_inicio, fecha_fin, metodo, cliente_id } = req.query;
      const filters = {};

      if (fecha) {
        filters.fecha = fecha;
      }

      if (fecha_inicio && fecha_fin) {
        filters.fecha_inicio = fecha_inicio;
        filters.fecha_fin = fecha_fin;
      }

      if (metodo) {
        filters.metodo = metodo;
      }

      if (cliente_id) {
        filters.cliente_id = cliente_id;
      }

      const checkins = await CheckIn.getAll(filters);

      res.json({
        success: true,
        data: checkins
      });
    } catch (error) {
      console.error('Error al obtener check-ins:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener check-ins',
        error: error.message
      });
    }
  }

  static async getByClient(req, res) {
    try {
      const { clientId } = req.params;
      const { limit } = req.query;

      const checkins = await CheckIn.getByClient(clientId, limit ? parseInt(limit) : 50);

      res.json({
        success: true,
        data: checkins
      });
    } catch (error) {
      console.error('Error al obtener check-ins del cliente:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener check-ins del cliente',
        error: error.message
      });
    }
  }

  static async getTodayCount(req, res) {
    try {
      const count = await CheckIn.getTodayCount();

      res.json({
        success: true,
        data: { count }
      });
    } catch (error) {
      console.error('Error al obtener conteo de hoy:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener conteo de hoy',
        error: error.message
      });
    }
  }

  static async getStats(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const end = endDate || new Date().toISOString();

      const countByDate = await CheckIn.getCountByDate(start, end);
      const topClients = await CheckIn.getTopClients(10, start, end);

      res.json({
        success: true,
        data: {
          por_fecha: countByDate,
          top_clientes: topClients
        }
      });
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas de check-ins',
        error: error.message
      });
    }
  }
}

module.exports = CheckInController;