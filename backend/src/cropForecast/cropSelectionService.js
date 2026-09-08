exports.getUserCrops = (userProfile) => {
  if (userProfile?.farming?.crops && userProfile.farming.crops.length > 0) {
    return { personalized: true, source: "financial_profile", crops: userProfile.farming.crops };
  }
  return { personalized: false, source: "default", crops: ["Rice", "Chilli", "Tomato", "Cotton", "Ragi", "Wheat"] };
};
