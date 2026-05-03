# DATABASE_SCHEMA.md
## FocusOura – Firebase Database Schema

---

## 1. Database Overview

- **Database Type:** Cloud Firestore (NoSQL – Document Based)
- **Architecture Style:** Domain-Oriented Collections
- **Tenancy Model:** Multi-Tenant SaaS
- **Primary Key Strategy:** Auto-generated document IDs
- **Time Standard:** UTC timestamps

All documents MUST include:
- `userId`
- `tenantId` (when applicable)

---

## 2. Collections Summary

users
subjects
sessions
session_events
plants
pets
inventory
wallets
transactions
arena_challenges
messages
growth_rules
ai_insights


---

## 3. Collection Definitions

---

## users

Stores basic user identity and preferences.

```json
{
  "userId": "string",
  "tenantId": "string",
  "displayName": "string",
  "email": "string",
  "createdAt": "timestamp",
  "settings": {
    "studyMode": "light | night",
    "notificationsEnabled": true
  }
}
{
  "subjectId": "string",
  "userId": "string",
  "tenantId": "string",
  "name": "string",
  "accentColor": "string",
  "linkedPlantId": "string",
  "createdAt": "timestamp"
}
{
  "sessionId": "string",
  "userId": "string",
  "tenantId": "string",
  "subjectId": "string",
  "sessionType": "routine | homework | deep_focus",
  "state": "initialized | started | warning | completed | aborted",
  "startTime": "timestamp",
  "endTime": "timestamp"
}
{
  "eventId": "string",
  "sessionId": "string",
  "userId": "string",
  "eventType": "started | warning | violation | completed | aborted",
  "eventTime": "timestamp",
  "metadata": {
    "reason": "string",
    "lockLevel": "string"
  }
}
{
  "eventId": "string",
  "sessionId": "string",
  "userId": "string",
  "eventType": "started | warning | violation | completed | aborted",
  "eventTime": "timestamp",
  "metadata": {
    "reason": "string",
    "lockLevel": "string"
  }
}
{
  "petId": "string",
  "userId": "string",
  "state": "happy | tired | sad",
  "energyLevel": "number",
  "lastInteraction": "timestamp"
}
{
  "userId": "string",
  "plants": ["plantId"],
  "pets": ["petId"],
  "cosmetics": ["cosmeticId"]
}
{
  "userId": "string",
  "balance": "number",
  "lastUpdated": "timestamp"
}
{
  "transactionId": "string",
  "userId": "string",
  "type": "reward | purchase | bet",
  "amount": "number",
  "referenceId": "string",
  "createdAt": "timestamp"
}
{
  "challengeId": "string",
  "participants": ["userId"],
  "stakeAmount": "number",
  "status": "active | completed",
  "winnerId": "string"
}
{
  "messageId": "string",
  "senderUserId": "string",
  "content": "string",
  "sentiment": "positive | neutral",
  "approved": true,
  "createdAt": "timestamp"
}
{
  "ruleId": "string",
  "condition": "string",
  "effect": {
    "plantGrowthDelta": "number",
    "petEnergyDelta": "number"
  }
}
{
  "insightId": "string",
  "sessionId": "string",
  "type": "motivation | warning | achievement",
  "content": "string",
  "createdAt": "timestamp"
}

4. Indexing Strategy

Recommended composite indexes:

sessions (userId, startTime)

session_events (sessionId, eventTime)

transactions (userId, createdAt)

subjects (userId, createdAt)

5. Data Integrity Rules

No client-side wallet balance updates

All transactions are append-only

Session events must never be deleted

Growth calculations read from session_events only

AI insights are advisory, not authoritative