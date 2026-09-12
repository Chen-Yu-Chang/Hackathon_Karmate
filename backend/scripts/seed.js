// Demo seed data so the frontend has something to show immediately.
// Run with: npm run seed
require("dotenv").config();
const bcrypt = require("bcryptjs");
const repo = require("../src/repo");

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  function upsertUser(username, email, role) {
    const existing = repo.users.findByUsername(username);
    if (existing) return existing;
    return repo.users.create({ username, email, passwordHash, role });
  }

  const alice = upsertUser("alice", "alice@example.com", "normal");
  const bob = upsertUser("bob", "bob@example.com", "hunter");
  const admin = upsertUser("admin", "admin@example.com", "admin");
  const grandHotel = upsertUser("grand_hotel", "biz@grandhotel.example", "business");

  const existingReports = repo.reports.list();
  let report = existingReports.find((r) => r.targetName === "Grand Hotel Downtown");
  if (!report) {
    report = repo.reports.create({
      userId: alice.id,
      targetType: "hotel_enterprise",
      targetName: "Grand Hotel Downtown",
      targetContact: "biz@grandhotel.example",
      description:
        "Booked a non-smoking room, got a smoking room with no refund offered, staff was dismissive.",
      mediaUrls: [],
      isAiVerified: true,
      choice: "revenge",
      appealDeadline: new Date(Date.now() - 1000).toISOString(), // already expired -> will flip to revenging
    });
  }

  // A second case already live in the Court Room, so the pay-to-enter /
  // chat / free-voting flow (modify1 §4) is visible immediately.
  let courtReport = existingReports.find((r) => r.targetName === "Speedy Cabs");
  if (!courtReport) {
    courtReport = repo.reports.create({
      userId: alice.id,
      targetType: "driver",
      targetName: "Speedy Cabs",
      targetContact: "ops@speedycabs.example",
      description: "Driver was extremely rude and took a longer route to run up the fare.",
      mediaUrls: [],
      isAiVerified: true,
      choice: "revenge",
      appealDeadline: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
    courtReport = repo.reports.appeal(courtReport.id, {
      courtEndsAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      aiTitle: "The People vs. Speedy Cabs: Revenge on Trial",
      appealedByUserId: grandHotel.id, // demo stand-in "business" party for chat
    });
  }

  console.log({
    alice: alice.username,
    bob: bob.username,
    admin: admin.username,
    grandHotel: grandHotel.username,
    report: report.id,
    courtReport: courtReport.id,
  });
  console.log(
    "Seed complete. Demo logins (password: password123): alice / bob (hunter) / admin / grand_hotel (business)"
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
