require("dotenv").config();

const express = require("express");

const mongoose = require("mongoose");
const Redis = require("ioredis");
const cors = require("cors");
const { errorHandler } = require("./middleware/errorHandler");
const { logger } = require("../utils/logger");
const mediaRoutes = require("../routes/mediaRoutes");
const app = express();
const PORT = process.env.PORT || 3003;
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => logger.info("connected to Database"))
  .catch((error) => logger.error("Mongo DB connection error", error));
const redisClient = new Redis(process.env.REDIS_URL);
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  logger.info(`Recieved ${req.method} request to ${req.url}`);
  logger.info(`Request Body ${req.body}`);
  next();
});

app.use("/api/media", mediaRoutes);
app.use(errorHandler);
app.listen(PORT, (req, res) => {
  logger.info(`Media  service is running on PORT ${PORT}`);
});

//unhandled promise rejection handler

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at", promise, "reason", reason);
});
