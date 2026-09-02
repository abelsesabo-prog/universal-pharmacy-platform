const UX_SHELL_CLASS = "ux-shell-ready";

function ensureShell() {
    const body = document.body;
    if (!body || body.classList.contains(UX_SHELL_CLASS)) return;

    body.classList.add(UX_SHELL_CLASS);

    const header = document.querySelector("header");
    if (!header) return;

    let rail = document.getElementById("ux-command-rail");
    if (!rail) {
        rail = document.createElement("div");
        rail.id = "ux-command-rail";
        rail.setAttribute("role", "navigation");
        rail.setAttribute("aria-label", "Quick workspace navigation");
        rail.innerHTML = `
          <div class="ux-rail-inner">
            <button type="button" data-ux-focus="search">⌕ <span>Focus</span></button>
            <button type="button" data-ux-scroll="workspace">▦ <span>Workspace</span></button>
            <button type="button" data-ux-scroll="recent">✓ <span>Recent</span></button>
          </div>`;
        header.insertAdjacentElement("afterend", rail);
    }

    rail.addEventListener("click", event => {
        const focusTarget = event.target.closest("[data-ux-focus]");
        if (focusTarget) {
            const target = document.getElementById(focusTarget.dataset.uxFocus);
            target?.focus({ preventScroll: false });
            target?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }

        const scrollTarget = event.target.closest("[data-ux-scroll]");
        if (!scrollTarget) return;
        const key = scrollTarget.dataset.uxScroll;
        const target = key === "workspace"
            ? document.querySelector(".workspace")
            : document.querySelector(".recent, #recent, .recent-body");
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
}

function wireFastSearch() {
    const search = document.getElementById("search");
    if (!search || search.dataset.uxEnhanced === "true") return;
    search.dataset.uxEnhanced = "true";
    search.setAttribute("enterkeyhint", "search");
    search.addEventListener("keydown", event => {
        if (event.key !== "Enter") return;
        const product = document.getElementById("product");
        if (product && !product.value && product.options.length === 2) {
            product.selectedIndex = 1;
            product.dispatchEvent(new Event("change", { bubbles: true }));
        }
    });

    window.addEventListener("keydown", event => {
        if (event.defaultPrevented) return;
        const tag = String(document.activeElement?.tagName || "").toLowerCase();
        const editing = tag === "input" || tag === "textarea" || tag === "select";
        if (event.key === "/" && !editing) {
            event.preventDefault();
            search.focus();
        }
    });
}

function boot() {
    ensureShell();
    wireFastSearch();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
else boot();

export { boot, ensureShell, wireFastSearch };
