// Report state machine, per TDD section 2:
//
// [Upload] -> pending (等待商家回應，期限 3 天)
//    ├─> [無上訴] ──> revenging
//    └─> [商家上訴] ─> court (持續 1 天)
//         ├─> [投票通過] ──> revenging
//         └─> [投票未過] ──> rejected
// revenging -> in_progress (接單) -> completed
//
// scanAndAdvance() is called on a timer (see index.js) and also runs
// synchronously any time reports/tasks are listed, so state is always
// correct even between timer ticks.

const repo = require("../repo");
const { DURATIONS_MS } = require("../constants");

function scanAndAdvance() {
  const now = new Date().toISOString();

  for (const report of repo.reports.expiredPending(now)) {
    repo.reports.setStatus(report.id, "revenging");
    console.log(`[stateMachine] report ${report.id} pending -> revenging (appeal window expired)`);
  }

  for (const report of repo.reports.expiredCourt(now)) {
    const { yes, no } = repo.votes.tally(report.id);
    const nextStatus = yes > no ? "revenging" : "rejected";
    repo.reports.setStatus(report.id, nextStatus);
    console.log(
      `[stateMachine] report ${report.id} court -> ${nextStatus} (votes: ${yes} yes / ${no} no)`
    );
  }

  for (const task of repo.tasks.overdueInProgress(now)) {
    console.log(
      `[stateMachine] revenge_task ${task.id} missed its ${DURATIONS_MS.REVENGE_WINDOW}ms deadline (left in_progress for admin review)`
    );
  }
}

module.exports = { scanAndAdvance };
