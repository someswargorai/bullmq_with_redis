const amqplib = require("amqplib");

let channel;

async function ConnectRabbitMQ(){

    const connection = await amqplib.connect("amqp://localhost");
    channel = await connection.createChannel();
    console.log("RabbitMQ connected");

}


async function publishToQueue(data){
    if (!channel) throw new Error("RabbitMQ not connected");
    await channel.assertExchange("email-exchange","direct",{durable:true});
    channel.publish("email-exchange", "email", Buffer.from(JSON.stringify(data)),{persistent:true});
    console.log("Message sent to queue");
}

module.exports = {ConnectRabbitMQ, channel, publishToQueue};