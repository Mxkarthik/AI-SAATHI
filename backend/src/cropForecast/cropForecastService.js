const axios = require('axios');
const PYTHON_URL = process.env.PYTHON_FORECAST_URL || 'http://127.0.0.1:5001';

exports.getForecast = async (crop, horizon = 30) => {
  const response = await axios.post(`${PYTHON_URL}/predict`, { crop, horizon: parseInt(horizon) });
  return response.data;
};
