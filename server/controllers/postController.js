const mongoose = require("mongoose");
const fs = require("fs");
const util = require("util");

const AppError = require("../utils/appError");
const unlinkFile = util.promisify(fs.unlink);
const catchAsync = require("../utils/catchAsync");

const Post = require("../models/PostModel");
const { uploadFile, getFileStream } = require("../utils/s3");

const getAllPost = catchAsync(async (req, res, next) => {
  const posts = await Post.find();

  res.status(200).json({ staus: "success", length: posts.length, data: posts });
});

const getSinglePost = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return next(new Error("No post found", 400));
  }

  const post = await Post.findOne({ _id: id });

  res.status(200).json({ staus: "success", data: post });
});

const addPost = catchAsync(async (req, res, next) => {
  const { title, description } = req.body;
  const file = req.file;

  const result = await uploadFile(file);
  await unlinkFile(file.path);

  const newPost = await Post.create({ title, description, image: result.Key });

  res.status(200).json({ status: "success", data: newPost });
});

const updatePost = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { title, description } = req.body;

  if (!mongoose.isValidObjectId(id)) {
    return next(new Error("No post found", 400));
  }

  const updatedPost = await Post.findByIdAndUpdate(
    id,
    { title, description },
    { new: true, runValidators: true }
  );

  if (!updatedPost) {
    return next(new Error("No post found"));
  }

  res.status(200).json({ status: "success", data: updatedPost });
});

const getImage = (req, res) => {
  const key = req.params.id;
  const readStream = getFileStream(key);

  readStream.pipe(res);
};

module.exports = { addPost, getAllPost, getSinglePost, updatePost, getImage };
