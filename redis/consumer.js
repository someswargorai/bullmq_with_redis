const redis = require('../config/redis_connection.js');

async function consumer() {
    try {
        await redis.xgroup("CREATE", "message", "group1", "0", "MKSTREAM");
        console.log("Consumer group created successfully");
    } catch (err) {
        if (err.message.includes('BUSYGROUP')) {
            console.log("Consumer group already exists");
        } else {
            console.error(err);
        }
    }


    const pending = await redis.xreadgroup("GROUP", "group1", "group1-worker-node",
        "COUNT", 10,
        "STREAMS", "message", "0"
    );

    if (pending && pending.length > 0) {
        const [, messages] = pending[0];
        console.log(messages);
        for (const [id, data] of messages) {
            console.log("Pending:", id, data);
            await redis.xack("message", "group1", id);
        }
    }

    while (true) {
        const listenFromNowOn = await redis.xreadgroup("GROUP", "group1", "group1-worker-node",
            "COUNT", 10,
            "BLOCK", 0, // Blocks indefinitely until new messages arrive
            "STREAMS", "message", ">"
        );

        if (listenFromNowOn && listenFromNowOn.length > 0) {
            const [, messages] = listenFromNowOn[0];

            for (const [id, data] of messages) {
                console.log("New:", id, data);
                await redis.xack("message", "group1", id);
            }
        }
    }
}

consumer();
