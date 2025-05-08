const amqp = require("amqplib");
const { logger } = require("../utils/logger");
let connection = null;
let channel = null;

const EXCHANGE_NAME = "facebook-event";

async function connectRabbitMQ() {
  try {
    connection = await amqp.connect(process.env.RABITMQ_URL); // assign to `connection`, not the function name
    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: false });
    logger.info("Connected to RabbitMq");
    return channel;
  } catch (error) {
    logger.error("Error during Connnecting RabbitMQ", error);
  }
}

async function publishEvent(routingKey, message) {
  if (!channel) {
    await connectRabbitMQ();
  }
  channel.publish(
    EXCHANGE_NAME,
    routingKey,
    Buffer.from(JSON.stringify(message))
  );
  logger.info(`Event published: ${routingKey}`);
}
module.exports = { connectRabbitMQ, publishEvent };
