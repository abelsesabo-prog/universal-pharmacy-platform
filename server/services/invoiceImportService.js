import { ObjectId } from "mongodb";
import { PDFParse } from "pdf-parse";
import xlsx from "xlsx";
import WordExtractor from "word-extractor";
import { createProduct } from "./productService.js";
import { createBatch } from "./inventoryService.js";
import { getCollection } from "./index.js";
import { COLLECTIONS } from "../../shared/schemas/index.js";
import { normalizeUomMatrix, validateUomConfiguration } from "../../shared/uom.js";
import { extractVisualInvoice, visualInvoiceAvailable } from "./invoiceVisionService.js";

export const MAX_INVOICE_BYTES = 10 * 1024 * 1024;
export const MAX_INVOICE_ROWS = 1000;
export const SUPPORTED_INVOICE_EXTENSIONS = [".csv", ".txt", ".xlsx", ".xls", ".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg", ".webp"];

const HEADER_ALIASES = {
    brandName: ["brand", "brand name", "brandname", "product", "product name", "item", "item name"],
    genericName: ["generic", "generic name", "genericname", "active ingredient", "medicine", "drug"],
    dosageForm: ["form", "dosage form", "dosageform", "presentation"],
    category: ["category", "type"],
    strength: ["strength", "dose", "dosage"],
    strengthUnit: ["strength unit", "strengthunit", "unit of strength"],
    manufacturer: ["manufacturer", "maker", "supplier name"],
    barcode: ["barcode", "ean", "gtin", "sku"],
    batchNumber: ["batch", "batch number", "batchnumber", "lot", "lot number"],
    quantity: ["qty", "quantity", "units", "stock", "received"],
    freeQuantity: ["free", "free qty", "free quantity", "foc", "bonus", "bonus qty"],
    uom: ["uom", "unit", "selling unit", "pack", "pack size unit"],
    conversionToBase: ["conversion", "conversion to base", "conversiontobase", "pack size", "units per pack", "factor"],
    expiryDate: ["expiry", "expiry date", "expirydate", "expiration", "expiration date"],
    costPrice: ["cost", "cost price", "costprice", "buy price", "purchase price", "rate", "unit price"],
    sellingPrice: ["price", "selling price", "sellingprice", "sale price", "retail price"]
};

function clean(value) { return String(value ?? "").normalize("NFKC").trim(); }
function key(value) { return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function number(value) { if (value === "" || value == null) return null; const n = Number(String(value).replace(/,/g, "")); return Number.isFinite(n) ? n : null; }
function isoDate(value) {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
    const raw = clean(value);
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(raw)) return raw.replace(/\//g, "-");
    const monthYear = raw.match(/^(\d{1,2})[./-](\d{2}|\d{4})$/);
    if (monthYear) {
        const month = Number(monthYear[1]);
        const year = Number(monthYear[2].length === 2 ? `20${monthYear[2]}` : monthYear[2]);
        if (month >= 1 && month <= 12 && year >= 2000 && year <= 2100) return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
    }
    const dmy = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
    if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function parseDelimited(text) {
    const lines = clean(text).split(/\r?\n/).filter(line => line.trim());
    if (!lines.length) return [];
    const sample = lines.slice(0, 5).join("\n");
    const candidates = [",", "\t", ";", "|"];
    const delimiter = candidates.sort((a, b) => (sample.split(b).length - 1) - (sample.split(a).length - 1))[0];
    const rows = [];
    for (const line of lines) {
        const cells = [];
        let cell = "", quoted = false;
        for (let i = 0; i < line.length; i += 1) {
            const ch = line[i];
            if (ch === '"') {
                if (quoted && line[i + 1] === '"') { cell += '"'; i += 1; }
                else quoted = !quoted;
            } else if (ch === delimiter && !quoted) { cells.push(cell.trim()); cell = ""; }
            else cell += ch;
        }
        cells.push(cell.trim());
        rows.push(cells);
    }
    return rows;
}

function mapHeaders(cells) {
    return cells.map((cell, index) => {
        const normalized = key(cell);
        for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
            if (aliases.some(alias => key(alias) === normalized)) return [field, index];
        }
        return [null, index];
    });
}

function rowsFromMatrix(matrix) {
    const rows = matrix.filter(row => Array.isArray(row) && row.some(value => clean(value)));
    if (!rows.length) return [];
    const headerIndex = Math.min(5, rows.length - 1);
    let bestIndex = 0, bestScore = -1;
    for (let i = 0; i <= headerIndex; i += 1) {
        const score = mapHeaders(rows[i]).filter(([field]) => field).length;
        if (score > bestScore) { bestScore = score; bestIndex = i; }
    }
    const headers = rows[bestIndex];
    const mapping = mapHeaders(headers);
    if (mapping.filter(([field]) => field).length === 0) return [];
    const result = [];
    for (const cells of rows.slice(bestIndex + 1)) {
        const item = {};
        for (const [field, index] of mapping) if (field) item[field] = cells[index];
        if (Object.values(item).some(value => clean(value))) result.push(item);
    }
    return result;
}

function normalizeRow(raw, rowNumber) {
    const row = {
        rowNumber,
        brandName: clean(raw.brandName),
        genericName: clean(raw.genericName),
        dosageForm: clean(raw.dosageForm) || "Unspecified",
        category: clean(raw.category) || "Medicine",
        strength: raw.strength == null ? null : clean(raw.strength),
        strengthUnit: raw.strengthUnit == null ? null : clean(raw.strengthUnit),
        manufacturer: raw.manufacturer == null ? null : clean(raw.manufacturer),
        barcode: raw.barcode == null ? null : clean(raw.barcode),
        batchNumber: clean(raw.batchNumber),
        quantity: number(raw.quantity),
        freeQuantity: number(raw.freeQuantity) || 0,
        uom: clean(raw.uom).toLowerCase() || "piece",
        conversionToBase: number(raw.conversionToBase) || 1,
        expiryDate: isoDate(raw.expiryDate),
        costPrice: number(raw.costPrice),
        sellingPrice: number(raw.sellingPrice),
        extractionMethod: raw._extractionMethod || "structured",
        errors: [],
        warnings: []
    };
    if (!row.brandName && !row.genericName) row.errors.push("Product brand or generic name is required.");
    if (!row.batchNumber) row.errors.push("Batch number is required for inventory import.");
    if (!(row.quantity > 0)) row.errors.push("Quantity must be greater than zero.");
    if (!row.expiryDate) row.errors.push("A valid expiry date is required.");
    if (row.expiryDate && new Date(`${row.expiryDate}T00:00:00`) < new Date(new Date().setHours(0, 0, 0, 0))) row.errors.push("Invoice stock is already expired.");
    if (!(row.conversionToBase > 0)) row.errors.push("Conversion to base must be greater than zero.");
    if (row.costPrice != null && row.costPrice < 0) row.errors.push("Cost price cannot be negative.");
    if (row.sellingPrice != null && row.sellingPrice < 0) row.errors.push("Selling price cannot be negative.");
    if (row.uom !== "piece" && row.conversionToBase === 1) row.warnings.push("Non-base UOM has conversion 1; verify the invoice pack size.");
    return row;
}

async function extractBuffer(buffer, filename) {
    const ext = `.${clean(filename).split(".").pop()?.toLowerCase()}`;
    if (!SUPPORTED_INVOICE_EXTENSIONS.includes(ext)) {
        const error = new Error(`Unsupported invoice type '${ext}'.`); error.statusCode = 415; throw error;
    }
    if (buffer.length > MAX_INVOICE_BYTES) { const error = new Error("Invoice file exceeds the 10 MB safety limit."); error.statusCode = 413; throw error; }

    if ([".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
        return extractVisualInvoice(buffer, filename);
    }

    if (ext === ".xlsx" || ext === ".xls") {
        const workbook = xlsx.read(buffer, { type: "buffer", cellDates: true, dense: true });
        const matrices = workbook.SheetNames.map(name => xlsx.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: true, defval: "" }));
        return matrices.flatMap(rowsFromMatrix);
    }

    if (ext === ".pdf") {
        const parser = new PDFParse({ data: buffer });
        try {
            const tableResult = await parser.getTable();
            const tables = (tableResult.pages || []).flatMap(page => page.tables || []);
            const tableRows = tables.flatMap(table => table);
            const mappedTables = rowsFromMatrix(tableRows);
            if (mappedTables.length) return mappedTables;
            const textResult = await parser.getText();
            const mappedText = rowsFromMatrix(parseDelimited(textResult.text));
            if (mappedText.length) return mappedText;
        } finally { await parser.destroy(); }
        if (visualInvoiceAvailable()) return extractVisualInvoice(buffer, filename);
        const error = new Error("PDF contains no machine-readable invoice rows. Visual invoice recognition is not configured on the server.");
        error.statusCode = 422;
        throw error;
    }

    if (ext === ".doc" || ext === ".docx") {
        const extractor = new WordExtractor();
        const document = await extractor.extract(buffer);
        return rowsFromMatrix(parseDelimited(document.getBody()));
    }

    return rowsFromMatrix(parseDelimited(buffer.toString("utf8")));
}

export async function previewInvoice(buffer, filename) {
    const rawRows = await extractBuffer(buffer, filename);
    if (rawRows.length > MAX_INVOICE_ROWS) { const error = new Error(`Invoice contains more than ${MAX_INVOICE_ROWS} rows.`); error.statusCode = 413; throw error; }
    const rows = rawRows.map((row, index) => normalizeRow(row, index + 1));
    const validRows = rows.filter(row => row.errors.length === 0);
    const visualCount = rows.filter(row => row.extractionMethod === "visual-ai").length;
    return {
        filename: clean(filename),
        supported: true,
        extractionMethod: visualCount ? "visual-ai" : "structured",
        rowCount: rows.length,
        validRowCount: validRows.length,
        invalidRowCount: rows.length - validRows.length,
        rows,
        readyToImport: rows.length > 0 && validRows.length === rows.length
    };
}

function productFilter(row, tenantId) {
    const filter = { tenantId };
    if (row.barcode) return { ...filter, barcode: row.barcode };
    filter.brandName = row.brandName;
    filter.genericName = row.genericName;
    filter.dosageForm = row.dosageForm;
    filter.strength = row.strength;
    return filter;
}

async function findExistingProduct(row, tenantId) {
    const products = getCollection(COLLECTIONS.PRODUCTS);
    return products.findOne(productFilter(row, tenantId));
}

function buildUomMatrix(row) {
    const unit = row.uom || "piece";
    const entries = [{ unit: "piece", conversionToBase: 1, sellingPrice: unit === "piece" ? row.sellingPrice : null, enabled: true }];
    if (unit !== "piece") entries.push({ unit, conversionToBase: row.conversionToBase, sellingPrice: row.sellingPrice, enabled: true });
    return entries;
}

export async function commitInvoice({ tenantId, createdBy, branchId, rows, filename }) {
    if (!Array.isArray(rows) || rows.length === 0) { const error = new Error("No invoice rows were supplied."); error.statusCode = 400; throw error; }
    if (rows.length > MAX_INVOICE_ROWS) { const error = new Error(`Invoice contains more than ${MAX_INVOICE_ROWS} rows.`); error.statusCode = 413; throw error; }
    const normalizedRows = rows.map((row, index) => normalizeRow(row, row.rowNumber || index + 1));
    const invalid = normalizedRows.filter(row => row.errors.length);
    if (invalid.length) { const error = new Error(`Invoice has ${invalid.length} invalid row(s); correct the preview before importing.`); error.statusCode = 400; error.details = invalid; throw error; }

    const results = [];
    for (const row of normalizedRows) {
        let product = await findExistingProduct(row, tenantId);
        let productCreated = false;
        if (!product) {
            const baseUnit = "piece";
            const uomMatrix = buildUomMatrix(row);
            const validation = validateUomConfiguration(baseUnit, uomMatrix);
            if (!validation.valid) { const error = new Error(validation.errors.join(" ")); error.statusCode = 400; throw error; }
            product = await createProduct({
                brandName: row.brandName || row.genericName,
                genericName: row.genericName || row.brandName,
                dosageForm: row.dosageForm,
                category: row.category,
                strength: row.strength,
                strengthUnit: row.strengthUnit,
                manufacturer: row.manufacturer,
                barcode: row.barcode,
                baseUnit,
                uomMatrix: normalizeUomMatrix(uomMatrix),
                stockQuantity: 0,
                catalogInstalled: false,
                catalogSource: "invoice-import"
            }, tenantId);
            productCreated = true;
        }

        const conversion = row.uom === (product.baseUnit || "piece") ? 1 : row.conversionToBase;
        const baseQuantity = (row.quantity + row.freeQuantity) * conversion;
        const batch = await createBatch({
            tenantId,
            productId: new ObjectId(product._id),
            batchNumber: row.batchNumber,
            quantity: baseQuantity,
            expiryDate: row.expiryDate,
            branchId,
            costPrice: row.costPrice == null ? null : row.costPrice / conversion,
            sellingPrice: null,
            createdBy
        });
        results.push({ rowNumber: row.rowNumber, productId: String(product._id), productCreated, batchId: String(batch._id), baseQuantity });
    }
    return { filename: clean(filename), importedCount: results.length, productsCreated: results.filter(item => item.productCreated).length, batchesCreated: results.length, results };
}
