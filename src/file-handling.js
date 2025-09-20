// src/file-handling.js
import { dropArea, fileInput } from './dom-elements.js';
import { handleFiles } from './html-parser.js';

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDrop(e) {
    handleFiles(e.dataTransfer.files);
}

export function initializeFileHandling() {
    if (!dropArea || !fileInput) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => dropArea.addEventListener(eventName, preventDefaults, false));
    ['dragenter', 'dragover'].forEach(eventName => dropArea.addEventListener(eventName, () => dropArea.classList.add('highlight'), false));
    ['dragleave', 'drop'].forEach(eventName => dropArea.addEventListener(eventName, () => dropArea.classList.remove('highlight'), false));
    dropArea.addEventListener('drop', handleDrop, false);
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
}
