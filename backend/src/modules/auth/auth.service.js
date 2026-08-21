import { success } from "zod";
import prisma from "../../config/database";
import { hashPassword } from "../../utils/password";

export const register = async (req, res) => {
  const { name, email, password } = req.body;

  const existingUser = await prisma.user.findUnique({
    where: {
      email
    },
  });

  if (!existingUser) {
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
