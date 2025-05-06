const Post = require("../models/Post");
const { post } = require("../routes/post-routes");
const { logger } = require("../utils/logger");
const { validateCreatePost } = require("../utils/validation");

async function invalidatePostCach(req, input) {
  const cachedKey = `post:${input}`;
  await req.redisClient.del(cachedKey);
  const keys = await req.redisClient.keys("posts:*");
  if (keys.length > 0) {
    await req.redisClient.del(keys);
  }
}

const createPost = async (req, res) => {
  logger.info("Create post endPoint hit");

  try {
    // const { content, mediaIds } = req.body;
    const { error } = validateCreatePost(req.body);
    if (error) {
      logger.warn("validation Error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    const { content, mediaIds } = req.body;
    const newelyCreatedPost = new Post({
      user: req.user.userId,
      content,
      mediaIds: mediaIds || [],
    });
    await newelyCreatedPost.save();
    await invalidatePostCach(req, newelyCreatedPost._id.toString());
    logger.info("Post Created Successfully");
    res.status(201).json({
      success: true,
      message: "Post Created Successfully",
    });
  } catch (error) {
    logger.error("Error Creating Post", error);
    res.status(500).json({
      success: false,
      message: "Error Creating Post",
    });
  }
};
const getALLPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const cachKey = `posts: ${page}:${limit}`;
    const cachPosts = await req.redisClient.get(cachKey);
    if (cachPosts) {
      return res.json(JSON.parse(cachPosts));
    }
    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);
    const totalNumberOfPosts = await Post.countDocuments();
    const result = {
      posts,
      currentPage: page,
      totalPages: Math.ceil(totalNumberOfPosts / limit),
      totalPosts: totalNumberOfPosts,
    };
    //save posts in the Redis
    await req.redisClient.setex(cachKey, 300, JSON.stringify(result));
    res.json(result);
  } catch (error) {
    logger.error("Error Fetching Post", error);
    res.status(500).json({
      success: false,
      message: "Error Fetching Post",
    });
  }
};
const getSinglePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const cachKey = `post:${postId}`;
    const cachedPost = await req.redisClient.get(cachKey);
    if (cachedPost) {
      return res.json(JSON.parse(cachedPost));
    }
    const postDetailsById = await Post.findById(postId);
    if (!postDetailsById) {
      return res.status(404).json({
        success: false,
        message: "Post Not Found",
      });
    }

    req.redisClient.setex(cachKey, 3600, JSON.stringify(postDetailsById));
    res.status(200).json(postDetailsById);
  } catch (error) {
    logger.error("Error Fetching Post", error);
    res.status(500).json({
      success: false,
      message: "Error Fetching Post By Id",
    });
  }
};
const deletePost = async (req, res) => {
  try {
    const post = await Post.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post Not Found",
      });
    }

    await invalidatePostCach(req, req.params.id);
    res.json({
      message: "Post deleted successfully",
    });
  } catch (error) {
    logger.error("Error Delete Post", error);
    res.status(500).json({
      success: false,
      message: "Error Deleting Post By Id",
    });
  }
};

module.exports = { createPost, getALLPosts, getSinglePost, deletePost };
