const express = require("express");

const authController = require("./auth.controller");
const authMiddleware = require("./auth.middleware");

const router = express.Router();

router.post("/register", authController.register);

router.post("/login", authController.login);

router.get("/me", authMiddleware, authController.me);

router.post("/refresh", authController.refresh);

router.post("/logout", authController.logout);
module.exports = router;


