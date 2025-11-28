const HID = require('node-hid');

/**
 * Servicio para manejar el lector de huellas HID
 * Este servicio se conecta con el dispositivo de huellas dactilares HID
 * y proporciona funciones para capturar y comparar huellas
 */
class FingerprintService {
  constructor() {
    this.device = null;
    this.vendorId = parseInt(process.env.FINGERPRINT_DEVICE_VENDOR_ID || '0x1234', 16);
    this.productId = parseInt(process.env.FINGERPRINT_DEVICE_PRODUCT_ID || '0x5678', 16);
    this.isConnected = false;
    this.captureCallback = null;
  }

  /**
   * Lista todos los dispositivos HID conectados
   */
  listDevices() {
    try {
      const devices = HID.devices();
      console.log('📱 Dispositivos HID encontrados:', devices.length);
      return devices;
    } catch (error) {
      console.error('❌ Error al listar dispositivos:', error);
      return [];
    }
  }

  /**
   * Encuentra el dispositivo de huellas específico
   */
  findFingerprintDevice() {
    const devices = HID.devices();
    
    // Primero intenta buscar por vendor y product ID
    let device = devices.find(d => 
      d.vendorId === this.vendorId && 
      d.productId === this.productId
    );

    // Si no lo encuentra, busca dispositivos comunes de huellas
    if (!device) {
      // IDs comunes de lectores de huellas
      const commonFingerprint = [
        { vendorId: 0x2808, productId: 0x9338 }, // ZKTeco
        { vendorId: 0x1c7a, productId: 0x0603 }, // Hamster
        { vendorId: 0x05ba, productId: 0x000a }, // DigitalPersona
        { vendorId: 0x147e, productId: 0x1000 }, // Upek
      ];

      for (const fp of commonFingerprint) {
        device = devices.find(d => 
          d.vendorId === fp.vendorId && 
          d.productId === fp.productId
        );
        if (device) {
          console.log('✅ Dispositivo de huella encontrado:', device.product);
          break;
        }
      }
    }

    return device;
  }

  /**
   * Conecta con el dispositivo de huellas
   */
  async connect() {
    try {
      const deviceInfo = this.findFingerprintDevice();
      
      if (!deviceInfo) {
        throw new Error('Dispositivo de huellas no encontrado. Verifica que esté conectado.');
      }

      this.device = new HID.HID(deviceInfo.path);
      this.isConnected = true;

      console.log('✅ Conectado al lector de huellas');
      console.log('   Vendor ID:', deviceInfo.vendorId);
      console.log('   Product ID:', deviceInfo.productId);
      console.log('   Producto:', deviceInfo.product || 'Desconocido');

      // Configurar listener para datos del dispositivo
      this.device.on('data', (data) => {
        this.handleDeviceData(data);
      });

      this.device.on('error', (error) => {
        console.error('❌ Error en dispositivo de huellas:', error);
        this.isConnected = false;
      });

      return true;
    } catch (error) {
      console.error('❌ Error al conectar con dispositivo de huellas:', error.message);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Maneja los datos recibidos del dispositivo
   */
  handleDeviceData(data) {
    if (this.captureCallback) {
      this.captureCallback(data);
    }
  }

  /**
   * Captura una huella dactilar del dispositivo
   * @param {number} timeout - Tiempo de espera en ms (default: 30000)
   * @returns {Promise<string>} Template de la huella en base64
   */
  async captureFingerprint(timeout = 30000) {
    if (!this.isConnected) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.captureCallback = null;
        reject(new Error('Tiempo de espera agotado. Coloque el dedo en el sensor.'));
      }, timeout);

      this.captureCallback = (data) => {
        clearTimeout(timeoutId);
        this.captureCallback = null;

        // Convertir datos a base64
        const template = Buffer.from(data).toString('base64');
        resolve(template);
      };

      console.log('👆 Esperando huella dactilar...');
    });
  }

  /**
   * Compara dos templates de huellas
   * @param {string} template1 - Template en base64
   * @param {string} template2 - Template en base64
   * @returns {boolean} true si coinciden
   */
  compareTemplates(template1, template2) {
    if (!template1 || !template2) {
      return false;
    }

    // Comparación simple (en producción, usar algoritmo de matching más robusto)
    // Por ahora, comparación exacta
    return template1 === template2;
  }

  /**
   * Compara una huella capturada con una lista de templates
   * @param {string} capturedTemplate - Template capturado
   * @param {Array<{id: number, template: string}>} storedTemplates - Templates almacenados
   * @returns {Object|null} Cliente coincidente o null
   */
  findMatchingTemplate(capturedTemplate, storedTemplates) {
    for (const stored of storedTemplates) {
      if (this.compareTemplates(capturedTemplate, stored.template)) {
        return stored;
      }
    }
    return null;
  }

  /**
   * Desconecta el dispositivo
   */
  disconnect() {
    if (this.device) {
      try {
        this.device.close();
        this.isConnected = false;
        console.log('📴 Dispositivo de huellas desconectado');
      } catch (error) {
        console.error('Error al desconectar:', error);
      }
    }
  }

  /**
   * Verifica el estado de la conexión
   */
  getStatus() {
    return {
      connected: this.isConnected,
      device: this.device ? {
        vendorId: this.vendorId,
        productId: this.productId
      } : null
    };
  }

  /**
   * Reinicia la conexión del dispositivo
   */
  async reconnect() {
    this.disconnect();
    await new Promise(resolve => setTimeout(resolve, 1000));
    return await this.connect();
  }
}

// Singleton instance
let fingerprintServiceInstance = null;

const getFingerprintService = () => {
  if (!fingerprintServiceInstance) {
    fingerprintServiceInstance = new FingerprintService();
  }
  return fingerprintServiceInstance;
};

module.exports = {
  FingerprintService,
  getFingerprintService
};