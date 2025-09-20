// src/markdown-converter.js
import { removeSuperscriptCheckbox, tagsToRemoveInput, headingLevelAdjustment, imageHandlingSelect, convertExternalLinksToReferencesCheckbox } from './dom-elements.js';

function convertTableToMarkdown(tableNode) {
    let tableMarkdown = '\n';
    const rows = Array.from(tableNode.querySelectorAll('tr'));
    
    rows.forEach((row, rowIndex) => {
        const cells = Array.from(row.querySelectorAll('th, td'));
        const cellContents = cells.map(cell => cell.textContent.trim().replace(/\|/g, '\\|'));
        tableMarkdown += `| ${cellContents.join(' | ')} |\n`;
        
        if (rowIndex === 0) {
            tableMarkdown += `|${' --- |'.repeat(cells.length)}\n`;
        }
    });
    return tableMarkdown + '\n';
}

export function htmlToMarkdown(element, { addAbsMarker = false, footnoteMap = new Map() } = {}) {
    let absCounter = 1;
    const tagsToRemove = tagsToRemoveInput.value.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag !== '');
    const headingLevelOffset = parseInt(headingLevelAdjustment.value, 10);
    const linkReferences = new Map(); // Map to store external link URLs and their reference IDs
    let linkCounter = 1;

    function processNode(node, indentLevel = 0) {
        let result = '';
        const indent = '  '.repeat(indentLevel);

        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent.replace(/\s+/g, ' ');
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.tagName.toLowerCase();
            if (tagsToRemove.includes(tagName)) {
                return ''; // Skip this tag and its content
            }
            switch (tagName) {
                case 'h1':
                case 'h2':
                case 'h3':
                case 'h4':
                case 'h5':
                case 'h6':
                    const level = parseInt(tagName.substring(1), 10) + headingLevelOffset;
                    const markdownPrefix = '#'.repeat(Math.min(6, Math.max(1, level)));
                    result += `${markdownPrefix} ${Array.from(node.childNodes).map(child => processNode(child, indentLevel)).join('')}\n\n`;
                    break;
                case 'sup':
                    const supContent = node.textContent.trim();
                    const footnoteId = parseInt(supContent, 10); // Assuming superscript content is a number for footnotes

                    if (footnoteMap.has(footnoteId)) {
                        result += `[^${footnoteId}]`; // Convert to Obsidian-style footnote reference
                    } else if (!removeSuperscriptCheckbox.checked) {
                        result += `<sup>${supContent}</sup>`; // Keep as HTML if not a recognized footnote and not set to remove
                    }
                    break;
                case 'img':
                    const imageHandling = imageHandlingSelect.value;
                    if (imageHandling === 'keep') {
                        const src = node.getAttribute('src') || '';
                        const alt = node.getAttribute('alt') || '';
                        result += `![${alt}](${src})`;
                    } else if (imageHandling === 'remove') {
                        // Do nothing, effectively remove the image
                    }
                    break;
                case 'dl':
                    let dtContent = '';
                    Array.from(node.children).forEach(listItem => {
                        if (listItem.tagName.toLowerCase() === 'dt') dtContent = listItem.textContent.trim();
                        if (listItem.tagName.toLowerCase() === 'dd') result += `\n${indent}- ${dtContent} ${processNode(listItem, indentLevel + 1).trim()}`;
                    });
                    break;
                case 'a':
                    const href = node.getAttribute('href');
                    const linkText = Array.from(node.childNodes).map(child => processNode(child, indentLevel)).join('');

                    if (href && convertExternalLinksToReferencesCheckbox.checked && (href.startsWith('http://') || href.startsWith('https://'))) {
                        let refId = linkReferences.get(href);
                        if (!refId) {
                            refId = `ref${linkCounter++}`;
                            linkReferences.set(href, refId);
                        }
                        result += `[${linkText}][${refId}]`;
                    } else if (href) {
                        result += `[${linkText}](${href})`;
                    } else {
                        result += linkText; // Just the text if no href
                    }
                    break;
                case 'table':
                    result += convertTableToMarkdown(node);
                    break;
                case 'div':
                case 'p':
                    // Special handling for jurAbsatz divs to separate them with horizontal rules
                    if (tagName === 'div' && node.classList.contains('jurAbsatz')) {
                        let absContent = Array.from(node.childNodes).map(child => processNode(child, indentLevel)).join('').trim();
                        if (addAbsMarker && absContent) {
                            absContent += ` ^abs${absCounter}`;
                            absCounter++;
                        }
                        result += absContent; // Don't add newline here, it will be added by join
                    } else {
                        result += Array.from(node.childNodes).map(child => processNode(child, indentLevel)).join('');
                    }
                    break;
                default:
                    result += Array.from(node.childNodes).map(child => processNode(child, indentLevel)).join('');
            }
        }
        return result;
    }

    // Collect all top-level jurAbsatz divs within the element
    const jurAbsatzDivs = Array.from(element.querySelectorAll('div.jurAbsatz'));

    let markdownContent;
    if (jurAbsatzDivs.length > 0) {
        markdownContent = jurAbsatzDivs.map(div => processNode(div)).filter(part => part.trim() !== '').join('\n\n---\n\n').replace(/(\s*\\n\\s*){2,}/g, '\\n\\n').trim();
    } else {
        // Fallback for elements without jurAbsatz (e.g., footnotes, or other general content)
        markdownContent = Array.from(element.childNodes).map(child => processNode(child)).join('').replace(/(\s*\\n\\s*){2,}/g, '\\n\\n').trim();
    }

    return { markdown: markdownContent, linkReferences: linkReferences };
}
