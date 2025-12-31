import express, { Request, Response } from "express";
import { convertUTCtoKST, isPeriodDay } from "./utils";
import {
  sendScrumAlertMessage,
  getChannelMembers,
  getUsersBeforeScrumMessage,
  sendMentionMessage,
} from "./api";
import { SCRUM_START_MESSAGE, EVERYONE_SAFE, DIVIDER } from "./messages";

const app = express();

app.get("/api/cron/scrum", (req: Request, res: Response) => {
  const now = new Date();
  const koreanTime = convertUTCtoKST(now);
  if (!isPeriodDay(koreanTime)) {
    return res.status(200).json({ message: "Not period day" });
  }
  return sendScrumAlertMessage(SCRUM_START_MESSAGE)
    .then((response) =>
      res.status(200).json({ message: "Scrum cron executed" })
    )
    .catch((error) => res.status(500).json({ message: "Scrum cron failed" }));
});

// app.get("/api/cron/warning", (req: Request, res: Response) => {
//   const now = new Date();
//   const koreanTime = convertUTCtoKST(now);
//   if (!isPeriodDay(koreanTime)) {
//     return res.status(200).json({ message: "Not period day" });
//   }

//   return Promise.all([getChannelMembers(), getUsersBeforeScrumMessage()])
//     .then(([allMembers, usersWhoSent]) => {
//       const incompleteUsers = allMembers.filter(
//         (memberId) => !usersWhoSent.includes(memberId)
//       );

//       if (incompleteUsers.length > 0) {
//         return sendMentionMessage(incompleteUsers).then(() => ({
//           message: "Warning cron executed",
//           incompleteCount: incompleteUsers.length,
//         }));
//       } else {
//         const content = `${DIVIDER}\n${EVERYONE_SAFE}\n${DIVIDER}`;
//         return sendScrumAlertMessage(content).then(() => ({
//           message: "Warning cron executed - Everyone completed",
//         }));
//       }
//     })
//     .then((result) => res.status(200).json(result))
//     .catch((error) => {
//       console.error("Warning cron error:", error);
//       return res.status(500).json({
//         message: "Warning cron failed",
//         error: error instanceof Error ? error.message : "Unknown error",
//       });
//     });
// });

export default app;
