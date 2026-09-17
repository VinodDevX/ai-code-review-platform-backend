// worker.ts
const { Queue, Worker } = require('bullmq')
const IORedis = require('ioredis')
const { REVIEW_CODE, LLM_PROCESSING } = require('../modules/github/github.constants')
const redisConnection = require('./redis');
const prisma = require('../config/database');
const { loadRepository, performCodeReview } = require('../modules/github/github.service');

const connection = new IORedis({ host: 'redis', port: 6379, maxRetriesPerRequest: null });

const queue = new Queue(LLM_PROCESSING, {
    connection: redisConnection
});

const worker = new Worker(LLM_PROCESSING, async (job) => {
    console.log(`Processing job ${job.id}: ${job.name}`);

    if (job.name === REVIEW_CODE) {
        const { branch, repo, owner, reviewId, userId } = job;

        try {
            const user = await prisma.user.findUnique({
                where: {
                    id: userId
                },
                include: {
                    oauthAccounts: true
                }
            });

            if (!user) {
                throw new Error(`User ${userId} not found`);
            }

            const githubAccount = user.oauthAccounts.find(account => account.provider === "github");

            if (!githubAccount) {
                throw new Error(
                    "GitHub account not connected"
                );
            }

            const accessToken = githubAccount.accessToken;

            console.log(`Fetching ${owner}/${repo}@${branch}`);

            const repository =
                await loadRepository({
                    accessToken,
                    owner,
                    repo,
                    branch
                });

            console.log(
                `Fetched ${repository.files.length} files`
            );

            const review =
                await performCodeReview(
                    repository
                );

            // 4. Save review
            await prisma.codeReview.update({
                where: {
                    id: reviewId
                },
                data: {
                    status: "COMPLETED",
                    result: review
                }
            });

            console.log(
                `Review ${reviewId} completed`
            );

            return {
                success: true,
                reviewId
            };

        } catch (error) {
            console.error(`Review ${reviewId} failed`, error);

            await prisma.codeReview.update({
                where: {
                    id: reviewId
                },
                data: {
                    status: "FAILED",
                    error: error.message
                }
            });

            throw error;
        }
    }

    // Return value is stored in job.returnvalue
    return { sent: true, timestamp: new Date().toISOString() };
}, {
    connection,
    concurrency: 5  // process up to 5 jobs simultaneously
});

worker.on('completed', (job, returnValue) => {
    console.log(`Job ${job.id} completed:`, returnValue);
});

worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    await worker.close();
    process.exit(0);
});

module.exports = {
    queue
}
