const selectionService = require('./cropSelectionService');
const forecastService = require('./cropForecastService');

exports.getCropForecasts = async (req, res) => {
  try {
    const horizon = req.query.horizon || 30;
    const selection = selectionService.getUserCrops(req.user);
    const forecasts = await Promise.all(selection.crops.map(crop => forecastService.getForecast(crop, horizon)));
    res.json({ personalized: selection.personalized, source: selection.source, data: forecasts });
  } catch (error) {
    res.status(500).json({ error: "Failed to load forecasts", details: error.message });
  }
};
