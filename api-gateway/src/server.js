require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Redis = require("ioredis");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { logger } = require("./utils/logger");
const proxy = require("express-http-proxy");
const { errorHandler } = require("../middleware/errorHandler");
const validateToken = require("../middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT;

const redisClient = new Redis(process.env.REDIS_URL);
app.use(cors());
app.use(helmet());
app.use(express.json());

//rate limiting
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
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

app.use(rateLimiter);

app.use((req, res, next) => {
  logger.info(`Recieved ${req.method} request to ${req.url}`);
  logger.info(`Request Body ${req.body}`);
  next();
});

const proxyOptions = {
  // proxyReqPathResolver: (req) => {
  //   return req.originalUrl.replace(/^\/v1/, "/api");
  // },
  proxyReqPathResolver: (req) => {
    const resolvedPath = req.originalUrl.replace(/^\/v1/, "/api");
    logger.info(`Proxying request to: ${resolvedPath}`);
    return resolvedPath;
  },
  proxyErrorHandler: (err, res, next) => {
    logger.error(`Proxy Error: ${err.message}`);
    res.status(500).json({
      message: `Internal Server error`,
      error: err.message,
    });
  },
};

//settting up proxy for our identity service

app.use(
  "/v1/auth",
  proxy(process.env.IDENTITY_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response is recieved for identity service ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
  })
);
//settting up proxy for our Post service
app.use(
  "/v1/posts",
  validateToken,
  proxy(process.env.POST_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response is recieved for Post service ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
  })
);

//setting up the proxy for media service

app.use(
  "/v1/media",
  validateToken,
  proxy(process.env.MEDIA_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
      const contentType = srcReq.headers["content-type"];
      if (contentType && !contentType.startsWith("multipart/form-data")) {
        proxyReqOpts.headers["Content-Type"] = "application/json";
      }
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response is recieved for Media service ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
    parseReqBody: false,
  })
);

app.use(errorHandler);
app.get("/", (req, res) => {
  res.send("Hello world");
});
app.listen(PORT, (req, res) => {
  // res.json({ message: "Api-Gateway is running on PORT 2000" });
  logger.info(`API gateway is running on PORT ${PORT}`);

  logger.info(
    `Identity Service is running on PORT ${process.env.IDENTITY_SERVICE_URL}`
  );
  logger.info(
    `Post Service is running on PORT ${process.env.POST_SERVICE_URL}`
  );
  logger.info(
    `Media Service is running on PORT ${process.env.MEDIA_SERVICE_URL}`
  );
  logger.info(`Redis Url ${process.env.REDIS_URL}`);
});

//proxt logic here
// api-gateway ---> /v1/auth/register --> 3000
// identity ------> /api/auth/register --> 3001

// localhost:3000/v1/auth/register ----> locahost:3001/api/auth/register
