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

    // Make setting groups collapsible
    document.querySelectorAll('.setting-group-header').forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling; // The content div is the next sibling
            const button = header.querySelector('.toggle-button');

            content.classList.toggle('collapsed');
            button.classList.toggle('collapsed');
        });
    });
});
