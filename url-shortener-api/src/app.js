const express = require("express");
const morgan = require("morgan");
const urlRoutes = require("./routes/url.routes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(express.json());
app.use(morgan("dev"));
app.use("/", urlRoutes);

app.use(errorHandler); // must be registered LAST

module.exports = app;