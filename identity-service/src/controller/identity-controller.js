//user registertaion
//login
//refresh token
//logout
const { logger } = require("../utils/logger");
const { validateRegistration, validateLogin } = require("../utils/validation");
const mongoose = require("mongoose");

const User = require("../models/User");
const { generateToken } = require("../utils/generateToken");
const { RefreshToken } = require("../models/RefreshToken");
const registerUser = async (req, res) => {
  logger.info("Registration Endpoint.......👌");
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { error } = validateRegistration(req.body);
    if (error) {
      logger.warn("Validation Error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    const { email, password, username } = req.body;
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      logger.warn("User Already Exist");
      await session.abortTransaction(); // Abort if user already exists
      return res.status(400).json({
        success: false,
        message: "User Already Exist",
      });
    }

    user = new User({ username, email, password });
    await user.save();
    logger.warn("User Registered Successfully", user._id);
    const { accessToken, refreshToken } = await generateToken(user);

    // If there is an error generating the tokens, abort the transaction
    if (!accessToken || !refreshToken) {
      logger.error("Failed to generate tokens");
      await session.abortTransaction(); // Abort the transaction if token generation fails
      return res.status(500).json({
        success: false,
        message: "Internal Server Error during token generation",
      });
    }
    // Commit the transaction after everything is successful
    await session.commitTransaction();
    res.status(201).json({
      success: true,
      message: "User Registered Successfully ",
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error("Error Occure during registration", error);
    await session.abortTransaction(); // Ensure rollback on error

    res.status(500).json({
      success: false,
      message: "Internal Server error",
    });
  } finally {
    // End the session after the transaction
    session.endSession();
  }
};

const loginUser = async (req, res) => {
  logger.info("Login End Point is hit...");
  try {
    const { error } = validateLogin(req.body);
    if (error) {
      logger.warn("Validation Error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      logger.warn("Invalid User");
      return res.status(400).json({
        success: false,
        message: "Invalid Credentials",
      });
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      logger.warn("Invalid Password");
      return res.status(400).json({
        success: false,
        message: "Invalid Password",
      });
    }

    const { accessToken, refreshToken } = await generateToken(user);
    res.json({
      accessToken,
      refreshToken,
      userId: user._id,
    });
  } catch (error) {
    logger.error("Error Occure during Login", error);
    await session.abortTransaction(); // Ensure rollback on error

    res.status(500).json({
      success: false,
      message: "Internal Server error",
    });
  }
};

const refreshTokenUser = async (req, res) => {
  logger.info(" Refresh Token End Point  hit...");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh token missing");
      return res.status(400).json({
        success: false,
        message: "Refresh token missing",
      });
    }

    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    if (!storedToken || storedToken.expiresAt < new Date()) {
      logger.warn("Invalid or expired refresh token");
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }
    const user = await User.findById(storedToken.user);
    if (!user) {
      logger.warn("User Not Found");
      return res.status(401).json({
        success: false,
        message: "User Not Found",
      });
    }

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await generateToken(user);
    //delete the existing toke
    await RefreshToken.deleteOne({ _id: storedToken._id });
    return res.json({
      accessToken: newAccessToken,
      refreshToken,
      newRefreshToken,
    });
  } catch (error) {
    logger.error("Error Occure during Refresh token creation", error);
    await session.abortTransaction();

    res.status(500).json({
      success: false,
      message: "Internal Server error",
    });
  }
};

const logoutUser = async (req, res) => {
  logger.info("Logout End Point  hit...");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh token missing");
      return res.status(400).json({
        success: false,
        message: "Refresh token missing",
      });
    }
    await RefreshToken.deleteOne({ token: refreshToken });
    logger.infor("Refresh token is deleted for logout");
    res.json({
      success: true,
      message: "Your are LogOut ",
    });
  } catch (error) {
    logger.error("Error Occure Logout End Point", error);
    await session.abortTransaction();

    res.status(500).json({
      success: false,
      message: "Internal Server error",
    });
  }
};

module.exports = { registerUser, loginUser, refreshTokenUser, logoutUser };
