const express = require('express');
const router = express.Router();
const { rateLimit } = require('express-rate-limit');
const controller = require('../controllers/clinicalHistoryController');
const { authenticateToken, requireRole } = require('../middlewares/auth');
const { createClinicalLimiterOptions } = require('../middlewares/authRateLimit');

router.use(rateLimit(createClinicalLimiterOptions()));

const canReadHistory = [
  authenticateToken,
  requireRole('gestante', 'medico', 'admin'),
];
const canWriteHistory = [
  authenticateToken,
  requireRole('medico', 'admin'),
];

router.get(
  '/pregnancies/:pregnancyId',
  ...canReadHistory,
  controller.getClinicalHistory
);
router.get(
  '/pregnancies/:pregnancyId/fetal-biometries',
  ...canReadHistory,
  controller.getFetalBiometries
);
router.post(
  '/pregnancies/:pregnancyId/fetal-biometries',
  ...canWriteHistory,
  controller.createFetalBiometry
);
router.get(
  '/pregnancies/:pregnancyId/maternal-weights',
  ...canReadHistory,
  controller.getMaternalWeights
);
router.post(
  '/pregnancies/:pregnancyId/maternal-weights',
  ...canWriteHistory,
  controller.createMaternalWeight
);

module.exports = router;
