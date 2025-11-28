const express = require('express');
const router = express.Router();
const { getFingerprintService } = require('../services/fingerprintService');
const { authMiddleware } = require('../middleware/auth');

// Todas las rutas requieren autenticación
//router.use(authMiddleware);

/**
 * GET /api/fingerprint/status
 * Verifica el estado del lector de huellas
 */
router.get('/status', async (req, res) => {
  try {
    const service = getFingerprintService();
    const status = service.getStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener estado del dispositivo',
      error: error.message
    });
  }
});

/**
 * GET /api/fingerprint/devices
 * Lista todos los dispositivos HID conectados
 */
router.get('/devices', async (req, res) => {
  try {
    const service = getFingerprintService();
    const devices = service.listDevices();
    
    res.json({
      success: true,
      data: devices,
      count: devices.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al listar dispositivos',
      error: error.message
    });
  }
});

/**
 * POST /api/fingerprint/connect
 * Conecta con el lector de huellas
 */
router.post('/connect', async (req, res) => {
  try {
    const service = getFingerprintService();
    await service.connect();
    
    res.json({
      success: true,
      message: 'Conectado exitosamente al lector de huellas',
      data: service.getStatus()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al conectar con el dispositivo',
      error: error.message
    });
  }
});

/**
 * POST /api/fingerprint/disconnect
 * Desconecta el lector de huellas
 */
router.post('/disconnect', async (req, res) => {
  try {
    const service = getFingerprintService();
    service.disconnect();
    
    res.json({
      success: true,
      message: 'Dispositivo desconectado'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al desconectar dispositivo',
      error: error.message
    });
  }
});

/**
 * POST /api/fingerprint/capture
 * Captura una huella dactilar
 */
router.post('/capture', async (req, res) => {
  try {
    const { timeout } = req.body;
    const service = getFingerprintService();
    
    const template = await service.captureFingerprint(timeout || 30000);
    
    res.json({
      success: true,
      message: 'Huella capturada exitosamente',
      data: {
        template: template,
        template_length: template.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al capturar huella',
      error: error.message
    });
  }
});

/**
 * POST /api/fingerprint/verify
 * Verifica una huella contra las almacenadas
 */
router.post('/verify', async (req, res) => {
  try {
    const { template } = req.body;
    const service = getFingerprintService();
    const { Client } = require('../models');
    
    if (!template) {
      return res.status(400).json({
        success: false,
        message: 'Template de huella requerido'
      });
    }
    
    // Buscar cliente con esta huella
    const client = await Client.findByFingerprint(template);
    
    if (client) {
      res.json({
        success: true,
        message: 'Huella verificada exitosamente',
        data: {
          cliente: {
            id: client.id,
            nombre: client.nombre,
            apellido: client.apellido,
            cedula: client.cedula,
            foto_base64: client.foto_base64
          }
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Huella no encontrada en el sistema'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al verificar huella',
      error: error.message
    });
  }
});

/**
 * POST /api/fingerprint/test
 * Prueba completa: captura y verifica
 */
router.post('/test', async (req, res) => {
  try {
    const service = getFingerprintService();
    const { Client } = require('../models');
    
    console.log('🧪 Iniciando prueba de captura de huella...');
    
    // Capturar huella
    const template = await service.captureFingerprint(30000);
    console.log('✅ Huella capturada, longitud:', template.length);
    
    // Buscar coincidencia
    const client = await Client.findByFingerprint(template);
    
    res.json({
      success: true,
      message: 'Prueba completada',
      data: {
        huella_capturada: true,
        template_length: template.length,
        cliente_encontrado: !!client,
        cliente: client ? {
          id: client.id,
          nombre: client.nombre,
          apellido: client.apellido,
          cedula: client.cedula
        } : null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error en prueba',
      error: error.message
    });
  }
});

module.exports = router;