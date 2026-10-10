// Generates the value for ADMIN_PASSWORD_HASH_B64 so the admin password is never stored in plain text.
//   npm run admin-hash -- "YourNewPassword"
import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error('Usage: npm run admin-hash -- "<password>"');
  process.exit(1);
}
const hash = bcrypt.hashSync(password, 12);
console.log("Put this in your environment settings:\n");
console.log(`ADMIN_PASSWORD_HASH_B64=${Buffer.from(hash).toString("base64")}`);
