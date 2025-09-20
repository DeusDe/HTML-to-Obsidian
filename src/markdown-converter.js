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
    let markdown = '';
    let absCounter = 1;

    function processChildren(node, indentLevel = 0) {
        let result = '';
        const indent = '  '.repeat(indentLevel);
        node.childNodes.forEach(child => {
            if (child.nodeType === Node.TEXT_NODE) {
                result += child.textContent.replace(/\s+/g, ' ');
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                const tagName = child.tagName.toLowerCase();
                switch (tagName) {
                    case 'sup': result += `<sup>${child.textContent}</sup>`; break;
                    case 'dl':
                        let dtContent = '';
                        Array.from(child.children).forEach(listItem => {
                            if (listItem.tagName.toLowerCase() === 'dt') dtContent = listItem.textContent.trim();
                            if (listItem.tagName.toLowerCase() === 'dd') result += `\n${indent}- ${dtContent} ${processChildren(listItem, indentLevel + 1).trim()}`;
                        });
                        break;
                    case 'div': case 'p':
                        let absContent = processChildren(child, indentLevel).trim();
                        if (addAbsMarker && tagName === 'div' && child.classList.contains('jurAbsatz')) {
                            if (absContent) {
                                absContent += ` ^abs${absCounter}`;
                                absCounter++;
                            }
                        }
                        result += absContent + '\n';
                        break;
                    case 'table':
                        result += convertTableToMarkdown(child);
                        break;
                    default:
                        result += processChildren(child, indentLevel);
                }
            }
        });
        return result;
    }
    
    markdown = processChildren(element);
    return markdown.replace(/(\s*\n\s*){2,}/g, '\n\n').trim();
}
