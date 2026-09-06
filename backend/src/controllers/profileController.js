const profileService = require("../services/profileService");

const RECOGNISED_FIELDS = ['location', 'farming', 'crops', 'irrigation', 'financial', 'assets'];

const getProfile = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const result = await profileService.getProfileByUserId(req.userId);

    if (result === null) {
      return res.status(404).json({ message: "Profile not found" });
    }

    return res.status(200).json({ profile: result });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const upsertProfile = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { userId: _stripped, _id: _id2, createdAt: _ca, updatedAt: _ua, ...sanitisedBody } = req.body || {};

    const hasRecognisedField = RECOGNISED_FIELDS.some(f => f in sanitisedBody);
    if (!hasRecognisedField) {
      return res.status(400).json({ message: "Request body must contain at least one profile field" });
    }

    const profile = await profileService.upsertProfile(req.userId, sanitisedBody);

    return res.status(200).json({ message: "Profile saved successfully", profile });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    console.error('Upsert profile error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { getProfile, upsertProfile };
