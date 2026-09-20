import { singleshot } from "functools-kit";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { getConfig } from "./params";
import { readFile } from "fs/promises";
import { lib } from "../lib";
import { createTelegramLogger } from "./logger";

export const getTelegram = singleshot(async () => {
    try {
        lib.loggerService.log("getTelegram connect");
        const { CC_TELEGRAM_API_ID, CC_TELEGRAM_API_HASH } = getConfig();
        const session = await readFile("./session.txt", "utf-8");
        const stringSession = new StringSession(session);
        const client = new TelegramClient(stringSession, CC_TELEGRAM_API_ID, CC_TELEGRAM_API_HASH, {
            connectionRetries: 5,
            systemVersion: "Windows 10",
            deviceModel: "Desktop",
            appVersion: "1.0.0",
            baseLogger: createTelegramLogger(),
        });
        {
            await client.connect();
            await client.getMe();
        }
        return client;
    } catch (error) {
        lib.loggerService.log(`getTelegram failed: no session found. Please run 'require("telegram-reader").signIn()' to create a session.`, error);
        throw error;
    }
});
