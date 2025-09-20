// src/html-parser.js
import { summaryDiv, folderNameInput, convertButton } from './dom-elements.js';
import { logMessage, cleanFilename } from './utils.js';

let currentFileName = null;
let parsedDoc = null;

export function getCurrentFileName() {
    return currentFileName;
}

export function getParsedDoc() {
    return parsedDoc;
}

export async function handleHtmlContent(htmlString, fileName = "URL_Download.html") {
    logMessage(`Verarbeite HTML-Inhalt von: ${fileName}`);
    currentFileName = fileName;

    try {
        const parser = new DOMParser();
        parsedDoc = parser.parseFromString(htmlString, 'text/html');

        const lawTitle = parsedDoc.querySelector('h1 span.jnlangue')?.textContent.trim();
        const lawAbbr = parsedDoc.querySelector('h1 span.jnamtabk')?.textContent.replace(/[()]/g, '').trim();
        const paragraphs = parsedDoc.querySelectorAll('div.jnnorm h3 span.jnenbez');
                const paragraphCount = Array.from(paragraphs).filter(p => p.textContent.trim().startsWith('§') || p.textContent.trim().startsWith('Art')).length;
        const sectionCount = parsedDoc.querySelectorAll('div.jnnorm h2').length;

        folderNameInput.value = cleanFilename(lawAbbr || 'Gesetz');
        summaryDiv.querySelector('#summary-title span').textContent = `${lawTitle || 'Unbekannt'} (${lawAbbr || 'N/A'})`;
        summaryDiv.querySelector('#summary-paragraphs span').textContent = paragraphCount;
        summaryDiv.querySelector('#summary-sections span').textContent = sectionCount;
        
        const statusSpan = summaryDiv.querySelector('#summary-status span');
        if (lawTitle && paragraphCount > 0) {
            statusSpan.textContent = "✅ Datei-Struktur scheint gültig";
            statusSpan.className = 'valid';
            convertButton.disabled = false;
        } else {
            statusSpan.textContent = "⚠️ Wichtige Elemente (Titel, §) fehlen! Falsche Datei?";
            statusSpan.className = 'invalid';
            convertButton.disabled = true;
        }
        summaryDiv.classList.remove('hidden');

    } catch (error) {
        logMessage(`Fehler bei der HTML-Analyse: ${error.message}`);
        summaryDiv.classList.add('hidden');
        convertButton.disabled = true;
    }
}
