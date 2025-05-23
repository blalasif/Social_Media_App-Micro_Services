const { uploadMediaToCloudinary } = require("../utils/cloudinary");
const { logger } = require("../utils/logger");
const Media = require("../models/Media");
const uploadMedia = async (req, res, next) => {
  logger.info("Starting media upload", req.file);

  try {
    if (!req.file) {
      logger.error("File is required");
      return res.status(400).json({
        success: false,
        message: "File is required",
      });
    }

    const { originalname, mimeType, buffer } = req.file;
    const userId = req.user.userId;
    logger.info(`File details name=${originalname},type=${mimeType}`);
    logger.info("Uploading to the Cloudinary is starting");
    const cloudinaryUploadResult = await uploadMediaToCloudinary(req.file);
    logger.info(
      `Cloudinary Upload successfull Public id ==>${cloudinaryUploadResult.public_Id}`
    );
    const newelyCreatedMedia = new Media({
      publicId: cloudinaryUploadResult.public_id,
      originalname,
      mimeType,
      url: cloudinaryUploadResult.secure_url,
      userId,
    });
    await newelyCreatedMedia.save();
    res.status(201).json({
      success: true,
      mediaId: newelyCreatedMedia._id,
      url: newelyCreatedMedia.url,
      message: "Media Uploaded Successfully",
    });
  } catch (error) {
    logger.error("Error Uploaded Media", error);
    res.status(500).json({
      success: false,
      message: "Error Uploaded Media",
    });
  }
};

const getAllMedia = async (req, res) => {
  try {
    const result = await Media.find({});
    res.json({ result });
  } catch (error) {
    logger.error("Error Getting Media", error);
    res.status(500).json({
      success: false,
      message: "Error Getting Media",
    });
  }
};

module.exports = { uploadMedia, getAllMedia };
