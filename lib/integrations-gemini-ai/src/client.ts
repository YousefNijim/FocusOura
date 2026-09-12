import { GoogleGenAI } from "@google/genai";

export const ai = new GoogleGenAI({
  // Server-side call: needs a key with no HTTP-referrer restriction.
  apiKey: process.env.GOOGLE_SERVER_API_KEY || process.env.GOOGLE_API_KEY || "dummy",
});
