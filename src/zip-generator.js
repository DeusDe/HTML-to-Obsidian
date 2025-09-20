// src/zip-generator.js
import { convertButton, folderNameInput, prefixInput, createTocCheckbox, createFlowCheckbox } from './dom-elements.js';
import { logMessage, cleanFilename } from './utils.js';
import { htmlToMarkdown } from './markdown-converter.js';
import { getCurrentFile, getParsedDoc } from './html-parser.js';

export async function convertAndDownload() {
    const currentFile = getCurrentFile();
    const parsedDoc = getParsedDoc();

    if (!currentFile || !parsedDoc) {
        logMessage('Keine Datei zum Konvertieren gefunden.');
        return;
    }

    logMessage('Konvertierung gestartet...');
    convertButton.disabled = true;
    convertButton.textContent = 'Verarbeite...';

    try {
        const vaultFolderName = cleanFilename(folderNameInput.value) || 'Gesetz';
        const userInputPrefix = prefixInput.value.trim();
        logMessage(`Erstelle ZIP-Archiv: ${vaultFolderName}.zip`);
        
        let fullPrefix = '';
        if (userInputPrefix) {
            fullPrefix = userInputPrefix.endsWith('/') ? `${userInputPrefix}${vaultFolderName}/` : `${userInputPrefix}/${vaultFolderName}/`;
        } else {
            fullPrefix = `${vaultFolderName}/`;
        }

        const zip = new window.JSZip();
        const markdownLinks = [];
        let filesCreated = 0;
        let pathSegments = [];

        let preambleFrontmatter = '';
        let globalFootnoteContent = '';

        const mainJnnormDiv = parsedDoc.querySelector('div.jnnorm[id^="BJNR"]');
        if (mainJnnormDiv) {
            const jnHeader = mainJnnormDiv.querySelector('div.jnheader');
            const jnZitat = mainJnnormDiv.querySelector('div.jnzitat');
            const jnHtml = mainJnnormDiv.querySelector('div.jnhtml');
            const jnFussnote = mainJnnormDiv.querySelector('div.jnfussnote');

            if (jnHeader) {
                const title = jnHeader.querySelector('h1 span.jnlangue')?.textContent.trim();
                const abbr = jnHeader.querySelector('h1 span.jnamtabk')?.textContent.replace(/[()]/g, '').trim();
                const ausfertigungsdatum = jnHeader.querySelector('p:nth-of-type(2)')?.textContent.replace('Ausfertigungsdatum:', '').trim();
                if (title) preambleFrontmatter += `fullTitle: "${title}"\n`;
                if (abbr) preambleFrontmatter += `abbr: "${abbr}"\n`;
                if (ausfertigungsdatum) preambleFrontmatter += `ausfertigungsdatum: "${ausfertigungsdatum}"\n`;
            }
            if (jnZitat) {
                const zitatText = jnZitat.querySelector('p:nth-of-type(2)')?.textContent.trim();
                if (zitatText) preambleFrontmatter += `vollzitat: "${zitatText}"\n`;
            }
            if (jnHtml) {
                let htmlText = jnHtml.textContent.trim();
                const textToExclude = "Näheres zur Standangabe finden Sie im Menü unter Hinweise";
                if (htmlText.includes(textToExclude)) {
                    htmlText = htmlText.replace(textToExclude, '').trim();
                }
                if (htmlText) preambleFrontmatter += `standangaben: "${htmlText.replace(/\s+/g, ' ')}"\n`;
            }
            if (jnFussnote) {
                globalFootnoteContent = htmlToMarkdown(jnFussnote).trim();
            }
        }

        const allNorms = parsedDoc.querySelectorAll('div.jnnorm');

        allNorms.forEach(normDiv => {
            const titleAttribute = normDiv.getAttribute('title');
            if (titleAttribute !== 'Einzelnorm' && titleAttribute !== 'Gliederung') {
                return; // Skip this div if it's not an article or section header
            }
            const isSectionHeader = normDiv.querySelector('h2');
            if (isSectionHeader) {
                const spans = isSectionHeader.querySelectorAll('span');
                if (spans.length > 0) {
                    const mainTitle = spans[0].textContent.trim();
                    const subTitle = spans.length > 1 ? spans[1].textContent.trim() : '';
                    const combinedTitle = cleanFilename(`${mainTitle} ${subTitle}`);
                    pathSegments = [combinedTitle]; // Set pathSegments to just this section
                }
                return;
            }

            const headerElement = normDiv.querySelector('h3 span.jnenbez');
            const paragraphNumber = headerElement?.textContent.trim();

            if (paragraphNumber && (paragraphNumber.startsWith('§') || paragraphNumber.startsWith('Art'))) {
                const currentPath = pathSegments.join('/');
                const paragraphTitle = normDiv.querySelector('h3 span.jnentitel')?.textContent.trim() || '';
                const contentDiv = normDiv.querySelector('div.jnhtml');

                if (contentDiv) {
                    const markdownContent = htmlToMarkdown(contentDiv, { addAbsMarker: true });
                    let footnoteDefinitions = '', footnoteIndex = 1;
                    const currentId = normDiv.id;
                    if (currentId) {
                        const footnoteDiv = parsedDoc.querySelector(`#${currentId}_FNS`);
                        if (footnoteDiv) {
                            const footnoteContentDiv = footnoteDiv.querySelector('div.jnhtml');
                            if (footnoteContentDiv) {
                                footnoteDefinitions += `\n\n[^${footnoteIndex}]: ${htmlToMarkdown(footnoteContentDiv).replace(/\s+/g, ' ')}`;
                                footnoteIndex++;
                            }
                        }
                    }

                    if (markdownContent.trim()) {
                        const lawAbbr = parsedDoc.querySelector('h1 span.jnamtabk')?.textContent.replace(/[()]/g, '').trim() || 'Gesetz';
                        
                        let frontmatter = '---\n';
                        frontmatter += `title: "${paragraphNumber} ${paragraphTitle}"\n`;
                        frontmatter += `aliases: ["${paragraphNumber}"]\n`;
                        frontmatter += `gesetz: "${lawAbbr}"\n`;
                        if (pathSegments[0]) frontmatter += `teil: "${pathSegments[0].replace(/-/g, ' ')}"\n`;
                        if (pathSegments[1]) frontmatter += `kapitel: "${pathSegments[1].replace(/-/g, ' ')}"\n`;
                        if (pathSegments[2]) frontmatter += `abschnitt: "${pathSegments[2].replace(/-/g, ' ')}"\n`;
                        frontmatter += `tags: [gesetz, ${lawAbbr.toLowerCase()}]\n`;
                        frontmatter += '---\n\n';

                        const fileNameBase = cleanFilename(`${paragraphNumber} ${paragraphTitle}`);
                        const fileContent = frontmatter + (markdownContent + footnoteDefinitions).trim();
                        
                        const filePath = `${vaultFolderName}/${currentPath ? `${currentPath}/` : ''}${fileNameBase}.md`;
                        zip.file(filePath, fileContent);
                        const linkPath = `${fullPrefix}${currentPath ? `${currentPath}/` : ''}${fileNameBase}`;
                        markdownLinks.push({
                            numberStr: paragraphNumber.replace('§', '').replace('Art', '').trim(),
                            link: `- [[${linkPath.replace(/\\/g, '/')}\]]`, 
                            embedLink: `![[${linkPath.replace(/\\/g, '/')}\]]`
                        });
                        filesCreated++;
                    }
                }
            }
        });
        
        logMessage(`${filesCreated} Paragrafen-Dateien erstellt.`);

        markdownLinks.sort((a, b) => { const numA = parseInt(a.numberStr, 10); const numB = parseInt(b.numberStr, 10); const letterA = a.numberStr.replace(/[^a-z]/gi, ''); const letterB = b.numberStr.replace(/[^a-z]/gi, ''); if (numA !== numB) return numA - numB; return letterA.localeCompare(letterB); });

        const lawTitle = parsedDoc.querySelector('h1 span.jnlangue')?.textContent.trim();
        
        if (createTocCheckbox.checked) {
            const tocContent = `# ${lawTitle} - Inhaltsübersicht\n\n` + markdownLinks.map(item => item.link).join('\n');
            zip.file(`${vaultFolderName}/Inhaltsübersicht.md`, tocContent);
            logMessage(`Inhaltsübersicht.md erstellt.`);
        }
        
        if (createFlowCheckbox.checked) {
            const tocEmbedLink = createTocCheckbox.checked ? `![[${fullPrefix}Inhaltsübersicht]]` : '';
            const embedsContent = markdownLinks.map(item => item.embedLink).join('\n\n---\n\n');
            let fliesstextContent = `---\n`;
            fliesstextContent += `title: "${lawTitle} im Fließtext"\n`;
            fliesstextContent += preambleFrontmatter;
            fliesstextContent += `---\n\n`;
            fliesstextContent += `# ${lawTitle} im Fließtext\n\n${tocEmbedLink}\n\n---\n\n${embedsContent}`;
            if (globalFootnoteContent) {
                fliesstextContent += `\n\n---\n\n### Fußnote\n${globalFootnoteContent}`;
            }
            zip.file(`${vaultFolderName}/Gesetz im Fließtext.md`, fliesstextContent);
            logMessage(`Gesetz im Fließtext.md erstellt.`);
        }

        logMessage(`Generiere ZIP-Archiv...`);
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = `${vaultFolderName}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        logMessage(`\n✅ Erfolgreich! Der Download sollte starten.`);
    
    } catch (error) {
        logMessage(`\n[FEHLER] ${error.message}`);
    } finally {
        convertButton.disabled = false;
        convertButton.textContent = 'Umwandeln und Herunterladen';
    }
}