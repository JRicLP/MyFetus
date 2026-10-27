const express = require('express');
const { handleHealthRequest } = require('../services/healthService');

const router = express.Router();

router.get('/', handleHealthRequest);

module.exports = router;
