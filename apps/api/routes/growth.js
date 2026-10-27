const express = require('express');
const { rateLimit } = require('express-rate-limit');
const router = express.Router();

const {
  calculatePercentile,
  getGrowthChart
} = require('../controllers/growthPercentileController');
const { authenticateToken } = require('../middlewares/auth');
const { positiveInteger } = require('../middlewares/authRateLimit');

router.use(
  rateLimit({
    windowMs: positiveInteger(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    limit: positiveInteger(process.env.CLINICAL_RATE_LIMIT_MAX, 60),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Muitas tentativas. Tente novamente mais tarde.' },
  }),
  authenticateToken
);

router.post('/percentile', calculatePercentile);

router.get('/chart', getGrowthChart);

module.exports = router;
