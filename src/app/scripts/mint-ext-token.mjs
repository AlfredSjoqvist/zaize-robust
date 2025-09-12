// scripts/mint-ext-token.mjs
import "dotenv/config";   // loads .env automatically
import jwt from "jsonwebtoken";

const uid = "cmfb82gn00000ky0a224z0di7";
if (!uid) {
  console.error("Usage: node scripts/mint-ext-token.mjs <USER_ID>");
  process.exit(1);
}

const secret = "STtodo6yK8EKxktgF9JCszDDi3hAtxv2"
if (!secret) throw new Error("EXT_JWT_SECRET not set in .env");

const token = jwt.sign(
  { uid, scope: "read:highlighted" },
  secret,
  { expiresIn: "30d" }
);

console.log("JWT for", uid, "=>\n");
console.log(token);
