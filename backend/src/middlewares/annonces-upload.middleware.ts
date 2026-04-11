import fs from "fs";
import multer from "multer";
import path from "path";

const uploadPath = path.join(process.cwd(), "uploads", "annonces");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadPath);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    callback(null, uniqueName);
  },
});

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const allowedExtensions = new Set([".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".doc", ".docx"]);

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    const mimeType = (file.mimetype || "").toLowerCase();
    const extension = path.extname(file.originalname || "").toLowerCase();

    if (allowedMimeTypes.has(mimeType) || allowedExtensions.has(extension)) {
      callback(null, true);
      return;
    }

    callback(new Error("Only JPG, PNG, GIF, PDF, and Word files are allowed"));
  },
});

export default upload;
