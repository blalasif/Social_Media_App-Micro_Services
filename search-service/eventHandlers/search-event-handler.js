const { logger } = require("../../post-service/src/utils/logger");
const Search = require("../models/Search");

async function handlePostCreated(event) {
  try {
    const newSearchPost = new Search({
      postId: event.postId,
      userId: event.userId,
      content: event.content,
      createdAt: event.createdAt,
    });
    await newSearchPost.save();
    logger.info(
      `Search Post Created ${event.postId},${newSearchPost._id.toString()}`
    );
  } catch (e) {
    logger.error(e, "Error Handling Post creation");
  }
}

async function handlePostDeleted(event) {
  try {
    await Search.findOneAndDelete({ postId: event.postId });
    logger.info(`Search Post Deleted ${event.postId}`);
  } catch (e) {
    logger.error(e, "Error Handling Post deletion event");
  }
}
module.exports = { handlePostCreated, handlePostDeleted };
