// src/file-handling.js
import { urlInput, fetchUrlButton, convertButton } from './dom-elements.js';
import { handleHtmlContent } from './html-parser.js';
import { logMessage } from './utils.js';

async function fetchHtmlFromUrl() {
    const initialUrl = urlInput.value.trim();
    if (!initialUrl) {
        logMessage("Bitte geben Sie eine URL ein.");
        return;
    }

    if (!initialUrl.startsWith("https://www.gesetze-im-internet.de/")) {
        logMessage("Ungültige URL. Bitte geben Sie eine URL von gesetze-im-internet.de ein.");
        return;
    }

    logMessage(`Lade initiale HTML von URL: ${initialUrl}`);
    convertButton.disabled = true;

    try {
        // Step 1: Fetch the initial URL
        const initialResponse = await fetch(initialUrl);
        if (!initialResponse.ok) {
            throw new Error(`HTTP-Fehler beim Laden der initialen URL! Status: ${initialResponse.status}`);
        }
        const initialHtmlContent = await initialResponse.text();

        // Step 2: Parse the initial HTML to find the link to the full HTML version
        const parser = new DOMParser();
        const doc = parser.parseFromString(initialHtmlContent, 'text/html');
        const headlineElement = doc.querySelector('h2.headline');
        let fullHtmlLink = null;

        if (headlineElement) {
            const htmlAnchor = headlineElement.querySelector('a abbr');
            if (htmlAnchor && htmlAnchor.textContent.trim() === 'HTML') {
                fullHtmlLink = htmlAnchor.closest('a')?.getAttribute('href');
            }
        }

        if (!fullHtmlLink) {
            logMessage("Fehler: Link zur vollständigen HTML-Version nicht gefunden. Ist dies eine Übersichtsseite?");
            convertButton.disabled = true;
            return;
        }

        // Step 3: Construct the full URL for the linked HTML file
        const baseUrl = initialUrl.substring(0, initialUrl.lastIndexOf('/') + 1);
        const fullHtmlUrl = new URL(fullHtmlLink, baseUrl).href;

        logMessage(`Lade vollständige HTML-Version von: ${fullHtmlUrl}`);

        // Step 4: Fetch the new HTML file
        const fullHtmlResponse = await fetch(fullHtmlUrl);
        if (!fullHtmlResponse.ok) {
            throw new Error(`HTTP-Fehler beim Laden der vollständigen HTML-Version! Status: ${fullHtmlResponse.status}`);
        }
        const finalHtmlContent = await fullHtmlResponse.text();

        // Step 5: Pass this new HTML content to handleHtmlContent
        const urlParts = fullHtmlUrl.split('/');
        const fileName = urlParts[urlParts.length - 1].replace('.html', '') + '.html';
        await handleHtmlContent(finalHtmlContent, fileName);

    } catch (error) {
        logMessage(`Fehler beim Laden oder Verarbeiten der URL: ${error.message}`);
        convertButton.disabled = true;
    }
}

export function initializeFileHandling() {
    if (!fetchUrlButton) return; // Only check for fetchUrlButton now

    fetchUrlButton.addEventListener('click', fetchHtmlFromUrl);
}
