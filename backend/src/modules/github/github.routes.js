const express = require("express");

const githubController = require("./github.controller");

const router = express.Router();

router.get("/login", githubController.githubLogin);
router.get("/callback", githubController.githubCallback);
router.get("/repos", githubController.getRepos);
router.get("/review", githubController.reviewCode);


module.exports = router;