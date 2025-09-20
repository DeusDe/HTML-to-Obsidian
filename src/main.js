// src/main.js
import { initializeThemeToggle } from './theme-toggle.js';
import { initializeFileHandling } from './file-handling.js';
import { convertAndDownload } from './zip-generator.js';
import { convertButton } from './dom-elements.js';

document.addEventListener('DOMContentLoaded', () => {
    initializeThemeToggle();
    initializeFileHandling();

    if (convertButton) {
        convertButton.addEventListener('click', convertAndDownload);
    }
});
