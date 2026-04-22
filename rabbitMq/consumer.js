const amqplib = require("amqplib");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "somgorai726@gmail.com",
    pass: "jbpg sxbz rxls epxm"
  }
});

async function sendEmail(to, subject) {
  await transporter.sendMail({
    from: "somgorai726@gmail.com",
    to,
    subject,
    text: "This is a test email from RabbitMQ"
  });
  console.log(`✅ Email sent to ${to}`);
}

async function startConsumer() {
  const connection = await amqplib.connect("amqp://localhost");
  const channel = await connection.createChannel();
  await channel.assertExchange("email-exchange", "direct", { durable: true });
  await channel.assertQueue("email-queue", { durable: true });
  await channel.bindQueue("email-queue", "email-exchange", "email.*");

  channel.prefetch(1);  // process one message at a time

  console.log("RabbitMQ connected");

  channel.consume("email-queue", async (msg) => {
    if (!msg) return;

    try {
      const data = JSON.parse(msg.content.toString());

      await sendEmail(data.to, data.subject);

      channel.ack(msg); // success
    } catch (err) {
      console.error("❌ Error processing message:", err);

      // Option 1: retry
      channel.nack(msg, false, true);

      // Option 2 (better): send to DLQ later
    }
  });
}

startConsumer();