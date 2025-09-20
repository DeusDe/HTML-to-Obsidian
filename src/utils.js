// src/utils.js
const logArea = document.getElementById('log');

export function logMessage(message) {
    if (logArea) {
        logArea.textContent += `> ${message}\n`;
        logArea.scrollTop = logArea.scrollHeight;
    }
}

export function cleanFilename(name) {
    if (!name) return 'Unbenannt';
    return name.replace(/[\/\\?%*:|"<>]/g, '-').trim().replace(/\s+/g, ' ');
}


