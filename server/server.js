const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const communityRoutes = require("./routes/communityRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    message: "Too many requests. Please try again later.",
  },
});

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    message: "Too many login or register attempts. Please try again later.",
  },
});

app.use(apiRateLimiter);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.json({
    message: "CommunityHub secure API is running.",
  });
});

app.use("/api/auth", authRateLimiter, authRoutes);
app.use("/api/communities", communityRoutes);
app.use("/api/admin", adminRoutes);

app.use((err, req, res, next) => {
  console.error(err.message);

  if (err.message === "Only image files are allowed") {
    return res.status(400).json({
      message: "Only JPG, JPEG, PNG, and WEBP image files are allowed.",
    });
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      message: "File size must be below 2 MB.",
    });
  }

  return res.status(500).json({
    message: "Server error.",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`CommunityHub server running on port ${PORT}`);
});