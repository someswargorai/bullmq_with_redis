// queue.js
const { Queue } = require("bullmq");
const IORedis = require("ioredis");

const connection = new IORedis({
  host: "127.0.0.1",
  port: 6379,
});

const emailQueue = new Queue("email-queue", { connection });

async function addEmailJob(data) {
  const job = await emailQueue.add("send-email", data, {
      attempts: 3, 
      backoff: { 
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    }
  );

  console.log("Job added:", job.id);
}

module.exports = addEmailJob;