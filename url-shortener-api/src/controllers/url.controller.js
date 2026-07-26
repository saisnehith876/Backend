const { nanoid } = require("nanoid");
const Url = require("../models/url.model");

// POST /api/shorten
const shortenUrl = async (req, res, next) => {
  try {
    const { longUrl } = req.body;

    if (!longUrl) {
      return res.status(400).json({ message: "longUrl is required" });
    }

    // basic URL format check
    try {
      new URL(longUrl);
    } catch {
      return res.status(400).json({ message: "Invalid URL format" });
    }

    // avoid creating duplicate short codes for the same long URL
    let existing = await Url.findOne({ longUrl });
    if (existing) {
      return res.status(200).json(existing);
    }

    const shortCode = nanoid(7); // e.g. "aZ3kLq9"
    const newUrl = await Url.create({ longUrl, shortCode });

    res.status(201).json({
      ...newUrl.toObject(),
      shortUrl: `${process.env.BASE_URL}/${shortCode}`,
    });
  } catch (err) {
    next(err); // hands off to the error-handling middleware
  }
};

// GET /:code  -> redirect to the original URL
const redirectToLongUrl = async (req, res, next) => {
  try {
    const { code } = req.params;
    const url = await Url.findOne({ shortCode: code });

    if (!url) {
      return res.status(404).json({ message: "Short URL not found" });
    }

    url.clicks += 1;
    await url.save();

    res.redirect(url.longUrl);
  } catch (err) {
    next(err);
  }
};

// GET /api/urls -> paginated list
const getAllUrls = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [urls, total] = await Promise.all([
      Url.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Url.countDocuments(),
    ]);

    res.json({
      data: urls,
      page,
      totalPages: Math.ceil(total / limit),
      totalResults: total,
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/urls/:code
const deleteUrl = async (req, res, next) => {
  try {
    const deleted = await Url.findOneAndDelete({ shortCode: req.params.code });
    if (!deleted) {
      return res.status(404).json({ message: "Short URL not found" });
    }
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    next(err);
  }
};

module.exports = { shortenUrl, redirectToLongUrl, getAllUrls, deleteUrl };