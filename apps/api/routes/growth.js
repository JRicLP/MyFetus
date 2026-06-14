const express = require('express');
const router = express.Router();

const {
  calculatePercentile,
  getGrowthChart
} = require('../controllers/growthPercentileController');

router.post('/percentile', calculatePercentile);

router.get('/chart', getGrowthChart);

module.exports = router;