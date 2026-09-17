const { frontendUrl } = require("../../config/env");
const { getCurrentUser } = require("../auth/auth.service");
const { getGithubRepos, linkGithubWithUser, getAccessTokenFromCode, getGithubUser, startCodeReview } = require("./github.service");
const { REVIEW_CODE } = require('./github.constants');
const { queue } = require('../../utils/worker');
const { encryptAccessToken } = require("../../utils/jwt");


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
        const {
            access_token,
            token_type,
        } = await getAccessTokenFromCode(code);

        if (!access_token) {
            return res.status(401).json({
                message: "Failed to obtain GitHub access token"
            });
        }

        // Fetch GitHub profile
        const githubUserResponse = await getGithubUser(access_token)

        // Continue with DB logic here
        // Find/create your application user
        // Store GitHub account information
        // Store encrypted access token
        await linkGithubWithUser({
            githubId: githubUserResponse.id,
            name: githubUserResponse.name,
            login: githubUserResponse.login,
            access_token,
            token_type,
            email: githubUserResponse.email,
            githubAvatar: githubUserResponse.avatar_url,
            githubAccessToken: encryptAccessToken(access_token)
        })

        return res.redirect(
            `${frontendUrl}/dashboard?from=github`
        );

    } catch (error) {
        next(error);
    }
};

const getRepos = async (req, res, next) => {
    try {
        const { user, githubAccount } = await getCurrentUser(req.user.id);

        if (!user || !githubAccount) {
            return res.status(401).json({
                message: "GitHub account not connected"
            });
        }

        const accessToken = githubAccount.accessToken;

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

const reviewCode = async (req, res, next) => {
    try {
        const { githubRepoId, branch, owner, userId } = req.body;

        const codeReviewData = await startCodeReview(githubRepoId);

        await queue.add(REVIEW_CODE, { branch, repo, owner, reviewId: codeReviewData.id, userId });

        res.json({
            success: true,
            data: "Repository is under review"
        });
    } catch (error) {
        next(error)
    }
}

module.exports = {
    githubCallback,
    getRepos,
    reviewCode
}