// Chạy `prisma migrate deploy` lên DATABASE_URL_TEST, không đụng DB dev.
const { spawnSync } = require("node:child_process");
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

const testUrl = process.env.DATABASE_URL_TEST;
if (!testUrl) {
  console.error("Thiếu DATABASE_URL_TEST trong be/.env — xem Task 1 Step 1 của plan.");
  process.exit(1);
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  cwd: path.join(__dirname, "..", ".."),
  env: { ...process.env, DATABASE_URL: testUrl },
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 1);
