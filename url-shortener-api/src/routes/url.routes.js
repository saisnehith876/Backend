const express = require("express");
const router = express.Router();
const {
  shortenUrl,
  redirectToLongUrl,
  getAllUrls,
  deleteUrl,
} = require("../controllers/url.controller");

router.post("/api/shorten", shortenUrl);
router.get("/api/urls", getAllUrls);
router.delete("/api/urls/:code", deleteUrl);
router.get("/:code", redirectToLongUrl); // keep this LAST — it's a catch-all pattern

module.exports = router;