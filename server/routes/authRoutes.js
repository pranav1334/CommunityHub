const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const { body, validationResult } = require("express-validator");

const pool = require("../db");
const uploadImage = require("../middleware/uploadMiddleware");

require("dotenv").config();

const router = express.Router();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );
}

/*
  REGISTER FLOW

  Normal Register:
  - User fills all fields
  - Password required
  - password_hash stored

  Google Register:
  - User clicks Google popup on frontend
  - Frontend sends google_credential with register form
  - Backend verifies Google token
  - google_id stored
  - Google email is used
  - Google profile picture is used
  - password_hash is NULL
*/
router.post(
  "/register",
  uploadImage.single("profile_picture"),
  [
    body("full_name")
      .trim()
      .isLength({ min: 3 })
      .withMessage("Full name must be at least 3 characters."),

    body("profession")
      .trim()
      .notEmpty()
      .withMessage("Profession is required."),

    body("current_company_college")
      .trim()
      .notEmpty()
      .withMessage("Current company or college is required."),

    body("city")
      .trim()
      .notEmpty()
      .withMessage("City is required."),

    body("bio")
      .trim()
      .isLength({ min: 10 })
      .withMessage("Bio must be at least 10 characters."),

    body("join_reason")
      .trim()
      .isLength({ min: 10 })
      .withMessage("Join reason must be at least 10 characters."),

    body("contribution")
      .trim()
      .isLength({ min: 10 })
      .withMessage("Contribution must be at least 10 characters."),

    body("linkedin_url")
      .trim()
      .isURL()
      .withMessage("Valid LinkedIn URL is required."),

    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required."),

    body("password").custom((value, { req }) => {
      const isGoogleRegister = Boolean(req.body.google_credential);

      if (isGoogleRegister) {
        return true;
      }

      if (!value || value.length < 8) {
        throw new Error("Password must be at least 8 characters.");
      }

      if (!/[A-Z]/.test(value)) {
        throw new Error("Password must contain one uppercase letter.");
      }

      if (!/[a-z]/.test(value)) {
        throw new Error("Password must contain one lowercase letter.");
      }

      if (!/[0-9]/.test(value)) {
        throw new Error("Password must contain one number.");
      }

      return true;
    }),
  ],
  async (req, res) => {
    try {
      const validationErrors = validationResult(req);

      if (!validationErrors.isEmpty()) {
        return res.status(400).json({
          errors: validationErrors.array(),
        });
      }

      let {
        full_name,
        profession,
        current_company_college,
        city,
        bio,
        join_reason,
        contribution,
        linkedin_url,
        email,
        password,
        instagram,
        website,
        google_credential,
      } = req.body;

      let googleId = null;
      let googleProfilePicture = null;

      if (google_credential) {
        const ticket = await googleClient.verifyIdToken({
          idToken: google_credential,
          audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();

        if (!payload || !payload.email_verified) {
          return res.status(401).json({
            message: "Google account is not verified.",
          });
        }

        googleId = payload.sub;
        googleProfilePicture = payload.picture || null;

        // Important: use verified Google email, not manually typed email
        email = payload.email;

        if (!full_name || full_name.trim().length < 3) {
          full_name = payload.name || "Google User";
        }
      }

      const existingUser = await pool.query(
        "SELECT id FROM users WHERE email = $1 OR google_id = $2",
        [email, googleId]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({
          message: "Email is already registered. Please login instead.",
        });
      }

      let passwordHash = null;

      if (!google_credential) {
        const salt = await bcrypt.genSalt(12);
        passwordHash = await bcrypt.hash(password, salt);
      }

      const profilePicturePath = google_credential
        ? googleProfilePicture
        : req.file
        ? `/uploads/${req.file.filename}`
        : null;

      const result = await pool.query(
        `INSERT INTO users
        (
          google_id,
          full_name,
          profile_picture,
          profession,
          current_company_college,
          city,
          bio,
          join_reason,
          contribution,
          linkedin_url,
          email,
          password_hash,
          instagram,
          website
        )
        VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id, full_name, email, role`,
        [
          googleId,
          full_name,
          profilePicturePath,
          profession,
          current_company_college,
          city,
          bio,
          join_reason,
          contribution,
          linkedin_url,
          email,
          passwordHash,
          instagram || null,
          website || null,
        ]
      );

      const registeredUser = result.rows[0];
      const token = createToken(registeredUser);

      return res.status(201).json({
        message: "User registered successfully.",
        token,
        user: {
          id: registeredUser.id,
          full_name: registeredUser.full_name,
          email: registeredUser.email,
          role: registeredUser.role,
        },
      });
    } catch (error) {
      console.error("Register error:", error.message);

      return res.status(500).json({
        message: "Registration failed.",
      });
    }
  }
);

/*
  NORMAL LOGIN
*/
router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required."),

    body("password")
      .notEmpty()
      .withMessage("Password is required."),
  ],
  async (req, res) => {
    try {
      const validationErrors = validationResult(req);

      if (!validationErrors.isEmpty()) {
        return res.status(400).json({
          errors: validationErrors.array(),
        });
      }

      const { email, password } = req.body;

      const result = await pool.query("SELECT * FROM users WHERE email = $1", [
        email,
      ]);

      if (result.rows.length === 0) {
        return res.status(400).json({
          message: "Invalid email or password.",
        });
      }

      const user = result.rows[0];

      if (!user.password_hash) {
        return res.status(400).json({
          message: "This account uses Google login. Please continue with Google.",
        });
      }

      const isPasswordCorrect = await bcrypt.compare(
        password,
        user.password_hash
      );

      if (!isPasswordCorrect) {
        return res.status(400).json({
          message: "Invalid email or password.",
        });
      }

      const token = createToken(user);

      return res.json({
        message: "Login successful.",
        token,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Login error:", error.message);

      return res.status(500).json({
        message: "Login failed.",
      });
    }
  }
);

/*
  GOOGLE LOGIN

  If Google account already registered:
  - Login successful

  If Google account not registered:
  - Frontend catches error
  - Frontend opens Create Account page with Google credential
*/
router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        message: "Google credential is required.",
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email_verified) {
      return res.status(401).json({
        message: "Google account is not verified.",
      });
    }

    const googleId = payload.sub;
    const email = payload.email;
    const profilePicture = payload.picture || null;

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Account not found. Please create an account first.",
      });
    }

    let user = result.rows[0];

    if (!user.google_id) {
      const updateResult = await pool.query(
        `UPDATE users
         SET google_id = $1,
             profile_picture = COALESCE(profile_picture, $2)
         WHERE id = $3
         RETURNING id, full_name, email, role`,
        [googleId, profilePicture, user.id]
      );

      user = updateResult.rows[0];
    }

    const token = createToken(user);

    return res.json({
      message: "Google login successful.",
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Google login error:", error.message);

    return res.status(401).json({
      message: "Google login failed.",
    });
  }
});

module.exports = router;