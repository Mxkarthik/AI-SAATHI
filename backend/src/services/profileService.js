const FinancialProfile = require("../models/FinancialProfile");

async function getProfileByUserId(userId) {
  return FinancialProfile.findOne({ userId });
}

async function upsertProfile(userId, profileData) {
  return FinancialProfile.findOneAndUpdate(
    { userId },
    { $set: profileData },
    { new: true, upsert: true, runValidators: true, context: "query" }
  );
}

module.exports = { getProfileByUserId, upsertProfile };
