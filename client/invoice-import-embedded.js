(() => {
    const host = document.querySelector("[data-smart-invoice-import]");
    if (!host) return;
    host.innerHTML = `
      <section class="invoice-card">
        <div class="invoice-head"><div><h2>Smart Invoice Import</h2><p>Upload supplier invoices, review normalized rows, then install verified inventory.</p></div><span class="invoice-badge">Manager / Admin</span></div>
        <div class="invoice-grid">
          <div class="invoice-step"><h3>1. Access</h3><form id="invoiceLogin"><input id="invoiceUsername" placeholder="Username" autocomplete="username" required><input id="invoicePassword" type="password" placeholder="Password" autocomplete="current-password" required><button>Sign in</button></form><div id="invoiceAuthStatus" class="invoice-status">Use the authenticated inventory session.</div></div>
          <div class="invoice-step"><h3>2. Upload</h3><input id="invoiceFile" type="file" accept=".csv,.txt,.xlsx,.xls,.pdf,.doc,.docx" disabled><button id="invoicePreview" disabled>Preview invoice</button><div id="invoiceUploadStatus" class="invoice-status">Authenticate in Inventory before uploading.</div></div>
        </div>
        <div id="invoiceReview" hidden><h3>3. Review before inventory mutation</h3><div id="invoiceSummary" class="invoice-status"></div><div class="invoice-table-wrap"><table><thead><tr><th>Row</th><th>Product</th><th>Batch</th><th>Qty</th><th>UOM</th><th>Conversion</th><th>Expiry</th><th>Validation</th></tr></thead><tbody id="invoiceRows"></tbody></table></div><div class="invoice-actions"><select id="invoiceBranch"><option value="">Default branch</option></select><button id="invoiceCommit" disabled>Confirm & Install Inventory</button></div><div id="invoiceCommitStatus" class="invoice-status"></div></div>
      </section>`;

    const tokenKey = "upp.session.token";
    let token = sessionStorage.getItem(tokenKey) || "";
    let previewRows = [];
    let previewFilename = "";
    const $ = id => host.querySelector(`#${id}`);
    const esc = value => String(value ?? "").replace(/[&<>\"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;" }[c]));
    const headers = () => token ? { Authorization: `Bearer ${token}` } : {};
    function setAuth(message, ok=false) {
        $("invoiceAuthStatus").textContent = message;
        $("invoiceFile").disabled = !token;
        $("invoicePreview").disabled = !token;
        $("invoiceLogin").style.display = token ? "none" : "grid";
    }
    async function login(event) {
        event.preventDefault();
        const response = await fetch("/api/auth/login", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ username:$("invoiceUsername").value, password:$("invoicePassword").value }) });
        const data = await response.json().catch(()=>({}));
        if (!response.ok || !data.token) { token=""; sessionStorage.removeItem(tokenKey); setAuth(data.error || "Login failed."); return; }
        token=data.token;
        sessionStorage.setItem(tokenKey, token);
        setAuth("Authenticated for 8 hours.", true);
        window.dispatchEvent(new CustomEvent("upp:authenticated"));
        loadBranches();
    }
    async function loadBranches() {
        const response = await fetch("/api/branches", { headers:headers() });
        if (!response.ok) return;
        const data=await response.json().catch(()=>({}));
        const select=$("invoiceBranch");
        for (const branch of data.branches || []) {
            const option=document.createElement("option");
            option.value=branch.branchId;
            option.textContent=branch.name || branch.branchId;
            select.appendChild(option);
        }
    }
    async function preview(event) {
        event.preventDefault();
        const file=$("invoiceFile").files[0];
        if (!file || !token) return;
        const form=new FormData();
        form.append("invoice", file);
        $("invoiceUploadStatus").textContent="Parsing and validating invoice…";
        const response=await fetch("/api/invoices/preview", { method:"POST", headers:headers(), body:form });
        const data=await response.json().catch(()=>({}));
        if (!response.ok) { $("invoiceUploadStatus").textContent=data.error || "Invoice preview failed."; return; }
        previewRows=data.preview.rows || [];
        previewFilename=data.preview.filename || file.name;
        $("invoiceReview").hidden=false;
        $("invoiceSummary").textContent=`${data.preview.rowCount} rows · ${data.preview.validRowCount} valid · ${data.preview.invalidRowCount} invalid · ${data.preview.readyToImport ? "READY" : "NOT READY"}`;
        const body=$("invoiceRows"); body.innerHTML="";
        for (const row of previewRows) {
            const tr=document.createElement("tr");
            tr.className=row.errors?.length ? "invoice-bad" : "";
            tr.innerHTML=`<td>${row.rowNumber}</td><td>${esc(row.brandName || row.genericName)}</td><td>${esc(row.batchNumber)}</td><td>${row.quantity ?? ""}</td><td>${esc(row.uom)}</td><td>${row.conversionToBase}</td><td>${esc(row.expiryDate)}</td><td>${row.errors?.length ? `<span class="invoice-danger">${esc(row.errors.join(" "))}</span>` : `<span class="invoice-ok">OK</span>`}</td>`;
            body.appendChild(tr);
        }
        $("invoiceCommit").disabled=!data.preview.readyToImport;
        $("invoiceUploadStatus").textContent="Preview complete. No inventory was changed.";
    }
    async function commit(event) {
        event.preventDefault();
        if (!token || !previewRows.length) return;
        $("invoiceCommit").disabled=true;
        $("invoiceCommitStatus").textContent="Installing inventory atomically…";
        const response=await fetch("/api/invoices/commit", { method:"POST", headers:{...headers(),"Content-Type":"application/json"}, body:JSON.stringify({ filename:previewFilename, branchId:$("invoiceBranch").value || null, rows:previewRows }) });
        const data=await response.json().catch(()=>({}));
        if (!response.ok) { $("invoiceCommitStatus").textContent=data.error || "Invoice import failed."; $("invoiceCommit").disabled=false; return; }
        $("invoiceCommitStatus").textContent=`Imported ${data.result.importedCount} row(s); created ${data.result.productsCreated} product(s) and ${data.result.batchesCreated} batch(es).`;
    }
    window.addEventListener("upp:authenticated", () => {
        token = sessionStorage.getItem(tokenKey) || "";
        setAuth("Using the authenticated inventory session.", true);
        loadBranches();
    });
    $("invoiceLogin").addEventListener("submit", login);
    $("invoicePreview").addEventListener("click", preview);
    $("invoiceCommit").addEventListener("click", commit);
    if (token) { setAuth("Using the authenticated inventory session.", true); loadBranches(); }
})();
