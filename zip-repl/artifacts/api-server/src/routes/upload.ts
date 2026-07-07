import { Router, type IRouter } from "express";
import path from "path";
import { randomUUID } from "crypto";
import multer from "multer";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any).isAdmin) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

async function uploadToSupabase(
  fileBuffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for image uploads.");
  }

  const bucket = "player-images";
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${filename}`;

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": mimeType,
      "x-upsert": "true",
    },
    body: fileBuffer,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase upload failed: ${response.status} ${text}`);
  }

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${filename}`;
}

router.post("/upload/image", requireAdmin, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const ext = path.extname(req.file.originalname || ".jpg") || ".jpg";
    const filename = `player-images/${randomUUID()}${ext}`;
    const mimeType = req.file.mimetype || "image/jpeg";

    const url = await uploadToSupabase(req.file.buffer, filename, mimeType);
    return res.json({ url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
