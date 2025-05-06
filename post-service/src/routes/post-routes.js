const express = require("express");
const { authenticateRequest } = require("../middleware/authMiddleware");
const {
  createPost,
  getALLPosts,
  getSinglePost,
  deletePost,
} = require("../controllers/postController");
const router = express();
// Inline middleware to attach user
const attachUser = (req, res, next) => {
  const userId = req.headers["x-user-id"];
  if (!userId) {
    return res.status(401).json({ message: "User ID missing in headers" });
  }
  req.user = { userId };
  next();
};
router.use(authenticateRequest);
router.post("/create-post", attachUser, createPost);
router.get("/all-posts", attachUser, getALLPosts);
router.get("/:id", attachUser, getSinglePost);
router.delete("/:id", attachUser, deletePost);

module.exports = router;
