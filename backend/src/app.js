const express = require("express");
const cors = require("cors");
const path = require('path')
const authRoutes = require("./modules/auth/auth.routes");
const githubRoutes = require("./modules/github/github.routes");
const errorHandler = require("./middleware/errorHandler");
const session = require('express-session');
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");

const app = express();
const publicPath = path.join(process.cwd(), 'public'); 

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));

app.use(express.static(publicPath));

app.use(cookieParser())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

app.use(session({
    secret: 'gfg-key',
    resave: false,
    saveUninitialized: true
}));

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "AI Code Review API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/github", githubRoutes);


app.use(errorHandler);

module.exports = app;