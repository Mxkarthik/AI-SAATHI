const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const userService = require("../services/userService");
const User = require("../models/User");

/**
 * Configure Passport.js with Google OAuth 2.0 strategy.
 * This is a side-effect module — require it once in app.js to register the strategy.
 */
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        "http://localhost:5000/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const name = profile.displayName;
        const user = await userService.createUser({
          name,
          email,
          authProvider: "google",
          authProviderId: profile.id,
        });
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// Store only the user's MongoDB _id in the session
passport.serializeUser((user, done) => {
  done(null, user._id.toString());
});

// Retrieve the full user document from the session's stored _id
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});
