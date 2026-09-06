const User = require("../models/User");

const createUser = async ({ name, email, authProvider, authProviderId }) => {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return existingUser;
  }

  const user = await User.create({
    name,
    email,
    authProvider,
    authProviderId,
  });

  return user;
};

module.exports = {
  createUser,
};