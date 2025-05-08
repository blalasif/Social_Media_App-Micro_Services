const { logger } = require("../../utils/logger");
const Media = require("../../models/Media");
const { deleteFromCloudinary } = require("../../utils/cloudinary");

const handlePostDeleted = async (event) => {
  console.log("🚀 ~ handlePostDeleted ~ event:", event);
  const { postId, mediaIds } = event;
  try {
    const mediaToDelete = await Media.find({ _id: { $in: mediaIds } });
    for (const media of mediaToDelete) {
      console.log("Deleting from Cloudinary:", media.publicId);

      await deleteFromCloudinary(media.publicId);
      await Media.findByIdAndDelete(media._id);
      logger.info(
        `Deleted media ${media._id} associated with this deleted post ${postId}`
      );
    }
    logger.info(`Processed deletion of media for post Id ${postId}`);
  } catch (error) {
    console.log("🚀 ~ handlePostDeleted ~ error:", error);
  }
};

module.exports = { handlePostDeleted };
