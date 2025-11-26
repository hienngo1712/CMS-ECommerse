const express = require("express");
require("dotenv").config();
const routes = require("./routes");
const cors = require("cors")
const app = express();

const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors({
  origin: "*",
}))
app.get("/", (req, res) => {
  res.send("API is running 123");
});

app.use(routes);

app.listen(PORT, () =>{
  console.log("SERVER running on PORT", PORT);
});