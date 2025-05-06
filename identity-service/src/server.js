require("dotenv").config();
const mongoose = require("mongoose");
const { logger } = require("./utils/logger");
const helmet = require("helmet");
const cors = require("cors");
const { RateLimiterRedis } = require("rate-limiter-flexible");
const Redis = require("ioredis");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const routes = require("../src/routes/identity-server");

const express = require("express");
const { errorHandler } = require("./middleware/errorHandler");
const app = express();
const PORT = process.env.PORT;
//connection
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
//DDOS protection and rate-limiting
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "middleware",
  points: 10, //10 request
  duration: 1, // in 1 second
});

app.use((req, res, next) => {
  rateLimiter
    .consume(req.ip)
    .then(() => next())
    .catch(() => {
      logger.warn(`Rate limit exceeded for IP: ${ip}`);
      res.status(429).json({
        success: false,
        message: "Too many requests",
      });
    });
});

//IP based rate-limiting
const sensitiveEndPointRateLimiting = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    logger.warn(`Sensitive end point rate limit exceeded for IP ${req.ip}`);
    res.status(429).json({
      success: false,
      message: "Too many requests",
    });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

//apply sensitive endpoits -limiters to our routes

app.use("/api/auth/register", sensitiveEndPointRateLimiting); // 👈 apply first
app.use("/api/auth", routes); // 👈 then mount the route

//error handler

app.use(errorHandler);

app.listen(PORT, (req,res) => {
  logger.info(`Indentity service is running on PORT ${PORT}`);
  
});

//unhandled promise rejection handler

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at", promise, "reason", reason);
});
