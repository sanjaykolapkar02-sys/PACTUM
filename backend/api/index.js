const app = require("../dist/app.js").default;
const { connectDatabase } = require("../dist/config/database.js");

module.exports = async function handler(req, res) {
  try {
    await connectDatabase();
    return app(req, res);
  } catch (err) {
    console.error("[Vercel Serverless] Database connection error:", err);
    return app(req, res);
  }
};
