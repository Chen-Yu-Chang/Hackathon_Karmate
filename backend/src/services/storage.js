// Media storage (TDD 1: AWS S3 or Cloudinary). Falls back to local disk
// under backend/uploads, served statically at /uploads/<file>, so the
// demo needs no cloud account. Swap buildPublicUrl()/the multer disk
// storage in routes/reports.js for an S3 SDK call to go to production.

const path = require("path");

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");

function buildPublicUrl(filename) {
  if (process.env.AWS_S3_BUCKET) {
    return `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${filename}`; // not actually uploaded there in this demo
  }
  if (process.env.CLOUDINARY_URL) {
    return `https://res.cloudinary.com/demo/image/upload/${filename}`; // placeholder
  }
  return `/uploads/${filename}`;
}

module.exports = { UPLOAD_DIR, buildPublicUrl };
