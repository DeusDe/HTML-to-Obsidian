// src/markdown-converter.js

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

export function htmlToMarkdown(element, { addAbsMarker = false } = {}) {
    let absCounter = 1;

    function processNode(node, indentLevel = 0) {
        let result = '';
        const indent = '  '.repeat(indentLevel);

        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent.replace(/\s+/g, ' ');
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.tagName.toLowerCase();
            switch (tagName) {
                case 'sup':
                    result += `<sup>${node.textContent}</sup>`;
                    break;
                case 'dl':
                    let dtContent = '';
                    Array.from(node.children).forEach(listItem => {
                        if (listItem.tagName.toLowerCase() === 'dt') dtContent = listItem.textContent.trim();
                        if (listItem.tagName.toLowerCase() === 'dd') result += `\n${indent}- ${dtContent} ${processNode(listItem, indentLevel + 1).trim()}`;
                    });
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

    if (jurAbsatzDivs.length > 0) {
        const markdownParts = jurAbsatzDivs.map(div => processNode(div)).filter(part => part.trim() !== '');
        return markdownParts.join('\n\n---\n\n').replace(/(\s*\\n\\s*){2,}/g, '\\n\\n').trim();
    } else {
        // Fallback for elements without jurAbsatz (e.g., footnotes, or other general content)
        return Array.from(element.childNodes).map(child => processNode(child)).join('').replace(/(\s*\\n\\s*){2,}/g, '\\n\\n').trim();
    }
}
