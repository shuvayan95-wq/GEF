import { Router, type IRouter } from "express";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any).isAdmin) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "player-images";

function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

async function ensureBucketPublic() {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    const { error: createErr } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (createErr && createErr.message?.includes("already exists")) {
      await supabase.storage.updateBucket(BUCKET, { public: true });
    }
  } catch {
  }
}
ensureBucketPublic().catch(() => {});

// Fallback: local disk uploads (used only if Supabase is not configured)
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Use multer with memory storage so we can forward buffer to Supabase
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

router.post("/upload/image", requireAdmin, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const ext = path.extname(req.file.originalname || ".jpg") || ".jpg";
    const filename = randomUUID() + ext;
    const mimeType = req.file.mimetype || "image/jpeg";
    const fileData = req.file.buffer;

    const supabase = getSupabaseClient();

    if (supabase) {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .upload(filename, fileData, {
          contentType: mimeType,
          upsert: false,
        });

      if (error) {
        return res.status(500).json({ error: `Supabase upload failed: ${error.message}` });
      }

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename);
      return res.json({ url: urlData.publicUrl });
    }

    // Fallback to local storage
    const filepath = path.join(UPLOAD_DIR, filename);
    fs.writeFileSync(filepath, fileData);
    res.json({ url: `/api/uploads/${filename}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Serve locally stored uploads (fallback / legacy)
router.get("/uploads/:filename", (req, res) => {
  const filename = path.basename(req.params.filename);
  const filepath = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: "File not found" });
  }
  res.sendFile(filepath);
});

export default router;
