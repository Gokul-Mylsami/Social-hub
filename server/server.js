const dotenv = require("dotenv");

const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const fs = require("fs");
const util = require("util");
const unlinkFile = util.promisify(fs.unlink);

const upload = multer({ dest: "uploads/" });
const { uploadFile, getFileStream } = require("./utils/s3");

const postRoutes = require("./routes/postRoutes");
const globalErrorHandler = require("./controllers/errorController");

dotenv.config();

const app = express();

app.use(express.json());

app.use("/api/v1/", postRoutes);

// app.get("/images/:key", (req, res) => {
//   const key = req.params.key;
//   const readStream = getFileStream(key);

//   readStream.pipe(res);
// });

// app.post("/images", upload.single("image"), async (req, res) => {
//   const file = req.file;
//   const result = await uploadFile(file);
//   await unlinkFile(file.path);
//   console.log(result);
//   res.send({ imagePath: `/images/${result.Key}` });
// });

app.use(globalErrorHandler);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDb Successfully ");
    app.listen(8000, () => {
      console.log("Listening on port " + process.env.PORT);
    });
  })
  .catch((err) => console.log(err));
