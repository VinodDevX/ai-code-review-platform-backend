const { success } = require("zod");
const authService = require("./auth.service");

const { registerSchema, loginSchema } = require("./auth.validation");

const register = async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    const user = await authService.register(data);

    res.status(200).json({
      success: true,
      message: "Registration successful",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
};
