const express = require('express');
const router = express.Router();
const controller = require('./cropForecastController');

router.get('/', controller.getCropForecasts);
module.exports = router;
