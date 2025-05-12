const amqp = require("amqplib");
const { logger } = require("../utils/logger");

let connection = null;
let channel = null;

const EXCHANGE_NAME = "facebook-event";

async function connectRabbitMQ() {
  try {
    if (connection && channel) return channel; // Reuse existing channel

    connection = await amqp.connect(process.env.RABITMQ_URL); // ✅ FIXED
    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: false });

    logger.info("Connected to RabbitMq");
    return channel;
  } catch (error) {
    logger.error("Error during Connecting RabbitMQ", error);
    throw error;
  }
}

async function ConsumeEvent(routingKey, callback) {
  if (!channel) {
    await connectRabbitMQ();
  }

  const q = await channel.assertQueue("", { exclusive: true }); // temporary, auto-deleted queue
  await channel.bindQueue(q.queue, EXCHANGE_NAME, routingKey);

  channel.consume(q.queue, (msg) => {
    if (msg !== null) {
      try {
        const content = JSON.parse(msg.content.toString());
        callback(content);
        channel.ack(msg);
      } catch (error) {
        logger.error("Failed to handle consumed message", error);
        channel.nack(msg); // Optional: requeue if needed
      }
    }
  });

  logger.info(`Subscribed to the Event: ${routingKey}`);
}

module.exports = { connectRabbitMQ, ConsumeEvent };
