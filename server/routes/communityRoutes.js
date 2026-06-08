const express = require("express");
const { body, validationResult } = require("express-validator");

const pool = require("../db");
const uploadImage = require("../middleware/uploadMiddleware");
const { protectRoute } = require("../middleware/authMiddleware");

const router = express.Router();

/*
  GET /api/communities
  Browse communities with search, filter, sort
*/
router.get("/", async (req, res) => {
  try {
    const { search, category, city, sort } = req.query;

    let query = `
      SELECT 
        c.id,
        c.community_name,
        c.community_logo,
        c.cover_image,
        c.description,
        c.category,
        c.city,
        c.approval_type,
        c.created_at,
        u.full_name AS admin_name,
        COUNT(DISTINCT cm.id) AS member_count,
        COUNT(DISTINCT m.id) AS upcoming_meetup_count
      FROM communities c
      JOIN users u ON c.admin_id = u.id
      LEFT JOIN community_members cm ON c.id = cm.community_id
      LEFT JOIN meetups m ON c.id = m.community_id AND m.meetup_date >= NOW()
      WHERE 1 = 1
    `;

    const values = [];
    let valueIndex = 1;

    if (search) {
      query += ` AND LOWER(c.community_name) LIKE LOWER($${valueIndex})`;
      values.push(`%${search}%`);
      valueIndex++;
    }

    if (category) {
      query += ` AND LOWER(c.category) = LOWER($${valueIndex})`;
      values.push(category);
      valueIndex++;
    }

    if (city) {
      query += ` AND LOWER(c.city) = LOWER($${valueIndex})`;
      values.push(city);
      valueIndex++;
    }

    query += ` GROUP BY c.id, u.full_name`;

    if (sort === "member_count") {
      query += ` ORDER BY member_count DESC`;
    } else {
      query += ` ORDER BY c.created_at DESC`;
    }

    const result = await pool.query(query, values);

    return res.json(result.rows);
  } catch (error) {
    console.error("Fetch communities error:", error.message);

    return res.status(500).json({
      message: "Failed to fetch communities.",
    });
  }
});

/*
  GET /api/communities/my-created
  Admin panel: show communities created by logged-in user
*/
router.get("/my-created", protectRoute, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        c.id,
        c.community_name,
        c.community_logo,
        c.cover_image,
        c.description,
        c.category,
        c.city,
        c.approval_type,
        c.created_at,
        COUNT(DISTINCT cm.id) AS member_count,
        COUNT(DISTINCT m.id) AS upcoming_meetup_count
      FROM communities c
      LEFT JOIN community_members cm ON c.id = cm.community_id
      LEFT JOIN meetups m ON c.id = m.community_id AND m.meetup_date >= NOW()
      WHERE c.admin_id = $1
      GROUP BY c.id
      ORDER BY c.created_at DESC`,
      [req.user.id]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error("Fetch my communities error:", error.message);

    return res.status(500).json({
      message: "Failed to fetch your communities.",
    });
  }
});

/*
  GET /api/communities/:communityId/my-status
  Checks current user's status for this community:
  - admin
  - member
  - pending
  - approved
  - rejected
  - none
*/
router.get("/:communityId/my-status", protectRoute, async (req, res) => {
  try {
    const { communityId } = req.params;
    const userId = req.user.id;

    const communityResult = await pool.query(
      "SELECT admin_id FROM communities WHERE id = $1",
      [communityId]
    );

    if (communityResult.rows.length === 0) {
      return res.status(404).json({
        message: "Community not found.",
      });
    }

    const community = communityResult.rows[0];

    if (community.admin_id === userId) {
      return res.json({
        status: "admin",
        message: "You are the admin of this community.",
      });
    }

    const memberResult = await pool.query(
      `SELECT id FROM community_members
       WHERE community_id = $1 AND user_id = $2`,
      [communityId, userId]
    );

    if (memberResult.rows.length > 0) {
      return res.json({
        status: "member",
        message: "You are already a member of this community.",
      });
    }

    const requestResult = await pool.query(
      `SELECT status FROM join_requests
       WHERE community_id = $1 AND user_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [communityId, userId]
    );

    if (requestResult.rows.length > 0) {
      const requestStatus = requestResult.rows[0].status;

      return res.json({
        status: requestStatus,
        message:
          requestStatus === "pending"
            ? "Your join request is pending admin approval."
            : requestStatus === "rejected"
            ? "Your previous join request was rejected."
            : "Your join request was approved.",
      });
    }

    return res.json({
      status: "none",
      message: "You can send a join request.",
    });
  } catch (error) {
    console.error("Check join status error:", error.message);

    return res.status(500).json({
      message: "Failed to check join status.",
    });
  }
});

/*
  GET /api/communities/:communityId
  Community detail page
*/
router.get("/:communityId", async (req, res) => {
  try {
    const { communityId } = req.params;

    const communityResult = await pool.query(
      `SELECT 
        c.*,
        u.full_name AS admin_name,
        u.profession AS admin_profession,
        u.city AS admin_city,
        COUNT(DISTINCT cm.id) AS member_count
      FROM communities c
      JOIN users u ON c.admin_id = u.id
      LEFT JOIN community_members cm ON c.id = cm.community_id
      WHERE c.id = $1
      GROUP BY c.id, u.full_name, u.profession, u.city`,
      [communityId]
    );

    if (communityResult.rows.length === 0) {
      return res.status(404).json({
        message: "Community not found.",
      });
    }

    const meetupsResult = await pool.query(
      `SELECT 
        id,
        title,
        description,
        meetup_date,
        location
       FROM meetups
       WHERE community_id = $1 AND meetup_date >= NOW()
       ORDER BY meetup_date ASC`,
      [communityId]
    );

    const membersPreviewResult = await pool.query(
      `SELECT 
        u.id,
        u.full_name,
        u.profile_picture,
        u.profession,
        u.city
       FROM community_members cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.community_id = $1
       ORDER BY cm.joined_at DESC
       LIMIT 6`,
      [communityId]
    );

    return res.json({
      community: communityResult.rows[0],
      upcomingMeetups: meetupsResult.rows,
      membersPreview: membersPreviewResult.rows,
    });
  } catch (error) {
    console.error("Fetch community details error:", error.message);

    return res.status(500).json({
      message: "Failed to fetch community details.",
    });
  }
});

/*
  POST /api/communities
  Create community
*/
router.post(
  "/",
  protectRoute,
  uploadImage.fields([
    {
      name: "community_logo",
      maxCount: 1,
    },
    {
      name: "cover_image",
      maxCount: 1,
    },
  ]),
  [
    body("community_name")
      .trim()
      .isLength({ min: 3 })
      .withMessage("Community name must be at least 3 characters."),

    body("description")
      .trim()
      .isLength({ min: 20 })
      .withMessage("Community description must be at least 20 characters."),

    body("category").trim().notEmpty().withMessage("Category is required."),

    body("city").trim().notEmpty().withMessage("City is required."),

    body("community_rules")
      .trim()
      .isLength({ min: 10 })
      .withMessage("Community rules must be at least 10 characters."),

    body("approval_type")
      .isIn(["auto", "admin"])
      .withMessage("Approval type must be auto or admin."),
  ],
  async (req, res) => {
    const client = await pool.connect();

    try {
      const validationErrors = validationResult(req);

      if (!validationErrors.isEmpty()) {
        return res.status(400).json({
          errors: validationErrors.array(),
        });
      }

      const {
        community_name,
        description,
        category,
        city,
        website,
        whatsapp_link,
        discord_link,
        instagram_link,
        community_rules,
        approval_type,
      } = req.body;

      const communityLogoPath =
        req.files && req.files.community_logo
          ? `/uploads/${req.files.community_logo[0].filename}`
          : null;

      const coverImagePath =
        req.files && req.files.cover_image
          ? `/uploads/${req.files.cover_image[0].filename}`
          : null;

      await client.query("BEGIN");

      const communityResult = await client.query(
        `INSERT INTO communities
        (
          community_name,
          community_logo,
          cover_image,
          description,
          category,
          city,
          website,
          whatsapp_link,
          discord_link,
          instagram_link,
          community_rules,
          approval_type,
          admin_id
        )
        VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          community_name,
          communityLogoPath,
          coverImagePath,
          description,
          category,
          city,
          website || null,
          whatsapp_link || null,
          discord_link || null,
          instagram_link || null,
          community_rules,
          approval_type,
          req.user.id,
        ]
      );

      const createdCommunity = communityResult.rows[0];

      await client.query("UPDATE users SET role = 'admin' WHERE id = $1", [
        req.user.id,
      ]);

      await client.query(
        `INSERT INTO community_members (community_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [createdCommunity.id, req.user.id]
      );

      await client.query("COMMIT");

      return res.status(201).json({
        message: "Community created successfully.",
        community: createdCommunity,
      });
    } catch (error) {
      await client.query("ROLLBACK");

      console.error("Create community error:", error.message);

      return res.status(500).json({
        message: "Failed to create community.",
      });
    } finally {
      client.release();
    }
  }
);

/*
  POST /api/communities/:communityId/join
  Prevent duplicate join request if pending/approved/member
*/
router.post(
  "/:communityId/join",
  protectRoute,
  [
    body("join_reason")
      .trim()
      .isLength({ min: 10 })
      .withMessage("Join reason must be at least 10 characters."),

    body("contribution")
      .trim()
      .isLength({ min: 10 })
      .withMessage("Contribution must be at least 10 characters."),
  ],
  async (req, res) => {
    try {
      const validationErrors = validationResult(req);

      if (!validationErrors.isEmpty()) {
        return res.status(400).json({
          errors: validationErrors.array(),
        });
      }

      const { communityId } = req.params;
      const userId = req.user.id;
      const { join_reason, contribution } = req.body;

      const communityResult = await pool.query(
        `SELECT * FROM communities WHERE id = $1`,
        [communityId]
      );

      if (communityResult.rows.length === 0) {
        return res.status(404).json({
          message: "Community not found.",
        });
      }

      const community = communityResult.rows[0];

      if (community.admin_id === userId) {
        return res.status(400).json({
          message: "You are the admin of this community.",
        });
      }

      const memberResult = await pool.query(
        `SELECT id FROM community_members
         WHERE community_id = $1 AND user_id = $2`,
        [communityId, userId]
      );

      if (memberResult.rows.length > 0) {
        return res.status(400).json({
          message: "You are already a member of this community.",
        });
      }

      const existingRequestResult = await pool.query(
        `SELECT status FROM join_requests
         WHERE community_id = $1 AND user_id = $2`,
        [communityId, userId]
      );

      if (existingRequestResult.rows.length > 0) {
        const existingStatus = existingRequestResult.rows[0].status;

        if (existingStatus === "pending") {
          return res.status(400).json({
            message:
              "You have already sent a join request. Please wait for admin approval.",
          });
        }

        if (existingStatus === "approved") {
          return res.status(400).json({
            message: "Your request was already approved.",
          });
        }
      }

      if (community.approval_type === "auto") {
        await pool.query(
          `INSERT INTO community_members (community_id, user_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [communityId, userId]
        );

        return res.json({
          message: "You joined the community successfully.",
        });
      }

      await pool.query(
        `INSERT INTO join_requests
        (
          community_id,
          user_id,
          join_reason,
          contribution,
          status
        )
        VALUES
        ($1, $2, $3, $4, 'pending')
        ON CONFLICT (community_id, user_id)
        DO UPDATE SET
          join_reason = EXCLUDED.join_reason,
          contribution = EXCLUDED.contribution,
          status = 'pending',
          created_at = CURRENT_TIMESTAMP
        WHERE join_requests.status = 'rejected'`,
        [communityId, userId, join_reason, contribution]
      );

      return res.json({
        message: "Join request sent to community admin.",
      });
    } catch (error) {
      console.error("Join community error:", error.message);

      return res.status(500).json({
        message: "Failed to join community.",
      });
    }
  }
);

module.exports = router;