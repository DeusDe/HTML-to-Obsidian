// src/html-parser.js
import { fileInput, summaryDiv, folderNameInput, convertButton, lawNameInput } from './dom-elements.js';
import { logMessage, cleanFilename } from './utils.js';

let currentFile = null;
let parsedDoc = null;

export function getCurrentFile() {
    return currentFile;
}

export function getParsedDoc() {
    return parsedDoc;
}

export async function handleFiles(files) {
    if (files.length === 0) return;
    currentFile = files[0];
    logMessage(`Datei ausgewählt: ${currentFile.name}`);
    
    try {
        const reader = new FileReader();
        const fileReadPromise = new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
        });
        reader.readAsText(currentFile, 'windows-1252');
        const htmlContent = await fileReadPromise;

        const parser = new DOMParser();
        parsedDoc = parser.parseFromString(htmlContent, 'text/html');

        const lawTitle = parsedDoc.querySelector('h1 span.jnlangue')?.textContent.trim();
        const lawAbbr = parsedDoc.querySelector('h1 span.jnamtabk')?.textContent.replace(/[()]/g, '').trim();
        const paragraphs = parsedDoc.querySelectorAll('div.jnnorm h3 span.jnenbez');
                const paragraphCount = Array.from(paragraphs).filter(p => p.textContent.trim().startsWith('§') || p.textContent.trim().startsWith('Art')).length;
        const sectionCount = parsedDoc.querySelectorAll('div.jnnorm h2').length;

        folderNameInput.value = cleanFilename(lawAbbr || 'Gesetz');
        lawNameInput.value = lawTitle || 'Gesetz';
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
        logMessage(`Fehler bei der Dateianalyse: ${error.message}`);
        summaryDiv.classList.add('hidden');
        convertButton.disabled = true;
    }
}
