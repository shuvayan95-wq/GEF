import { Router, type IRouter } from "express";
import path from "path";
import { randomUUID } from "crypto";
import { Storage } from "@google-cloud/storage";
import multer from "multer";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any).isAdmin) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

function getObjectStorageClient() {
  return new Storage({
    credentials: {
      audience: "replit",
      subject_token_type: "access_token",
      token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
      type: "external_account",
      credential_source: {
        url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
        format: { type: "json", subject_token_field_name: "access_token" },
      },
      universe_domain: "googleapis.com",
    } as any,
    projectId: "",
  });
}

function getBucketName(): string | null {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!bucketId) return null;
  return bucketId;
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

router.post("/upload/image", requireAdmin, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const ext = path.extname(req.file.originalname || ".jpg") || ".jpg";
    const filename = `player-images/${randomUUID()}${ext}`;
    const mimeType = req.file.mimetype || "image/jpeg";
    const fileData = req.file.buffer;

    const bucketName = getBucketName();

    if (bucketName) {
      const storageClient = getObjectStorageClient();
      const bucket = storageClient.bucket(bucketName);
      const file = bucket.file(filename);

      await file.save(fileData, {
        metadata: { contentType: mimeType },
        public: true,
      });

      const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;
      return res.json({ url: publicUrl });
    }

    return res.status(500).json({ error: "Object storage not configured. Set DEFAULT_OBJECT_STORAGE_BUCKET_ID." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
