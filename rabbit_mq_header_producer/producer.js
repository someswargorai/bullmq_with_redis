const amqp = require("amqplib");

let channel;
let connection;

async function connectRabbitMQHeaders() {
    connection = await amqp.connect("amqp://localhost");
    channel =  await connection.createChannel();
    console.log("Headers exchange RabbitMQ connected");
    await channel.assertExchange("email_exchange", "headers", { durable: true });
}


async function producer(headers, message) {

    try {
        await channel.publish("email_exchange", "", Buffer.from(JSON.stringify(message)), { headers });
        console.log("Message sent to queue");
    }
    catch (err) {
        console.log(err);
    }
}


module.exports = { producer, connectRabbitMQHeaders };