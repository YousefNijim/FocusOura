import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/firebase", (_req, res) => {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "Firebase not configured" });
  }
  const projectId = process.env.FIREBASE_PROJECT_ID ?? "focusoura-99dae";
  return res.json({
    apiKey,
    authDomain: `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: `${projectId}.firebasestorage.app`,
    messagingSenderId: "327116942106",
    appId: "1:327116942106:web:8da5cdf4ca2cfa17f49aa3",
    measurementId: "G-P8Q0EFXZHS"
  });
});

export default router;
