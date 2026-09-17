const express = require("express");
const authMiddleware = require("../../middleware/authenticate");
const githubController = require("./github.controller");

const router = express.Router();

router.get("/callback", githubController.githubCallback);
router.get("/repos",authMiddleware, githubController.getRepos);
router.get("/review",authMiddleware, githubController.reviewCode);


module.exports = router;