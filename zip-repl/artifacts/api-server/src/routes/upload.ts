import { Router, type IRouter } from "express";
import path from "path";
import { randomUUID } from "crypto";
import multer from "multer";
import { ObjectStorageService } from "../lib/objectStorage/index.js";

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

const objectStorage = new ObjectStorageService();

async function uploadToObjectStorage(
  fileBuffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  const uploadURL = await objectStorage.getObjectEntityUploadURL();

  const response = await fetch(uploadURL, {
    method: "PUT",
    headers: {
      "Content-Type": mimeType,
    },
    body: fileBuffer,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Object storage upload failed: ${response.status} ${text}`);
  }

  const objectPath = objectStorage.normalizeObjectEntityPath(uploadURL);
  return objectPath;
}

router.post("/upload/image", requireAdmin, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const ext = path.extname(req.file.originalname || ".jpg") || ".jpg";
    const mimeType = req.file.mimetype || "image/jpeg";

    const objectPath = await uploadToObjectStorage(req.file.buffer, req.file.originalname || `upload${ext}`, mimeType);
    return res.json({ url: objectPath });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
