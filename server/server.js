const dotenv = require("dotenv");

const express = require("express");
const mongoose = require("mongoose");

const postRoutes = require("./routes/postRoutes");
const userRoutes = require("./routes/userRoutes");

const globalErrorHandler = require("./controllers/errorController");

dotenv.config();

const app = express();

app.use(express.json());

app.use("/api/v1/", postRoutes);
app.use("/api/v1/", userRoutes);

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
