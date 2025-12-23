"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const utils_1 = require("./utils");
const api_1 = require("./api");
const messages_1 = require("./messages");
const app = (0, express_1.default)();
app.get("/api/cron/scrum", (req, res) => {
    const now = new Date();
    const koreanTime = (0, utils_1.convertUTCtoKST)(now);
    if (!(0, utils_1.isPeriodDay)(koreanTime)) {
        return res.status(200).json({ message: "Not period day" });
    }
    return (0, api_1.sendScrumAlertMessage)(messages_1.SCRUM_START_MESSAGE)
        .then((response) => res.status(200).json({ message: "Scrum cron executed" }))
        .catch((error) => res.status(500).json({ message: "Scrum cron failed" }));
});
app.get("/api/cron/warning", (req, res) => {
    const now = new Date();
    const koreanTime = (0, utils_1.convertUTCtoKST)(now);
    if (!(0, utils_1.isPeriodDay)(koreanTime)) {
        return res.status(200).json({ message: "Not period day" });
    }
    return Promise.all([(0, api_1.getChannelMembers)(), (0, api_1.getUsersBeforeScrumMessage)()])
        .then(([allMembers, usersWhoSent]) => {
        const incompleteUsers = allMembers.filter((memberId) => !usersWhoSent.includes(memberId));
        if (incompleteUsers.length > 0) {
            return (0, api_1.sendMentionMessage)(incompleteUsers).then(() => ({
                message: "Warning cron executed",
                incompleteCount: incompleteUsers.length,
            }));
        }
        else {
            const content = `${messages_1.DIVIDER}\n${messages_1.EVERYONE_SAFE}\n${messages_1.DIVIDER}`;
            return (0, api_1.sendScrumAlertMessage)(content).then(() => ({
                message: "Warning cron executed - Everyone completed",
            }));
        }
    })
        .then((result) => res.status(200).json(result))
        .catch((error) => {
        console.error("Warning cron error:", error);
        return res.status(500).json({
            message: "Warning cron failed",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    });
});
exports.default = app;
