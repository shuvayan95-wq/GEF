import { Router, type IRouter } from "express";

const router: IRouter = Router();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "Shuvayan95@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Shuvayan@11";

router.post("/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    (req.session as any).isAdmin = true;
    res.json({ success: true, isAdmin: true });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
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
