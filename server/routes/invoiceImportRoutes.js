import express from "express";
import multer from "multer";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { requireTenant } from "../middleware/tenant.js";
import { MAX_INVOICE_BYTES } from "../services/invoiceImportService.js";
import { previewInvoiceController, commitInvoiceController } from "../controllers/invoiceImportController.js";

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_INVOICE_BYTES, files: 1 },
    fileFilter: (req, file, cb) => {
        const ext = String(file.originalname || "").toLowerCase().match(/\.[^.]+$/)?.[0];
        cb(null, [".csv", ".txt", ".xlsx", ".xls", ".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg", ".webp"].includes(ext));
    }
});

router.use(requireAuth, requireTenant, requireRole("admin", "manager"));
router.post("/preview", upload.single("invoice"), previewInvoiceController);
router.post("/commit", commitInvoiceController);

export default router;
