require("dotenv").config();
const express = require("express");

const mongoose = require("mongoose");
const Redis = require("ioredis");
const cors = require("cors");
const helmet = require("helmet");
const { errorHandler } = require("../middleware/errorHandler");
const { logger } = require("../utils/logger");
const searchRoutes = require("../routes/search-routes");

const { connectRabbitMQ, ConsumeEvent } = require("../utils/rabbitmq");
const {
  handlePostCreated,
  handlePostDeleted,
} = require("../eventHandlers/search-event-handler");

const app = express();
const PORT = process.env.PORT || 3004;
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

app.use("/api/search", searchRoutes);
app.use(errorHandler);
async function startServer() {
  try {
    await connectRabbitMQ();
    //consume or subscrbe the event
    await ConsumeEvent("post.created", handlePostCreated);
    await ConsumeEvent("post.deleted", handlePostDeleted);
    app.listen(PORT, (req, res) => {
      logger.info(`Search  service is running on PORT ${PORT}`);
    });
  } catch (e) {
    logger.error(e, "Failed to search service");
    process.exit();
  }
}

startServer();
