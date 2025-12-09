// SillyTavern Extension Entry Point
// This script is loaded by SillyTavern when the extension is enabled.

(function() {
    console.log("[PSG-TC] Extension Loading...");

    // Helper to load CSS
    function loadCSS(href) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
    }

    // Helper to load JS sequentially
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
        });
    }

    // Main initialization
    async function init() {
        // Adjust path if necessary. Standard ST extension path:
        const extensionPath = 'scripts/extensions/third-party/PSG-TC'; 
        
        // 1. Load CSS
        loadCSS(`${extensionPath}/css/style.css`);

        // 2. Inject HTML Structure
        // Since we are running INSIDE SillyTavern, we might want to overlay or replace the UI.
        // For "Total Conversion" style, we usually hide ST's default UI.
        const app = document.getElementById('app');
        // if (app) app.style.display = 'none'; // Optional: Hide default ST UI if you want full takeover
        
        // Load our HTML content (fetch and inject)
        try {
            const res = await fetch(`${extensionPath}/同层主.html`);
            const htmlText = await res.text();
            
            // Extract body content (simple parser)
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');
            
            // Create a container for our UI
            const container = document.createElement('div');
            container.id = 'psg-tc-root';
            
            // Style it to overlay or integrate
            container.style.position = 'fixed';
            container.style.top = '0';
            container.style.left = '0';
            container.style.width = '100vw';
            container.style.height = '100vh';
            container.style.zIndex = '2000'; // High enough to overlay but maybe not block critical modals
            container.style.background = '#fff';
            
            // Add a close/minimize button for the overlay just in case
            const closeBtn = document.createElement('button');
            closeBtn.innerText = 'Exit PSG Mode';
            closeBtn.style.position = 'absolute';
            closeBtn.style.top = '10px';
            closeBtn.style.right = '10px';
            closeBtn.style.zIndex = '2001';
            closeBtn.onclick = () => {
                container.style.display = 'none';
                if(app) app.style.display = '';
            };
            container.appendChild(closeBtn);

            // Move nodes from parsed doc to container (excluding scripts which we load manually)
            Array.from(doc.body.childNodes).forEach(node => {
                if (node.tagName !== 'SCRIPT') {
                    container.appendChild(node.cloneNode(true));
                }
            });
            
            document.body.appendChild(container);
            console.log("[PSG-TC] UI Injected");

            // 3. Load Scripts
            // Order matters: core -> music -> main
            await loadScript(`${extensionPath}/js/rpg-core.js`);
            await loadScript(`${extensionPath}/js/music-player.js`);
            await loadScript(`${extensionPath}/js/main.js`);
            
            console.log("[PSG-TC] Scripts Loaded");

        } catch (e) {
            console.error("[PSG-TC] Failed to load UI:", e);
            if (app) app.style.display = ''; // Restore ST UI on error
        }
    }

    // Wait for ST to be ready (optional, but good practice)
    // Here we just run immediately as extensions load late
    init();
})();