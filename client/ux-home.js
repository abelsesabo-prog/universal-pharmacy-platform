const HOME_CLASS = "ux-home-ready";

function bootHome() {
    if (typeof document === "undefined") return;
    if (document.body?.classList.contains(HOME_CLASS)) return;
    document.body?.classList.add(HOME_CLASS);

    const main = document.querySelector("main");
    const header = document.querySelector("header");
    if (!main || !header) return;

    let launcher = document.getElementById("ux-home-launcher");
    if (!launcher) {
        launcher = document.createElement("section");
        launcher.id = "ux-home-launcher";
        launcher.setAttribute("aria-label", "Workspace launcher");
        launcher.innerHTML = `
          <div class="ux-home-copy">
            <span class="ux-home-kicker">UNIVERSAL BUSINESS BODY</span>
            <h2>What needs attention?</h2>
            <p>Jump directly to the human workspace you need. The shell stays out of the way while the operational modules do the work.</p>
          </div>
          <div class="ux-home-actions">
            <a href="/pos-master.html" class="ux-home-action ux-home-primary"><strong>Sell</strong><span>Fast cashier workspace</span></a>
            <a href="/uom-product.html" class="ux-home-action"><strong>Product Setup</strong><span>Identity, UOM and commercial data</span></a>
            <a href="/uom-pos.html" class="ux-home-action"><strong>UOM Lab</strong><span>Packaging and quantity logic</span></a>
            <a href="/smart-invoice.html" class="ux-home-action"><strong>Smart Invoice</strong><span>Import and reason over supplier data</span></a>
          </div>`;
        header.insertAdjacentElement("afterend", launcher);
    }

    if (!document.getElementById("ux-home-status-strip")) {
        const strip = document.createElement("div");
        strip.id = "ux-home-status-strip";
        strip.innerHTML = `
          <div class="ux-status-pill"><span class="ux-dot"></span><strong>Operational shell</strong><span>Ready for human work</span></div>
          <div class="ux-status-pill"><strong>Offline capable</strong><span>Local draft + background reconciliation</span></div>
          <div class="ux-status-pill"><strong>Safety aware</strong><span>Stock, expiry and regulated flows remain controlled</span></div>`;
        launcher.insertAdjacentElement("afterend", strip);
    }

    main.querySelectorAll("section.card, section.panel").forEach((section, index) => {
        section.classList.add("ux-home-reveal");
        section.style.setProperty("--ux-reveal-delay", `${Math.min(index, 5) * 45}ms`);
    });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootHome, { once: true });
else bootHome();

export { bootHome };
