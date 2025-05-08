const express = require("express");
const multer = require("multer");
const { uploadMedia, getAllMedia } = require("../controllers/mediaController");
const {
  authenticateRequest,
} = require("../../post-service/src/middleware/authMiddleware");
const { logger } = require("../utils/logger");

const router = express();

const attachUser = (req, res, next) => {
  const userId = req.headers["x-user-id"];
  if (!userId) {
    return res.status(401).json({ message: "User ID missing in headers" });
  }
  req.user = { userId };
  next();
};
//configure multer

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
}).single("file");

router.post(
  "/upload",
  authenticateRequest,
  attachUser,
  (req, res, next) => {
    upload(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        logger.error("Multer Error", err);
        return res.status(400).json({
          message: "Multer Error While Uploading",
          error: err.message,
          stack: err.stack,
        });
      } else if (err) {
        logger.error("Unknown error occure");
        return res.status(500).json({
          message: "Unknown error occure",
          error: err.message,
          stack: err.stack,
        });
      }
      if (!req.file) {
        return res.status(400).json({
          message: "NO File Found",
        });
      }
      next();
    });
  },
  uploadMedia
);

router.get("/get", authenticateRequest, getAllMedia);
module.exports = router;
