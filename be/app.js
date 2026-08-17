const express = require("express");
require("dotenv").config();
const routes = require("./routes");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors({
  origin: "*",
}));
app.get("/", (req, res) => {
  res.send("API is running 123");
});

app.use(routes);

module.exports = app;
