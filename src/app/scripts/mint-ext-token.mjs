import "dotenv/config";
import jwt from "jsonwebtoken";

// TODO: set this to a real user id from your DB
const uid = "cmfb82gn00000ky0a224z0di7";

const token = jwt.sign(
  { uid },                   // payload (verifyExtBearer reads uid OR sub)
  process.env.EXT_JWT_SECRET, // same secret as server
  { expiresIn: "30d" }        // any duration you want
);

console.log(token);
