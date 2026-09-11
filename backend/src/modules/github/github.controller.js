const { frontendUrl } = require("../../config/env");
const { getCurrentUser } = require("../auth/auth.service");
const { getGithubRepos, linkGithubWithUser, getAccessTokenFromCode, getGithubUser, generateLoginUrl } = require("./github.service");
const crypto = require('crypto')
const { Queue } = require('bullmq');
const { LLM_PROCESSING } = require('./github.constants');
const redisConnection = require('../../utils/redis');

const queue = new Queue(LLM_PROCESSING, {
    connection: redisConnection
});

const githubLogin = (req, res) => {
    const state = crypto.randomBytes(32).toString("hex");

    // Store state temporarily in session/Redis.
    req.session.githubOAuthState = state;

    const params = generateLoginUrl(state)

    res.redirect(
        `https://github.com/login/oauth/authorize?${params.toString()}`
    );
};

const githubCallback = async (req, res, next) => {
    try {
        const { code, state } = req.query;

        if (!code) {
            return res.status(400).json({
                message: "GitHub authorization code missing"
            });
        }

        // CSRF protection
        if (!state || state !== req.session.githubOAuthState) {
            return res.status(403).json({
                message: "Invalid OAuth state"
            });
        }

        // State should be single-use
        delete req.session.githubOAuthState;

        // Exchange authorization code for access token
        const tokenResponse = await getAccessTokenFromCode(code);

        const {
            access_token,
            token_type,
            scope
        } = tokenResponse.data;        

        console.log(access_token)

        if (!access_token) {
            return res.status(401).json({
                message: "Failed to obtain GitHub access token"
            });
        }

        // Fetch GitHub profile
        const githubUserResponse = await getGithubUser(access_token)

        const githubUser = githubUserResponse.data;

        // Continue with DB logic here
        // Find/create your application user
        // Store GitHub account information
        // Store encrypted access token
        await linkGithubWithUser(githubUser.id, {
            githubId: githubUser.id,
            githubUsername: githubUser.login,
            githubAvatar: githubUser.avatar_url,
            githubAccessToken: encrypt(access_token)
        })

        return res.redirect(
            `${frontendUrl}/github/success`
        );

    } catch (error) {
        next(error);
    }
};

const getRepos = async (req, res, next) => {
    try {
        const user = await getCurrentUser(req.user.id);

        if (!user || !user.githubAccessTokenEncrypted) {
            return res.status(401).json({
                message: "GitHub account not connected"
            });
        }

        const accessToken = decrypt(
            user.githubAccessTokenEncrypted
        );

        const page = Number(req.query.page) || 1;
        const perPage = Math.min(
            Number(req.query.perPage) || 30,
            100
        );

        const repos = await getGithubRepos(
            accessToken,
            page,
            perPage
        );

        res.json({
            success: true,
            data: repos
        });

    } catch (error) {
        next(error);
    }
};

const reviewCode = (req, res, next) => {
    try {
        queue.add('cars', { color: 'blue' });
    } catch (error) {
        next(error)
    }
}

module.exports = {
    githubLogin,
    githubCallback,
    getRepos,
    reviewCode
}