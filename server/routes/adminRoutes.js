const express = require("express");
const { body, validationResult } = require("express-validator");

const pool = require("../db");
const { protectRoute } = require("../middleware/authMiddleware");
const uploadImage = require("../middleware/uploadMiddleware");

const router = express.Router();

async function checkCommunityAdmin(req, res, next) {
  try {
    const communityId = req.params.communityId || req.params.communityIdForEdit;

    const result = await pool.query(
      `SELECT * FROM communities
       WHERE id = $1 AND admin_id = $2`,
      [communityId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        message: "You are not admin of this community.",
      });
    }

    req.community = result.rows[0];
    next();
  } catch (error) {
    console.error("Admin verification error:", error.message);

    return res.status(500).json({
      message: "Admin verification failed.",
    });
  }
}

/*
  GET /api/admin/:communityId/members
  Admin can view members
*/
router.get(
  "/:communityId/members",
  protectRoute,
  checkCommunityAdmin,
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT 
          u.id,
          u.full_name,
          u.email,
          u.profile_picture,
          u.profession,
          u.current_company_college,
          u.city,
          cm.joined_at
         FROM community_members cm
         JOIN users u ON cm.user_id = u.id
         WHERE cm.community_id = $1
         ORDER BY cm.joined_at DESC`,
        [req.params.communityId]
      );

      return res.json(result.rows);
    } catch (error) {
      console.error("Fetch members error:", error.message);

      return res.status(500).json({
        message: "Failed to fetch members.",
      });
    }
  }
);

/*
  GET /api/admin/:communityId/requests
  Admin can view pending join requests
*/
router.get(
  "/:communityId/requests",
  protectRoute,
  checkCommunityAdmin,
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT
          jr.id,
          jr.join_reason,
          jr.contribution,
          jr.status,
          jr.created_at,
          u.id AS user_id,
          u.full_name,
          u.email,
          u.profession,
          u.current_company_college,
          u.city
         FROM join_requests jr
         JOIN users u ON jr.user_id = u.id
         WHERE jr.community_id = $1 AND jr.status = 'pending'
         ORDER BY jr.created_at DESC`,
        [req.params.communityId]
      );

      return res.json(result.rows);
    } catch (error) {
      console.error("Fetch pending requests error:", error.message);

      return res.status(500).json({
        message: "Failed to fetch pending requests.",
      });
    }
  }
);

/*
  POST /api/admin/:communityId/requests/:requestId/approve
  Admin can approve join requests
*/
router.post(
  "/:communityId/requests/:requestId/approve",
  protectRoute,
  checkCommunityAdmin,
  async (req, res) => {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const requestResult = await client.query(
        `SELECT * FROM join_requests
         WHERE id = $1 AND community_id = $2 AND status = 'pending'`,
        [req.params.requestId, req.params.communityId]
      );

      if (requestResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          message: "Pending request not found.",
        });
      }

      const joinRequest = requestResult.rows[0];

      await client.query(
        `INSERT INTO community_members (community_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [joinRequest.community_id, joinRequest.user_id]
      );

      await client.query(
        `UPDATE join_requests
         SET status = 'approved'
         WHERE id = $1`,
        [req.params.requestId]
      );

      await client.query("COMMIT");

      return res.json({
        message: "Join request approved successfully.",
      });
    } catch (error) {
      await client.query("ROLLBACK");

      console.error("Approve request error:", error.message);

      return res.status(500).json({
        message: "Failed to approve request.",
      });
    } finally {
      client.release();
    }
  }
);

/*
  POST /api/admin/:communityId/requests/:requestId/reject
  Admin can reject join requests
*/
router.post(
  "/:communityId/requests/:requestId/reject",
  protectRoute,
  checkCommunityAdmin,
  async (req, res) => {
    try {
      const result = await pool.query(
        `UPDATE join_requests
         SET status = 'rejected'
         WHERE id = $1 AND community_id = $2 AND status = 'pending'
         RETURNING *`,
        [req.params.requestId, req.params.communityId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Pending request not found.",
        });
      }

      return res.json({
        message: "Join request rejected successfully.",
      });
    } catch (error) {
      console.error("Reject request error:", error.message);

      return res.status(500).json({
        message: "Failed to reject request.",
      });
    }
  }
);

/*
  PUT /api/admin/:communityIdForEdit
  Admin can edit community including:
  - Community Name
  - Logo
  - Cover Image
  - Description
  - Category
  - City
  - Website
  - WhatsApp Link
  - Discord Link
  - Instagram Link
  - Community Rules
  - Approval Type
*/
router.put(
  "/:communityIdForEdit",
  protectRoute,
  checkCommunityAdmin,
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
      .optional()
      .trim()
      .isLength({ min: 3 })
      .withMessage("Community name must be at least 3 characters."),

    body("description")
      .optional()
      .trim()
      .isLength({ min: 20 })
      .withMessage("Description must be at least 20 characters."),

    body("category")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Category is required."),

    body("city")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("City is required."),

    body("community_rules")
      .optional()
      .trim()
      .isLength({ min: 10 })
      .withMessage("Community rules must be at least 10 characters."),

    body("approval_type")
      .optional()
      .isIn(["auto", "admin"])
      .withMessage("Approval type must be auto or admin."),
  ],
  async (req, res) => {
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

      const result = await pool.query(
        `UPDATE communities SET
          community_name = COALESCE($1, community_name),
          description = COALESCE($2, description),
          category = COALESCE($3, category),
          city = COALESCE($4, city),
          website = COALESCE($5, website),
          whatsapp_link = COALESCE($6, whatsapp_link),
          discord_link = COALESCE($7, discord_link),
          instagram_link = COALESCE($8, instagram_link),
          community_rules = COALESCE($9, community_rules),
          approval_type = COALESCE($10, approval_type),
          community_logo = COALESCE($11, community_logo),
          cover_image = COALESCE($12, cover_image)
         WHERE id = $13 AND admin_id = $14
         RETURNING *`,
        [
          community_name || null,
          description || null,
          category || null,
          city || null,
          website || null,
          whatsapp_link || null,
          discord_link || null,
          instagram_link || null,
          community_rules || null,
          approval_type || null,
          communityLogoPath,
          coverImagePath,
          req.params.communityIdForEdit,
          req.user.id,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Community not found or you are not admin.",
        });
      }

      return res.json({
        message: "Community updated successfully.",
        community: result.rows[0],
      });
    } catch (error) {
      console.error("Update community error:", error.message);

      return res.status(500).json({
        message: "Failed to update community.",
      });
    }
  }
);

/*
  POST /api/admin/:communityId/meetups
  Admin can create meetup
*/
router.post(
  "/:communityId/meetups",
  protectRoute,
  checkCommunityAdmin,
  [
    body("title")
      .trim()
      .isLength({ min: 3 })
      .withMessage("Meetup title must be at least 3 characters."),

    body("meetup_date")
      .isISO8601()
      .withMessage("Valid meetup date is required."),

    body("description").optional().trim(),
    body("location").optional().trim(),
  ],
  async (req, res) => {
    try {
      const validationErrors = validationResult(req);

      if (!validationErrors.isEmpty()) {
        return res.status(400).json({
          errors: validationErrors.array(),
        });
      }

      const { title, description, meetup_date, location } = req.body;

      const result = await pool.query(
        `INSERT INTO meetups
        (
          community_id,
          title,
          description,
          meetup_date,
          location
        )
        VALUES
        ($1, $2, $3, $4, $5)
        RETURNING *`,
        [
          req.params.communityId,
          title,
          description || null,
          meetup_date,
          location || null,
        ]
      );

      return res.status(201).json({
        message: "Meetup created successfully.",
        meetup: result.rows[0],
      });
    } catch (error) {
      console.error("Create meetup error:", error.message);

      return res.status(500).json({
        message: "Failed to create meetup.",
      });
    }
  }
);

/*
  GET /api/admin/:communityId/analytics
  Admin can view meetup analytics
*/
router.get(
  "/:communityId/analytics",
  protectRoute,
  checkCommunityAdmin,
  async (req, res) => {
    try {
      const { communityId } = req.params;

      const totalMembersResult = await pool.query(
        `SELECT COUNT(*) FROM community_members
         WHERE community_id = $1`,
        [communityId]
      );

      const pendingRequestsResult = await pool.query(
        `SELECT COUNT(*) FROM join_requests
         WHERE community_id = $1 AND status = 'pending'`,
        [communityId]
      );

      const totalMeetupsResult = await pool.query(
        `SELECT COUNT(*) FROM meetups
         WHERE community_id = $1`,
        [communityId]
      );

      return res.json({
        totalMembers: Number(totalMembersResult.rows[0].count),
        pendingRequests: Number(pendingRequestsResult.rows[0].count),
        totalMeetups: Number(totalMeetupsResult.rows[0].count),
      });
    } catch (error) {
      console.error("Fetch analytics error:", error.message);

      return res.status(500).json({
        message: "Failed to fetch meetup analytics.",
      });
    }
  }
);

module.exports = router;