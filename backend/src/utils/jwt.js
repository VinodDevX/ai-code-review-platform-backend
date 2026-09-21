const jwt = require("jsonwebtoken");
const env = require("../config/env");
const crypto = require('crypto')

const generateAccessToken = (userId) => {
  return jwt.sign(
    {
      userId,
      type: "access",
    },
    env.jwtAccessSecret,
    {
      expiresIn: env.jwtAccessExpiresIn,
    }
  );
};

const encryptAccessToken = (token) => {
  return jwt.sign(
    {
      token,
      type: "access",
    },
    env.jwtAccessSecret
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    {
      userId,
      type: "refresh",
    },
    env.jwtRefreshSecret,
    {
      expiresIn: env.jwtRefreshExpiresIn,
    }
  );
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, env.jwtAccessSecret);
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.jwtRefreshSecret);
};

function generateOAuthLoginCode() {
    return crypto.randomBytes(32).toString("hex");
}

function hashOAuthLoginCode(code) {
    return crypto
        .createHash("sha256")
        .update(code)
        .digest("hex");
}

module.exports = {
  generateAccessToken,
  encryptAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateOAuthLoginCode,
  hashOAuthLoginCode
};