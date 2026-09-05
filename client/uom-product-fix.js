(() => {
  if (window.__uppUomCreateFix) return;
  window.__uppUomCreateFix = true;

  const TOKEN_KEY = "universal-pharmacy.authToken";
  const $ = id => document.getElementById(id);

  function setMessage(text, cls = "message muted") {
    const el = $("message");
    if (!el) return;
    el.className = cls;
    el.textContent = text;
  }

  function token() {
    return sessionStorage.getItem(TOKEN_KEY) || "";
  }

  function value(id) {
    const el = $(id);
    return el ? String(el.value ?? "").trim() : "";
  }

  function collectUoms() {
    return [...document.querySelectorAll("#uomList .uom-row")].map(row => ({
      unit: String(row.querySelector(".uom-unit")?.value ?? "").trim(),
      conversionToBase: Number(row.querySelector(".uom-conv")?.value),
      sellingPrice: Number(row.querySelector(".uom-price")?.value),
      enabled: true
    }));
  }

  async function createItemFallback(button) {
    if (!token()) {
      setMessage("Sign in before creating inventory.", "message error");
      return;
    }

    const required = ["genericName", "dosageForm", "category", "baseUnit", "batchNumber", "stockQuantity", "expiryDate"];
    const missing = required.find(id => !value(id));
    if (missing) {
      const labels = {
        genericName: "item name / generic name",
        dosageForm: "dosage form / type",
        category: "category",
        baseUnit: "base unit",
        batchNumber: "batch / lot number",
        stockQuantity: "opening stock",
        expiryDate: "expiry date"
      };
      setMessage(`Enter ${labels[missing]}.`, "message error");
      return;
    }

    const stock = Number(value("stockQuantity"));
    if (!(stock > 0)) {
      setMessage("Opening stock must be greater than zero.", "message error");
      return;
    }

    const uomMatrix = collectUoms();
    if (!uomMatrix.length) {
      setMessage("Add at least one sellable unit.", "message error");
      return;
    }
    if (uomMatrix.some(x => !x.unit || !(x.conversionToBase > 0) || !Number.isFinite(x.sellingPrice) || x.sellingPrice < 0)) {
      setMessage("Complete every sellable unit, conversion and price.", "message error");
      return;
    }

    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = "Creating...";
    setMessage("Creating item and opening batch...", "message muted");

    const payload = {
      brandName: value("brandName") || value("genericName"),
      genericName: value("genericName"),
      dosageForm: value("dosageForm"),
      category: value("category"),
      strength: value("strength") || null,
      strengthUnit: value("strengthUnit") || null,
      manufacturer: value("manufacturer") || null,
      registrationAgency: value("registrationAgency") || null,
      registrationNumber: value("registrationNumber") || null,
      packSize: value("packSize") || null,
      baseUnit: value("baseUnit") || "piece",
      uomMatrix,
      barcode: value("barcode") || null,
      stockQuantity: 0
    };

    try {
      const productResponse = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token()}`
        },
        body: JSON.stringify(payload)
      });
      const productData = await productResponse.json().catch(() => ({}));
      if (!productResponse.ok || !productData.success || !productData.product?._id) {
        throw new Error(productData.error || `Failed to create item (${productResponse.status}).`);
      }

      const batchPayload = {
        productId: productData.product._id,
        batchNumber: value("batchNumber"),
        quantity: stock,
        expiryDate: value("expiryDate"),
        manufacturedDate: value("manufacturedDate") || null,
        costPrice: value("costPrice") === "" ? null : Number(value("costPrice")),
        sellingPrice: uomMatrix[0].sellingPrice,
        location: value("location") || null,
        supplierId: value("supplierId") || null
      };

      const batchResponse = await fetch("/api/inventory/batches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token()}`
        },
        body: JSON.stringify(batchPayload)
      });
      const batchData = await batchResponse.json().catch(() => ({}));
      if (!batchResponse.ok || !batchData.success) {
        throw new Error(batchData.error || `Item was created but initial batch failed (${batchResponse.status}).`);
      }

      setMessage(`Inventory item created successfully. Batch ${value("batchNumber")} is recorded.`, "message success");
      button.textContent = "Created";
    } catch (error) {
      setMessage(error.message || "Unable to create inventory item.", "message error");
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  function bind() {
    const button = $("nextButton");
    if (!button || button.dataset.uomCreateFixBound === "1") return;
    button.dataset.uomCreateFixBound = "1";

    document.addEventListener("click", event => {
      const target = event.target?.closest?.("#nextButton");
      if (target !== button) return;
      const activeStep = document.querySelector('.step.active');
      if (!activeStep || activeStep.dataset.step !== "6") return;

      event.preventDefault();
      event.stopImmediatePropagation();
      if (button.disabled) return;

      if (typeof window.createProductAndBatch === "function") {
        window.createProductAndBatch().catch(error => {
          setMessage(error.message || "Unable to create inventory item.", "message error");
          button.disabled = false;
        });
      } else {
        createItemFallback(button);
      }
    }, true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, { once: true });
  else bind();
})();
