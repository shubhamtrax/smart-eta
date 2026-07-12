document.addEventListener("DOMContentLoaded", () => {

    const widgetEl = document.getElementById("smarteta-widget");
    const button = document.getElementById("smarteta-check");

    if (!button) return;

    // Fire-and-forget impression log — never let this affect the widget UI.
    fetch("/apps/smarteta/view").catch(() => {});

    applyWidgetSettings();

    function applyWidgetSettings() {
        fetch("/apps/smarteta/widget-settings")
            .then((r) => r.json())
            .then((data) => {
                if (!data.success || !data.settings || !widgetEl) return;

                const s = data.settings;

                const headingEl = widgetEl.querySelector(".smarteta-header h3");
                const descriptionEl = widgetEl.querySelector(".smarteta-header p");
                const buttonEl = document.getElementById("smarteta-check");

                if (headingEl && s.heading) headingEl.textContent = s.heading;
                if (descriptionEl && s.description) descriptionEl.textContent = s.description;
                if (buttonEl && s.buttonText) buttonEl.textContent = s.buttonText;

                if (s.accentColor) widgetEl.style.setProperty("--smarteta-accent", s.accentColor);
                if (s.cornerRadius !== undefined) widgetEl.style.setProperty("--smarteta-radius", `${s.cornerRadius}px`);
            })
            .catch(() => {
                // Network hiccup — the widget just keeps its Liquid block defaults.
            });
    }

    // Product context from the Liquid block's data attributes — used server-side
    // to match Advanced Rules (product/collection/vendor/tag extra-day adjustments).
    const productHandle = widgetEl?.dataset.productHandle || "";
    const vendor = widgetEl?.dataset.vendor || "";
    const tags = widgetEl?.dataset.tags || "";
    const collections = widgetEl?.dataset.collections || "";

    const productParams = new URLSearchParams({
        ...(productHandle && { productHandle }),
        ...(vendor && { vendor }),
        ...(tags && { tags }),
        ...(collections && { collections }),
    }).toString();

    initCountdown();

    function initCountdown() {
        const el = document.getElementById("smarteta-countdown");
        if (!el) return;

        fetch("/apps/smarteta/countdown")
            .then((r) => r.json())
            .then((data) => {
                if (!data.success || data.cutoffPassed) return;

                let remaining = data.secondsRemaining;
                el.style.display = "flex";
                render();

                const timer = setInterval(() => {
                    remaining -= 1;
                    if (remaining <= 0) {
                        clearInterval(timer);
                        el.style.display = "none";
                        return;
                    }
                    render();
                }, 1000);

                function render() {
                    const h = Math.floor(remaining / 3600);
                    const m = Math.floor((remaining % 3600) / 60);
                    const s = Math.floor(remaining % 60);
                    const pad = (n) => String(n).padStart(2, "0");
                    el.innerHTML = `🔥 Order within <strong>${pad(h)}:${pad(m)}:${pad(s)}</strong> for today's dispatch`;
                }
            })
            .catch(() => {});
    }

    const pincodeInput = document.getElementById("smarteta-pincode");
    const result = document.getElementById("smarteta-result");

    // Restrict input to digits so users can't submit garbage pincodes.
    pincodeInput.addEventListener("input", () => {
        pincodeInput.value = pincodeInput.value.replace(/\D/g, "").slice(0, 6);
    });

    pincodeInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") button.click();
    });

    function formatEstimatedDate(days) {
        const date = new Date();
        date.setDate(date.getDate() + Number(days || 0));
        return date.toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
        });
    }

    function errorMarkup(message) {
        return `
            <div class="smarteta-error">
                <span class="smarteta-error-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/>
                        <path d="M12 8v5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
                        <circle cx="12" cy="16" r="1" fill="currentColor"/>
                    </svg>
                </span>
                <span>${message}</span>
            </div>
        `;
    }

    button.addEventListener("click", async () => {

        const pincode = pincodeInput.value.trim();

        if (pincode.length !== 6) {
            result.innerHTML = errorMarkup("Please enter a valid 6 digit pincode.");
            return;
        }

        button.disabled = true;

        result.innerHTML = `
            <div class="smarteta-loading">
                <span class="smarteta-spinner"></span>
                <span>Checking delivery...</span>
            </div>
        `;

        try {

            const api = `/apps/smarteta/check?pincode=${encodeURIComponent(pincode)}${productParams ? "&" + productParams : ""}`;
            const response = await fetch(api);
            const data = await response.json();

            if (!data.success || !data.available) {
                result.innerHTML = errorMarkup("Delivery not available at this pincode.");
                return;
            }

            const estimatedDate = data.estimatedDeliveryLabel || formatEstimatedDate(data.deliveryDays);
            const location = [data.city, data.state].filter(Boolean).join(", ");

            const estimateNote = data.isEstimate
                ? `<p class="smarteta-location">General estimate — exact pincode not on file</p>`
                : "";

            const codBadgeClass = data.codAvailable
                ? "smarteta-badge-cod-yes"
                : "smarteta-badge-cod-no";

            const codLabel = data.codAvailable ? "COD Available" : "COD Not Available";

            result.innerHTML = `
                <div class="smarteta-success">
                    <span class="smarteta-success-icon">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/>
                            <path d="M8.5 12.5l2.4 2.4L15.8 9.3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </span>
                    <div class="smarteta-success-body">
                        <p class="smarteta-eta">Get it by ${estimatedDate}</p>
                        ${location ? `<p class="smarteta-location">${location}</p>` : ""}
                        ${estimateNote}
                        <div class="smarteta-badges">
                            <span class="smarteta-badge smarteta-badge-delivery">🚚 ${data.deliveryDays} Day${data.deliveryDays == 1 ? "" : "s"}</span>
                            <span class="smarteta-badge ${codBadgeClass}">${data.codAvailable ? "✓" : "✕"} ${codLabel}</span>
                        </div>
                    </div>
                </div>
            `;

        } catch (e) {

            console.log(e);
            result.innerHTML = errorMarkup("Cannot connect to SmartETA server. Please try again.");

        } finally {
            button.disabled = false;
        }

    });

});