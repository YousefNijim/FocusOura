import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { calendarItemsTable, subjectsTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { getUserId } from "./users.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

router.get("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    const items = await db
      .select({
        id: calendarItemsTable.id,
        title: calendarItemsTable.title,
        type: calendarItemsTable.type,
        dueDate: calendarItemsTable.dueDate,
        completed: calendarItemsTable.completed,
        subjectId: calendarItemsTable.subjectId,
        subjectName: subjectsTable.name,
        accentColor: subjectsTable.accentColor,
      })
      .from(calendarItemsTable)
      .leftJoin(subjectsTable, eq(calendarItemsTable.subjectId, subjectsTable.id))
      .where(eq(calendarItemsTable.userId, userId))
      .orderBy(asc(calendarItemsTable.dueDate));

    res.json(items);
  } catch (err) {
    logger.error({ msg: "GET /calendar failed", error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: "Failed to load calendar" });
  }
});

router.post("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { title, type, dueDate, subjectId } = req.body;

    if (!title || !dueDate) {
      return res.status(400).json({ error: "Title and due date are required" });
    }

    const [item] = await db
      .insert(calendarItemsTable)
      .values({
        id: genId("cal"),
        userId,
        subjectId: subjectId || null,
        title,
        type: type || "homework",
        dueDate: new Date(dueDate),
      })
      .returning();

    res.status(201).json(item);
  } catch (err) {
    logger.error({ msg: "POST /calendar failed", error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: "Failed to create calendar item" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { completed, title, dueDate, subjectId, type } = req.body;

    const updates: Record<string, unknown> = {};
    if (completed !== undefined) updates.completed = completed;
    if (title !== undefined) updates.title = title;
    if (dueDate !== undefined) updates.dueDate = new Date(dueDate);
    if (subjectId !== undefined) updates.subjectId = subjectId || null;
    if (type !== undefined) updates.type = type;

    const [updated] = await db
      .update(calendarItemsTable)
      .set(updates)
      .where(and(eq(calendarItemsTable.id, id), eq(calendarItemsTable.userId, userId)))
      .returning();

    if (!updated) return res.status(404).json({ error: "Item not found" });
    res.json(updated);
  } catch (err) {
    logger.error({ msg: "PATCH /calendar/:id failed", error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: "Failed to update calendar item" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    await db
      .delete(calendarItemsTable)
      .where(and(eq(calendarItemsTable.id, id), eq(calendarItemsTable.userId, userId)));

    res.json({ success: true });
  } catch (err) {
    logger.error({ msg: "DELETE /calendar/:id failed", error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: "Failed to delete calendar item" });
  }
});

export default router;
