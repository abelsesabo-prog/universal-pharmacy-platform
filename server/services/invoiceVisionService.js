const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = process.env.INVOICE_VISION_MODEL || "gemini-3.8-flash";

const RESPONSE_SCHEMA = {
    type: "ARRAY",
    items: {
        type: "OBJECT",
        properties: {
            brandName: { type: "STRING" },
            genericName: { type: "STRING" },
            dosageForm: { type: "STRING" },
            category: { type: "STRING" },
            strength: { type: "STRING" },
            strengthUnit: { type: "STRING" },
            manufacturer: { type: "STRING" },
            barcode: { type: "STRING" },
            batchNumber: { type: "STRING" },
            quantity: { type: "NUMBER" },
            freeQuantity: { type: "NUMBER" },
            uom: { type: "STRING" },
            conversionToBase: { type: "NUMBER" },
            expiryDate: { type: "STRING" },
            costPrice: { type: "NUMBER" },
            sellingPrice: { type: "NUMBER" }
        },
        required: ["brandName", "genericName", "dosageForm", "category", "strength", "strengthUnit", "manufacturer", "barcode", "batchNumber", "quantity", "freeQuantity", "uom", "conversionToBase", "expiryDate", "costPrice", "sellingPrice"]
    }
};

function mimeType(filename) {
    const ext = `.${String(filename || "").split(".").pop()?.toLowerCase()}`;
    return {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp"
    }[ext] || null;
}

export function visualInvoiceAvailable() {
    return Boolean(process.env.GEMINI_API_KEY);
}

function responseText(payload) {
    return (payload?.candidates || [])
        .flatMap(candidate => candidate?.content?.parts || [])
        .map(part => part?.text || "")
        .join("\n")
        .trim();
}

export async function extractVisualInvoice(buffer, filename) {
    const apiKey = process.env.GEMINI_API_KEY;
    const mime = mimeType(filename);
    if (!apiKey) {
        const error = new Error("Visual invoice recognition is not configured. Set GEMINI_API_KEY on the server.");
        error.statusCode = 503;
        throw error;
    }
    if (!mime) {
        const error = new Error(`Visual invoice recognition does not support '${filename}'.`);
        error.statusCode = 415;
        throw error;
    }

    const prompt = `You are the visual document extraction engine for a pharmacy inventory system. Inspect the entire invoice visually, including scanned/image content, tables, rotated text, logos and non-standard layouts. Extract ONLY inventory line items, not totals, addresses, tax IDs, bank details, payment terms or other header/footer information.

Return one object per product row. Map common invoice columns intelligently: Product/Item -> brandName when it is a commercial product name; Generic/Active ingredient -> genericName only when explicitly shown; Batch/Lot -> batchNumber; Qty/Quantity -> quantity; Free/FOC/Bonus -> freeQuantity; Exp/Expiry -> expiryDate; Rate/Unit price/Purchase price -> costPrice. If the invoice explicitly shows a selling/retail price, use sellingPrice; otherwise use an empty value. If a value is not visible or explicitly stated, return an empty string for text fields and 0 for numeric fields rather than inventing it.

Expiry dates may be written as MM/YY or MM/YYYY. Preserve the visible value exactly; the inventory normalizer will convert month/year expiry to the final day of that month. Do not confuse invoice date or due date with product expiry. Do not treat an invoice row number as a batch number. Do not invent pack sizes or UOM conversions: use piece and conversionToBase 1 unless the invoice explicitly states a different selling/pack unit and conversion.

This is a data extraction task, not a product-identification task. Do not use outside knowledge to fill missing medicine attributes. Accuracy of quantity, batch, expiry and price is more important than completing optional fields.`;

    const response = await fetch(`${GEMINI_ENDPOINT}/${DEFAULT_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: mime, data: Buffer.from(buffer).toString("base64") } }
                ]
            }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: RESPONSE_SCHEMA,
                temperature: 0
            }
        })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const detail = payload?.error?.message || `Visual invoice recognition failed (${response.status}).`;
        const error = new Error(detail);
        error.statusCode = response.status === 429 ? 503 : 502;
        throw error;
    }

    const text = responseText(payload);
    if (!text) {
        const error = new Error("Visual invoice recognition returned no extracted rows.");
        error.statusCode = 422;
        throw error;
    }

    let rows;
    try {
        rows = JSON.parse(text);
    } catch {
        const error = new Error("Visual invoice recognition returned invalid structured data.");
        error.statusCode = 502;
        throw error;
    }

    if (!Array.isArray(rows)) {
        const error = new Error("Visual invoice recognition returned an invalid row collection.");
        error.statusCode = 502;
        throw error;
    }

    return rows.map(row => ({ ...row, _extractionMethod: "visual-ai" }));
}
