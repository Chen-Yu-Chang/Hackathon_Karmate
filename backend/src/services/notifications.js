// Notification service (TDD 1 + 4.1: SendGrid/Twilio — notify the
// reported business). Falls back to console logging (visible in the
// backend terminal) when no keys are configured.

async function notifyBusiness(report) {
  const message = `[Karmate] A report was filed against "${report.targetName}" (${report.targetType}). ` +
    `You have until ${report.appealDeadline} to appeal, or it proceeds automatically. Report ID: ${report.id}`;

  if (process.env.SENDGRID_API_KEY) {
    // Real send would go here via @sendgrid/mail — omitted to avoid a hard
    // dependency; wire it up once you have a verified sender domain.
    console.log(`[notifications] (SendGrid key present, real send not wired) -> ${report.targetContact}: ${message}`);
  } else {
    console.log(`[notifications:mock] -> ${report.targetContact}: ${message}`);
  }
  return { sent: true, channel: process.env.SENDGRID_API_KEY ? "sendgrid(stub)" : "mock" };
}

async function notifyUser(userContact, message) {
  console.log(`[notifications:mock] -> ${userContact}: ${message}`);
  return { sent: true, channel: "mock" };
}

module.exports = { notifyBusiness, notifyUser };
