import { Expo, type ExpoPushMessage, type ExpoPushTicket } from "expo-server-sdk";
import { db } from "@workspace/db";
import { pushTokensTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { logger } from "./logger.js";

const expo = new Expo();

export async function sendPushNotification(
  userIds: string[],
  notification: {
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    if (userIds.length === 0) return;

    const tokenRows = await db
      .select()
      .from(pushTokensTable)
      .where(inArray(pushTokensTable.userId, userIds));

    if (tokenRows.length === 0) return;

    // Build validated message list, tracking each row for cleanup
    const validItems: Array<{ message: ExpoPushMessage; rowId: string }> = [];
    for (const row of tokenRows) {
      if (!Expo.isExpoPushToken(row.token)) {
        logger.warn({ msg: "Skipping invalid push token", context: { userId: row.userId } });
        continue;
      }
      validItems.push({
        message: {
          to: row.token,
          title: notification.title,
          body: notification.body,
          data: notification.data,
          sound: "default",
        },
        rowId: row.id,
      });
    }

    if (validItems.length === 0) return;

    const allMessages = validItems.map((v) => v.message);
    const chunks = expo.chunkPushNotifications(allMessages);

    let offset = 0;
    for (const chunk of chunks) {
      let tickets: ExpoPushTicket[];
      try {
        tickets = await expo.sendPushNotificationsAsync(chunk);
      } catch (err) {
        logger.error({
          msg: "Failed to send push notification chunk",
          error: err instanceof Error ? err.message : String(err),
        });
        offset += chunk.length;
        continue;
      }

      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        if (ticket.status !== "error") continue;

        const errorCode = (ticket as any).details?.error as string | undefined;
        const item = validItems[offset + i];

        if (errorCode === "DeviceNotRegistered") {
          if (item) {
            await db.delete(pushTokensTable).where(eq(pushTokensTable.id, item.rowId));
            logger.warn({ msg: "Deleted DeviceNotRegistered token", context: { rowId: item.rowId } });
          }
        } else if (errorCode === "MessageTooBig") {
          logger.warn({ msg: "Push notification payload too large", context: { title: notification.title } });
        } else if (errorCode === "InvalidCredentials") {
          logger.error({ msg: "Invalid Expo push credentials — check your EAS project config", error: ticket.message });
        } else {
          logger.warn({ msg: "Push ticket error", error: ticket.message, context: { errorCode } });
        }
      }

      offset += chunk.length;
    }
  } catch (err) {
    logger.error({
      msg: "sendPushNotification failed",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
