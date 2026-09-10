const prisma = require("../../config/database");
const { generateAccessToken, generateRefreshToken } = require("../../utils/jwt");
const { comparePassword, hashPassword } = require("../../utils/password");
const { hashToken } = require("../../utils/token");

const register = async ({ name, email, password }) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    throw new Error("Email already registered");
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
    },
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
};

const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  if (!user.isActive) {
    throw new Error("user is inactive");
  }

  const passwordMatch = await comparePassword(password, user.passwordHash);

  if (!passwordMatch) {
    throw new Error("Invaliid password and email");
  }

  const accessToken = await generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      lastLoginAt: new Date(),
    },
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
    },
    accessToken,
    refreshToken,
  };
};


const getCurrentUser = async (userId) => {
  return prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      isEmailVerified: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};


const refreshAccessToken = async (refreshToken) => {
  // 1. Refresh token verify
  const decoded = verifyRefreshToken(refreshToken);

  // 2. Check token type
  if (decoded.type !== "refresh") {
    throw new Error("Invalid refresh token");
  }

  // 3. Find user
  const user = await prisma.user.findUnique({
    where: {
      id: decoded.userId,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // 4. Generate new access token
  const accessToken = generateAccessToken(user.id);

  return {
    accessToken,
  };
};

const logout = async (refreshToken) => {
  // Refresh token ko verify karo
  const decoded = verifyRefreshToken(refreshToken);

  if (decoded.type !== "refresh") {
    throw new Error("Invalid refresh token");
  }

  // Yahan future mein refresh-token session
  // ko database mein revoke karenge.

  return true;
};

module.exports = {
  register,
  login,
  getCurrentUser,
  refreshAccessToken,
  logout
};
