// worker.js
const { Worker } = require("bullmq");
const IORedis = require("ioredis");
const nodemailer = require('nodemailer');

const connection = new IORedis({
    host: "127.0.0.1",
    port: 6379,
    maxRetriesPerRequest: null,
});

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "somgorai726@gmail.com",
        pass: "jbpg sxbz rxls epxm"
    }
})


async function sendEmail(to, subject, text) {
    try {
        await transporter.sendMail({
            from: "somgorai726@gmail.com",
            to,
            subject,
            text: "This is a test email"
        })
    } catch (err) {
        console.log(err);
    }
}

const worker = new Worker("email-queue", async (job) => {
    console.log("Processing job:", job.id, job.name);

    const { to, subject } = job.data;
    sendEmail(to, subject);
    console.log(`Email sent to ${to} with subject ${subject}`);

    return { success: true };
},
    { connection }
);

// events
worker.on("completed", (job) => {
    console.log(`✅ Job completed: ${job.id}`);
});

worker.on("failed", (job, err) => {
    console.log(`❌ Job failed: ${job.id}`, err.message);
});