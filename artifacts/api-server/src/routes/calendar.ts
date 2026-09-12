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
  const userId = getUserId(req);
  try {
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
    res.status(500).json({ error: "Failed to load calendar items" });
  }
});

router.post("/", async (req, res) => {
  const userId = getUserId(req);
  const { title, type, dueDate, subjectId } = req.body;

  if (!title || !dueDate) {
    return res.status(400).json({ error: "Title and due date are required" });
  }

  const VALID_TYPES = ["homework", "exam", "other"];
  const normalizedType = VALID_TYPES.includes(type) ? type : "homework";

  try {
    const [item] = await db
      .insert(calendarItemsTable)
      .values({
        id: genId("cal"),
        userId,
        subjectId: subjectId === "general" ? null : subjectId,
        title,
        type: normalizedType,
        dueDate: new Date(dueDate),
      })
      .returning();

    return res.status(201).json(item);
  } catch (err) {
    logger.error({ msg: "POST /calendar failed", error: err instanceof Error ? err.message : String(err) });
    return res.status(500).json({ error: "Failed to create calendar item" });
  }
});

router.patch("/:id", async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const { completed, title, dueDate, subjectId, type } = req.body;

  const updates: any = {};
  if (completed !== undefined) updates.completed = completed;
  if (title !== undefined) updates.title = title;
  if (subjectId !== undefined) updates.subjectId = subjectId === "general" ? null : subjectId;
  if (type !== undefined) updates.type = type;
  if (dueDate !== undefined) {
    const parsed = new Date(dueDate);
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ error: "dueDate is not a valid date" });
    }
    updates.dueDate = parsed;
  }

  // Drizzle throws on an empty SET clause, which surfaced as an opaque 500.
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }

  try {
    const [updated] = await db
      .update(calendarItemsTable)
      .set(updates)
      .where(and(eq(calendarItemsTable.id, id), eq(calendarItemsTable.userId, userId)))
      .returning();

    if (!updated) return res.status(404).json({ error: "Item not found" });
    return res.json(updated);
  } catch (err) {
    logger.error({ msg: "PATCH /calendar/:id failed", id, error: err instanceof Error ? err.message : String(err) });
    return res.status(500).json({ error: "Failed to update calendar item" });
  }
});

router.delete("/:id", async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;

  try {
    const deleted = await db
      .delete(calendarItemsTable)
      .where(and(eq(calendarItemsTable.id, id), eq(calendarItemsTable.userId, userId)))
      .returning({ id: calendarItemsTable.id });

    // Without this the endpoint reported success for items that never existed
    // and for other users' items, so a failed delete looked like a UI bug.
    if (deleted.length === 0) return res.status(404).json({ error: "Item not found" });
    return res.json({ success: true });
  } catch (err) {
    logger.error({ msg: "DELETE /calendar/:id failed", id, error: err instanceof Error ? err.message : String(err) });
    return res.status(500).json({ error: "Failed to delete calendar item" });
  }
});

export default router;
