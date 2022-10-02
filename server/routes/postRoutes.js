const express = require("express");
const {
  addPost,
  getAllPost,
  getSinglePost,
  updatePost,
  getImage,
} = require("../controllers/postController");
const multer = require("multer");

const upload = multer({ dest: "uploads/" });

const router = express.Router();

router.get("/", getAllPost);
router.get("/:id", getSinglePost);
router.post("/createPost", upload.single("image"), addPost);
router.put("/:id/update", updatePost);
router.get("/image/:id", getImage);

module.exports = router;
