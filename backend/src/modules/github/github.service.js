const axios = require("axios");
const prisma = require("../../config/database");
const { githubClientID, githubCallbackUrl, githubClientSecret } = require("../../config/env");

const githubApi = axios.create({
    baseURL: "https://api.github.com",
    headers: {
        Accept: "application/vnd.github+json"
    },
    timeout: 10000
});

const generateLoginUrl = (state) => {
    return new URLSearchParams({
        client_id: githubClientID,
        redirect_uri: githubCallbackUrl,
        scope: "read:user user:email repo",
        state
    });
}

const fetchGithubRepos = async (githubAccessToken) => {
    const response = await fetch(
        "https://api.github.com/user/repos?per_page=100",
        {
            headers: {
                Authorization: `Bearer ${githubAccessToken}`,
                Accept: "application/vnd.github+json",
            },
        }
    );

    const repos = await response.json();
}

const saveReposToDB = async () => {
    for (const repo of repos) {
        await prisma.githubRepo.upsert({
            where: {
                githubId: BigInt(repo.id),
            },
            update: {
                name: repo.name,
                fullName: repo.full_name,
                htmlUrl: repo.html_url,
                description: repo.description,
                language: repo.language,
                stars: repo.stargazers_count,
                forks: repo.forks_count,
                isPrivate: repo.private,
                updatedAt: new Date(repo.updated_at),
            },
            create: {
                userId,
                githubId: BigInt(repo.id),
                name: repo.name,
                fullName: repo.full_name,
                htmlUrl: repo.html_url,
                description: repo.description,
                language: repo.language,
                stars: repo.stargazers_count,
                forks: repo.forks_count,
                isPrivate: repo.private,
                updatedAt: new Date(repo.updated_at),
            },
        });
    }
}

const getGithubUser = async (accessToken) => {
    const response = await githubApi.get("/user", {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });
    return response.data;
};

const getGithubRepos = async (accessToken, page = 1, perPage = 30) => {
    const response = await githubApi.get("/user/repos", {
        headers: {
            Authorization: `Bearer ${accessToken}`
        },
        params: {
            page,
            per_page: perPage,
            sort: "updated",
            direction: "desc"
        }
    });

    return response.data;
};

const linkGithubWithUser = async (githubId, data) => {
    await prisma.user.findOneAndUpdate(
        {
            githubId: githubId
        },
        data,
        {
            upsert: true,
            new: true
        }
    );
}

const getAccessTokenFromCode = async (code) => {
    try {
         const tokenResponse = await axios.post(
        "https://github.com/login/oauth/access_token",
        {
            client_id: githubClientID,
            client_secret: githubClientSecret,
            code,
            redirect_uri: githubCallbackUrl
        },
        {
            headers: {
                Accept: "application/json"
            }
        }
    );

    return tokenResponse   
    } catch (error) {
        throw new Error(error.message)
    }
}

module.exports = {
    generateLoginUrl,
    getGithubUser,
    getGithubRepos,
    linkGithubWithUser,
    getAccessTokenFromCode
};