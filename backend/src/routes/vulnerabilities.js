const express = require('express');
const router = express.Router();
const vulnerabilityController = require('../controllers/vulnerabilityController');
const { uploadMiddleware, uploadFile } = require('../controllers/uploadController');
const { getCsrfToken, csrfProtection, originCheck } = require('../middleware/csrf');

// Command Injection
router.post('/ping', vulnerabilityController.ping);

// CSRF - Transferencia
//router.post('/transfer', vulnerabilityController.transfer);

// CSRF - endpoint para obtener token CSRF
router.get('/csrf-token', getCsrfToken);
// Orden correcto para proteccion de POST sensible: primero validar Origin/Referer, luego validar token CSRF
router.post('/transfer', originCheck, csrfProtection, vulnerabilityController.transfer);

// Local File Inclusion
router.get('/file', vulnerabilityController.readFile);

// File Upload
router.post('/upload', uploadMiddleware, uploadFile);

module.exports = router;
