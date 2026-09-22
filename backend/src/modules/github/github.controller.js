const { frontendUrl } = require("../../config/env");
const { getCurrentUser } = require("../auth/auth.service");
const { getGithubRepos, linkGithubWithUser, getAccessTokenFromCode, getGithubUser, startCodeReview } = require("./github.service");
const { REVIEW_CODE } = require('./github.constants');
const { queue } = require('../../utils/worker');
const { encryptAccessToken, hashOAuthLoginCode, generateOAuthLoginCode, generateAccessToken, generateRefreshToken } = require("../../utils/jwt");
const redisConnection = require("../../utils/redis");

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
        const data = await linkGithubWithUser({
            githubId: githubUserResponse.id,
            name: githubUserResponse.name,
            login: githubUserResponse.login,
            access_token,
            token_type,
            email: githubUserResponse.email,
            githubAvatar: githubUserResponse.avatar_url,
            githubAccessToken: encryptAccessToken(access_token)
        });

        const userId = data.id || data.user.id

        const loginCode = generateOAuthLoginCode();
        const codeHash = hashOAuthLoginCode(loginCode);

        const redisKey = `token:${userId}`;
        await redisConnection.set(redisKey, codeHash, 'EX', 180);

        if (data.refreshToken) {
            res.cookie("refresh_token", data.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 1000 * 60 * 60 * 24 * 30,
                path: "/auth",
            });
        }

        return res.redirect(
            `${frontendUrl}/dashboard?from=github&code=${loginCode}&userId=${userId}`
        );

    } catch (error) {
        console.log('Error in github callback', error)
        return res.redirect(
            `${process.env.FRONTEND_URL}/login?error=github_auth_failed`
        );
    }
};

const exhangeLoginCodeWithToken = async (req, res) => {
    try {
        const { code, userId } = req.body;

        if (!code) {
            return res.status(400).json({
                message: "Authorization code is required"
            });
        }

        const redisKey = `token:${userId}`;

        const loginCode = await redisConnection.get(redisKey);

        if (!loginCode) {
            return res.status(401).json({
                message: "Invalid or expired authorization code"
            });
        }

        const { user } = await getCurrentUser(userId);

        if (!user.isActive) {
            return res.status(403).json({
                message: "User account is inactive"
            });
        }

        await redisConnection.del(redisKey);

        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken(user.id);

        // Refresh token goes into HttpOnly cookie
        res.cookie("refresh_token", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/auth",
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

        // Access token goes to React
        return res.status(200).json({
            accessToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                isEmailVerified: user.isEmailVerified
            }
        });

    } catch (error) {
        console.error(
            "GitHub login exchange error:",
            error
        );

        return res.status(500).json({
            message: "Authentication failed"
        });
    }
}

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
    exhangeLoginCodeWithToken,
    getRepos,
    reviewCode
}