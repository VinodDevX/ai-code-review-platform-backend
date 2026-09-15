require("dotenv").config();

const env = {
  port: process.env.PORT || 5000,

  databaseUrl: process.env.DATABASE_URL,

  frontendUrl: process.env.FRONTEND_URL,

  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,

  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",

  githubClientID: process.env.GITHUB_CLIENT_ID,
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
  githubCallbackUrl: process.env.GITHUB_CALLBACK_URL,

  openAIKey: process.env.OPENAI_API_KEY,

  nodeEnv: process.env.NODE_ENV || "development",
};

module.exports = env;