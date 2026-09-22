const axios = require("axios");
const prisma = require("../../config/database");
const { githubClientID, githubCallbackUrl, githubClientSecret, openAIKey } = require("../../config/env");
const { STATUS_ENUM, AUTH_PROVIDERS, IGNORED_DIRECTORIES, IGNORED_FILES, ALLOWED_EXTENSIONS } = require("./github.constants");
const { Octokit } = require("octokit");
const { OpenAI } = require("@langchain/openai");
const { generateAccessToken, generateRefreshToken } = require("../../utils/jwt");
const { hashToken } = require("../../utils/token");

const llm = new OpenAI({
    model: "gpt-5.6-sol",
    temperature: 0,
    maxTokens: undefined,
    timeout: undefined,
    maxRetries: 2,
    apiKey: openAIKey,
})

const createGithubClient = (accessToken) => {
    return new Octokit({
        auth: accessToken
    });
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
    const octokit = createGithubClient(accessToken);
    const response = await octokit.rest.users.getAuthenticated();
    const { data: emails } = await octokit.rest.users.listEmailsForAuthenticatedUser();

    const primaryEmail = emails.find(email => email.primary)?.email ||
        emails.find(email => email.verified)?.email || null;

    return {...response.data, email: primaryEmail};
};

const getGithubRepos = async (accessToken, page = 1, perPage = 30) => {
    const octokit = createGithubClient(accessToken);

    const response = await octokit.paginate("GET /user/repos", {
        page,
        per_page: perPage,
        visibility: 'all',
        sort: 'updated',
        direction: 'desc'
    });

    return response;
};

const linkGithubWithUser = async (data) => {
    const condition = [
        {
            oauthAccounts: {
                some: {
                    provider: AUTH_PROVIDERS['GITHUB'],
                    providerAccountId: String(data.githubId)
                },
            },
        }
    ]

    if (data.email) {
        condition.push({ email: data.email })
    }

    const existingUser = await prisma.user.findFirst({
        where: {
            OR: condition,
        },
        include: {
            oauthAccounts: true,
        },
    });

    if (existingUser) {
        await prisma.oAuthAccount.upsert({
            create: {
                userId: existingUser.id,
                provider: AUTH_PROVIDERS['GITHUB'],
                providerAccountId: String(data.githubId),
                accessToken: data.githubAccessToken,
                refreshToken: data.refresh_token,
                tokenType: data.token_type,
            },
            update: {
                userId: existingUser.id,
                provider: AUTH_PROVIDERS['GITHUB'],
                providerAccountId: String(data.githubId),
                accessToken: data.githubAccessToken,
                refreshToken: data.refresh_token,
                tokenType: data.token_type,
            },
            where: {
                provider_providerAccountId: {
                    provider: "GITHUB",
                    providerAccountId: String(data.githubId),
                },
            }
        })
        const user = await prisma.user.update(
            {
                where: {
                    id: existingUser.id

                },
                data: {
                    name: existingUser.name || data.name,
                    email: existingUser.email || data.email,
                    isEmailVerified: true,
                    lastLoginAt: new Date(),
                }
            }
        );

        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken(user.id);

        await prisma.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash: hashToken(refreshToken),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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

    } else {
        const user = await prisma.user.create(
            {
                data: {
                    name: data.name || data.login,
                    email: data.email,
                    isEmailVerified: true,
                }
            }
        );

        await prisma.oAuthAccount.create({
            data: {
                userId: user.id,
                provider: AUTH_PROVIDERS['GITHUB'],
                providerAccountId: String(data.githubId),
                accessToken: data.githubAccessToken,
                refreshToken: data.refresh_token,
                tokenType: data.token_type,
            }
        })

        return {
            id: user.id,
            name: user.name,
            email: user.email,
        };
    }
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

        return tokenResponse.data
    } catch (error) {
        throw new Error(error.message)
    }
}

const startCodeReview = async (githubRepoId) => {
    try {
        return await prisma.codeReview.create({
            data: {
                status: STATUS_ENUM.PENDING,
                githubRepoId: githubRepoId
            }
        })
    } catch (error) {
        throw new Error(error.message)
    }
}

const getRepositoryTree = async ({
    accessToken,
    owner,
    repo,
    branch
}) => {
    const octokit = createGithubClient(accessToken);
    // First get the branch SHA
    const branchResponse = await octokit.rest.repos.getBranch({
        owner,
        repo,
        branch
    });

    const sha = branchResponse.data.commit.sha;

    // Get complete repository tree
    const treeResponse = await octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: sha,
        recursive: "true"
    });

    return {
        sha,
        tree: treeResponse.data.tree
    };
}

async function getFileContent({
    accessToken,
    owner,
    repo,
    path,
    ref
}) {
    const octokit = createGithubClient(accessToken);

    const response = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref
    });

    if (Array.isArray(response.data)) {
        return null;
    }

    if (response.data.type !== "file") {
        return null;
    }

    if (!response.data.content) {
        return null;
    }

    return Buffer
        .from(response.data.content, "base64")
        .toString("utf-8");
}

function shouldReviewFile(path, size = 0) {

    // Ignore directories
    if (
        IGNORED_DIRECTORIES.some(directory =>
            path.startsWith(directory)
        )
    ) {
        return false;
    }

    // Ignore specific files
    if (IGNORED_FILES.includes(path)) {
        return false;
    }

    // Ignore huge files
    if (size > 500_000) {
        return false;
    }

    // Only review known source/config files
    return ALLOWED_EXTENSIONS.some(extension =>
        path.endsWith(extension)
    );
}

async function loadRepository({
    accessToken,
    owner,
    repo,
    branch
}) {

    const { sha, tree } = await getRepositoryTree({
        accessToken,
        owner,
        repo,
        branch
    });

    const files = tree.filter(file => {
        return (
            file.type === "blob" &&
            shouldReviewFile(file.path, file.size)
        );
    });

    console.log(
        `Found ${files.length} files eligible for review`
    );

    const repositoryFiles = [];

    for (const file of files) {

        try {

            const content = await getFileContent({
                accessToken,
                owner,
                repo,
                path: file.path,
                ref: sha
            });

            if (!content) {
                continue;
            }

            repositoryFiles.push({
                path: file.path,
                size: file.size,
                sha: file.sha,
                content
            });

        } catch (error) {

            console.error(
                `Failed to fetch ${file.path}`,
                error.message
            );
        }
    }

    return {
        owner,
        repo,
        branch,
        sha,
        files: repositoryFiles
    };
}

async function performCodeReview(repository) {

    const repositoryContext =
        repository.files
            .map(file => {
                return `
FILE: ${file.path}

\`\`\`
${file.content}
\`\`\`
`;
            })
            .join("\n");

    const prompt = `
You are a senior software engineer performing
a comprehensive code review.

Repository:
${repository.owner}/${repository.repo}

Branch:
${repository.branch}

Commit:
${repository.sha}

Review the following repository.

Analyze:

1. Bugs
2. Security vulnerabilities
3. Authentication/authorization problems
4. Input validation
5. Error handling
6. Database issues
7. Performance problems
8. Concurrency issues
9. Code quality
10. Maintainability
11. Architecture
12. Folder structure
13. SOLID principles
14. Design patterns
15. Dependency problems
16. API design
17. Logging
18. Testing
19. Configuration/secrets
20. Production readiness

For every issue provide:

- severity
- file
- line if identifiable
- category
- description
- why it matters
- suggested fix

Also provide:

- overall architecture observations
- folder structure observations
- security summary
- performance summary
- testing recommendations
- prioritized recommendations

Repository:

${repositoryContext}
`;

    const response = await llm.invoke(prompt);

    return response;
}

module.exports = {
    getGithubUser,
    createGithubClient,
    getGithubRepos,
    linkGithubWithUser,
    getAccessTokenFromCode,
    startCodeReview,
    loadRepository,
    performCodeReview
};