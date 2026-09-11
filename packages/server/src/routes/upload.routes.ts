import { Router, Request, Response } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { authenticate } from './guilds.routes';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const router = Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// SEC-04 FIX: Rate limiter for uploads to prevent Cloudinary quota exhaustion & storage spam
const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // 20 uploads per 10 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Quota d\'upload temporairement atteint. Veuillez patienter quelques minutes.' }
});

// Configure multer storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'loup-garou-cards',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'gif']
  } as any
});

// SEC-07 FIX: Strict MIME type validation and file size constraints
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Format de fichier invalide. Seuls les formats JPG, PNG, WEBP et GIF sont autorisés.'));
    }
    cb(null, true);
  }
});

router.post(
  '/',
  authenticate,
  uploadLimiter,
  (req: Request, res: Response, next) => {
    upload.single('image')(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'Fichier trop volumineux. La taille maximale est de 5 Mo.' });
        }
        return res.status(400).json({ error: `Erreur d'envoi : ${err.message}` });
      } else if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier image fourni' });
    }

    const imageUrl = req.file.path;
    return res.json({ url: imageUrl });
  }
);

export default router;
