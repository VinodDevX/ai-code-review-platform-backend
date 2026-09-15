// worker.ts
const { Queue, Worker } = require('bullmq')
const IORedis = require('ioredis')
const { REVIEW_CODE, LLM_PROCESSING } = require('../modules/github/github.constants')
const redisConnection = require('./redis');
const { ChatOpenAI, tools } = require("@langchain/openai");
const { openAIKey } = require("../config/env");

const connection = new IORedis({ host: 'localhost', port: 6379, maxRetriesPerRequest: null });

const queue = new Queue(LLM_PROCESSING, {
    connection: redisConnection
});

const model = new ChatOpenAI({ model: "gpt-5.6-sol", apiKey: openAIKey });


const worker = new Worker(LLM_PROCESSING, async (job) => {
    console.log(`Processing job ${job.id}: ${job.name}`);

    if (job.name === REVIEW_CODE) {
        const response = await model.invoke(`Perform a detailed code review on the following code. Make sure to point out vulnerablities, suggestions, coding practices, folder structer and other important aspects to maintain the high quality code. Code: - ${job.code}`, {
            tools: [tools.codeInterpreter()]
        });


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
