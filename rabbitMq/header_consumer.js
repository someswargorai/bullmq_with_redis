const amqp = require("amqplib");
const nodemailer = require("nodemailer");


let connection;
let channel;

// ─── Connection with Retry ────────────────────────────────────────────────────
async function connectWithRetry(retries = 5, delay = 3000) {
    for (let i = 0; i < retries; i++) {
        try {
            connection = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");

            connection.on("error", (err) => {
                console.error("RabbitMQ connection error:", err.message);
                reconnect();
            });

            connection.on("close", () => {
                console.warn("RabbitMQ connection closed. Reconnecting...");
                reconnect();
            });

            console.log("✅ RabbitMQ connected");
            return;
        } catch (err) {
            console.error(`RabbitMQ connect failed. Retry ${i + 1}/${retries}: ${err.message}`);
            if (i < retries - 1) await sleep(delay);
        }
    }
    throw new Error("RabbitMQ connection failed after max retries");
}

async function reconnect() {
    try {
        await sleep(3000);
        await connectWithRetry();
        await setupConsumer();
    } catch (err) {
        console.error("Reconnect failed:", err.message);
    }
}

// ─── Exchange + Queue + DLQ Setup ────────────────────────────────────────────
async function setupConsumer() {
    channel = await connection.createChannel();

    // Prefetch — process only 5 messages at a time
    channel.prefetch(5);

    // 1. Main exchange (headers)
    await channel.assertExchange("email_exchange", "headers", { durable: true });

    // 2. Dead letter exchange (direct)
    await channel.assertExchange("email_dlx", "direct", { durable: true });

    // 3. Dead letter queue — where failed messages land
    await channel.assertQueue("email_dlq", {
        durable: true,
    });

    // 4. Bind DLQ to DLX with routing key "dead"
    await channel.bindQueue("email_dlq", "email_dlx", "dead");

    // 5. Main processing queue — named + durable + points to DLX on failure
    const q = await channel.assertQueue("email_processing_queue", {
        durable: true,
        arguments: {
            "x-dead-letter-exchange": "email_dlx",
            "x-dead-letter-routing-key": "dead",
        },
    });

    // 6. Bind main queue to email_exchange with header matching
    await channel.bindQueue(q.queue, "email_exchange", "", {
        "x-match": "all",
        "notification-type": "email",
        "content-type": "text",
    });

    // 7. Start consuming
    channel.consume(q.queue, async (msg) => {
        if (!msg) return;

        let content;

        try {
            content = JSON.parse(msg.content.toString());
        } catch (err) {
            // Malformed JSON — no point requeuing, send straight to DLQ
            console.error("❌ Failed to parse message. Sending to DLQ:", err.message);
            channel.nack(msg, false, false); // false = don't requeue → goes to DLX/DLQ
            return;
        }

        // Validate required fields
        if (!content.to || !content.subject) {
            console.error("❌ Missing 'to' or 'subject'. Sending to DLQ:", content);
            channel.nack(msg, false, false); // invalid shape → DLQ
            return;
        }

        try {
            await sendMailWithRetry(content.to, content.subject);
            console.log(`✅ Email sent to ${content.to}`);
            channel.ack(msg);
        } catch (err) {
            // All retries exhausted → send to DLQ
            console.error(`❌ Email failed after retries. Sending to DLQ:`, err.message);
            channel.nack(msg, false, false); // false = don't requeue → goes to DLX/DLQ
        }
    });

    console.log("✅ Consumer ready. Listening on email_processing_queue...");
}

// ─── Email with Retry + Backoff ───────────────────────────────────────────────
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "somgorai726@gmail.com",
        pass: "jbpg sxbz rxls epxm",
    },
});

async function sendMailWithRetry(to, subject, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            await transporter.sendMail({
                from: "somgorai726@gmail.com",
                to,
                subject,
                text: "This is a test email from RabbitMQ Header exchange",
            });
            return; // success
        } catch (err) {
            console.warn(`⚠️ Email attempt ${i + 1}/${retries} failed: ${err.message}`);
            if (i < retries - 1) await sleep(2000 * (i + 1)); // 2s, 4s backoff
            else throw err; // exhausted → caller sends to DLQ
        }
    }
}

// ─── DLQ Monitor (optional — logs dead letters) ──────────────────────────────
async function monitorDLQ() {
    const dlqChannel = await connection.createChannel();

    dlqChannel.consume("email_dlq", (msg) => {
        if (!msg) return;

        const content = msg.content.toString();
        const reason = msg.properties.headers?.["x-death"]?.[0]?.reason || "unknown";

        console.error(`💀 Dead letter received | reason: ${reason} | content: ${content}`);

        // You can save to DB, alert on Slack, trigger a webhook, etc.

        dlqChannel.ack(msg);
    });

    console.log("👁️  DLQ monitor active on email_dlq...");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function sleep(ms) {
    return new Promise((res) => setTimeout(res, ms));
}

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
async function shutdown() {
    console.log("Shutting down...");
    try {
        await channel?.close();
        await connection?.close();
    } catch (_) {}
    process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// ─── Bootstrap ───────────────────────────────────────────────────────────────
(async () => {
    await connectWithRetry();
    await setupConsumer();
    await monitorDLQ();
})();