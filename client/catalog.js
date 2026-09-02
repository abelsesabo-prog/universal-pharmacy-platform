// ==========================================
// Universal Pharmacy Platform
// Catalog Autocomplete Client
// ==========================================

const SEARCH_DELAY_MS = 120;

export function attachCatalogAutocomplete({ input, results, apiBase = "/api/catalog" }) {
    if (!input || !results) {
        throw new Error("Catalog autocomplete requires input and results elements.");
    }

    let timer = null;
    let requestId = 0;

    const render = items => {
        results.replaceChildren();

        for (const item of items) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "catalog-result";
            button.dataset.catalogName = item.name;
            button.textContent = item.name;
            results.appendChild(button);
        }
    };

    const search = async value => {
        const query = String(value || "").trim();
        if (!query) {
            render([]);
            return;
        }

        const currentRequest = ++requestId;
        const response = await fetch(`${apiBase}/search?q=${encodeURIComponent(query)}&limit=50`, {
            headers: { Accept: "application/json" }
        });

        if (currentRequest !== requestId || !response.ok) return;

        const payload = await response.json();
        render(Array.isArray(payload.results) ? payload.results : []);
    };

    input.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            search(input.value).catch(() => render([]));
        }, SEARCH_DELAY_MS);
    });

    results.addEventListener("click", event => {
        const button = event.target.closest("[data-catalog-name]");
        if (!button) return;
        input.value = button.dataset.catalogName;
        input.dispatchEvent(new Event("change", { bubbles: true }));
        results.replaceChildren();
    });

    return {
        async installSelected({ category = "Medicine" } = {}) {
            const name = String(input.value || "").trim();
            if (!name) throw new Error("Select a catalog item first.");

            const response = await fetch(`${apiBase}/install`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                body: JSON.stringify({ name, category })
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload.error || "Catalog installation failed.");
            }

            return response.json();
        }
    };
}
