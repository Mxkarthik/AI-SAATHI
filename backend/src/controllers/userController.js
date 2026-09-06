const userService = require("../services/userService");

const createUser = async (req, res) => {
  try {
    const { name, email, authProvider, authProviderId } = req.body;

    if (!email || !authProvider || !authProviderId) {
      return res.status(400).json({
        message: "email, authProvider and authProviderId are required",
      });
    }

    const user = await userService.createUser({
      name,
      email,
      authProvider,
      authProviderId,
    });

    res.status(201).json({
      message: "User created/found successfully",
      user,
    });
  } catch (error) {
    console.error("Create user error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  createUser,
};