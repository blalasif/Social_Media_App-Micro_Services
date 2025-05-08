require("dotenv").config();
const express = require("express");

const mongoose = require("mongoose");
const Redis = require("ioredis");
const cors = require("cors");
const helmet = require("helmet");
const postRoutes = require("./routes/post-routes");
const { errorHandler } = require("./middleware/errorHandler");
const { logger } = require("./utils/logger");
const { connectRabbitMQ } = require("./utils/rabbitmq");

const app = express();
const PORT = process.env.PORT || 3002;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => logger.info("connected to Database"))
  .catch((error) => logger.error("Mongo DB connection error", error));
const redisClient = new Redis(process.env.REDIS_URL);
//middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  logger.info(`Recieved ${req.method} request to ${req.url}`);
  logger.info(`Request Body ${req.body}`);
  next();
});

// --routes --> pass redisClient
app.use(
  "/api/posts",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  postRoutes
);

app.use(errorHandler);

async function startServer() {
  try {
    await connectRabbitMQ();

    app.listen(PORT, (req, res) => {
      logger.info(`Post  service is running on PORT ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to connect with RabbitMq server", error);
    process.exit(1);
  }
}
startServer();

//unhandled promise rejection handler

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at", promise, "reason", reason);
});
