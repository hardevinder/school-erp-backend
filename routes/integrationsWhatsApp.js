const express = require('express');
const router = express.Router();
const { health, sendWhatsAppBatch } = require('../controllers/integrations/whatsappController');

router.get('/health', health);
router.post('/send-batch', sendWhatsAppBatch);

module.exports = router;
