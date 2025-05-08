const cloudinary = require("cloudinary").v2;
const { logger } = require("../utils/logger");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadMediaToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
      },
      (err, result) => {
        if (err) {
          logger.error("Error while uploading Media", err);
          reject(err);
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(file.buffer);
  });
};

const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    logger.info("Media Deleted Successfully from Cloudinary", publicId);
    return result;
  } catch (error) {
    logger.error("Error Deleting media from cloudinary", error);
    throw error;
  }
};
module.exports = { uploadMediaToCloudinary, deleteFromCloudinary };
