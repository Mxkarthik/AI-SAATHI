const detectIntent = (message) => {
  const text = message.toLowerCase();

  if (
    text.includes("farm") ||
    text.includes("farming") ||
    text.includes("crop") ||
    text.includes("agriculture") ||
    text.includes("paddy") ||
    text.includes("rice")
  ) {
    return "crop_financing";
  }

  if (
    text.includes("tractor") ||
    text.includes("equipment") ||
    text.includes("machine")
  ) {
    return "equipment_financing";
  }

  if (
    text.includes("livestock") ||
    text.includes("cow") ||
    text.includes("buffalo") ||
    text.includes("cattle")
  ) {
    return "livestock_financing";
  }

  if (
    text.includes("insurance") ||
    text.includes("insure")
  ) {
    return "insurance";
  }

  if (
    text.includes("saving") ||
    text.includes("savings")
  ) {
    return "savings";
  }

  if (
    text.includes("invest") ||
    text.includes("investment")
  ) {
    return "investment";
  }

  return "general_financial_guidance";
};

module.exports = {
  detectIntent
};