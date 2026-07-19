import { Router, type IRouter } from "express";

const router: IRouter = Router();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "Shuvayan95@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Shuvayan@11";

router.post("/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Regenerate session ID (prevents fixation), then persist isAdmin before responding
  req.session.regenerate((regenErr) => {
    if (regenErr) {
      console.error("[auth] session regenerate error:", regenErr);
      return res.status(500).json({ error: "Session error" });
    }
    (req.session as any).isAdmin = true;
    req.session.save((saveErr) => {
      if (saveErr) {
        console.error("[auth] session save error:", saveErr);
        return res.status(500).json({ error: "Session save error" });
      }
      res.json({ success: true, isAdmin: true });
    });
  });
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true, message: "Logged out" });
  });
});

router.get("/auth/me", (req, res) => {
  const isAdmin = !!(req.session as any).isAdmin;
  res.json({ isAdmin });
});

export default router;
