import { google } from 'googleapis';
import { marked } from 'marked';

export function getGoogleDocsClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  
  const docs = google.docs({ version: 'v1', auth });
  return docs;
}

export function getGoogleDriveClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  
  const drive = google.drive({ version: 'v3', auth });
  return drive;
}

export function extractGoogleDocId(url: string): string | null {
  // Matches the ID between /d/ and /edit or end of string
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

export async function fetchGoogleDocText(docsClient: any, documentId: string): Promise<string> {
  try {
    const res = await docsClient.documents.get({ documentId });
    const document = res.data;
    let fullText = '';

    // Parse the document structural elements
    if (document.body && document.body.content) {
      document.body.content.forEach((element: any) => {
        if (element.paragraph) {
          element.paragraph.elements.forEach((elem: any) => {
            if (elem.textRun && elem.textRun.content) {
              fullText += elem.textRun.content;
            }
          });
        }
      });
    }

    return fullText;
  } catch (error) {
    console.error(`Error fetching Google Doc ${documentId}:`, error);
    throw new Error(`Failed to fetch Google Doc ${documentId}`);
  }
}

function unescapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function markdownToDocsRequests(markdown: string, startIndex: number) {
  const requests: any[] = [];
  const textSegments: any[] = [];
  const tokens = marked.lexer(markdown);

  function processTokens(tks: any[] | undefined, styles: any) {
    if (!tks) return;
    for (const t of tks) {
      if (t.type === 'strong') {
         processTokens(t.tokens, { ...styles, bold: true });
      } else if (t.type === 'em') {
         processTokens(t.tokens, { ...styles, italic: true });
      } else if (t.type === 'link') {
         processTokens(t.tokens, { ...styles, link: t.href });
      } else if (t.type === 'br') {
         textSegments.push({ text: '\n', ...styles });
      } else if (t.type === 'paragraph') {
         processTokens(t.tokens, styles);
         textSegments.push({ text: '\n\n', ...styles });
      } else if (t.type === 'space') {
         textSegments.push({ text: '\n\n', ...styles });
      } else if (t.tokens) {
         processTokens(t.tokens, styles);
      } else {
         textSegments.push({ text: unescapeHtml(t.text || t.raw), ...styles });
      }
    }
  }

  for (const token of tokens) {
    if (token.type === 'paragraph') {
       processTokens(token.tokens, {});
       textSegments.push({ text: '\n\n' });
    } else if (token.type === 'list') {
       for (const item of token.items) {
          textSegments.push({ text: '• ' });
          processTokens(item.tokens, {});
          // Add an extra line break to ensure spacing between list items
          textSegments.push({ text: '\n\n' });
       }
    } else if (token.type === 'heading') {
       processTokens(token.tokens, { bold: true });
       textSegments.push({ text: '\n\n' });
    } else if (token.type === 'space') {
       textSegments.push({ text: '\n' });
    } else {
       textSegments.push({ text: unescapeHtml(token.raw) });
    }
  }

  // Collapse consecutive newlines > 2 into exactly 2
  const cleaned: any[] = [];
  for (const seg of textSegments) {
     if (!seg.text) continue;
     cleaned.push({...seg});
  }
  
  // Merge all consecutive newline-only segments
  const merged: any[] = [];
  for (const seg of cleaned) {
     const isNewline = /^\n+$/.test(seg.text) && !seg.bold && !seg.italic && !seg.link;
     if (isNewline && merged.length > 0) {
         const last = merged[merged.length - 1];
         if (/^\n+$/.test(last.text) && !last.bold && !last.italic && !last.link) {
             last.text += seg.text;
             continue;
         }
     }
     merged.push(seg);
  }
  
  // Now cap the newlines at 2 max
  for (const seg of merged) {
     if (/^\n+$/.test(seg.text)) {
         if (seg.text.length > 2) {
             seg.text = '\n\n';
         }
     }
  }

  // Remove trailing newlines to avoid massive spacing at the end of the document
  while (merged.length > 0 && /^\n+$/.test(merged[merged.length - 1].text)) {
     merged.pop();
  }
  
  if (merged.length === 0) return { requests: [], length: 0 };
  
  const fullText = merged.map(s => s.text).join('');
  if (!fullText) return { requests: [], length: 0 };

  // Insert full text
  requests.push({
    insertText: {
      location: { index: startIndex },
      text: fullText
    }
  });

  // Apply styles
  let currentOffset = startIndex;
  for (const seg of merged) {
     const len = seg.text.length;
     if (len > 0 && (seg.bold || seg.italic || seg.link)) {
        const textStyle: any = {};
        const fields = [];
        if (seg.bold) { textStyle.bold = true; fields.push('bold'); }
        if (seg.italic) { textStyle.italic = true; fields.push('italic'); }
        if (seg.link) { textStyle.link = { url: seg.link }; fields.push('link'); }
        
        requests.push({
          updateTextStyle: {
            range: { startIndex: currentOffset, endIndex: currentOffset + len },
            textStyle,
            fields: fields.join(',')
          }
        });
     }
     currentOffset += len;
  }

  return { requests, length: fullText.length };
}

function findPlaceholders(docData: any, regex: RegExp) {
  const matches: any[] = [];
  function searchElements(elements: any[]) {
    if (!elements) return;
    for (const elem of elements) {
      if (elem.paragraph) {
        for (const pElem of elem.paragraph.elements) {
          if (pElem.textRun && pElem.textRun.content) {
             const content = pElem.textRun.content;
             let m;
             while ((m = regex.exec(content)) !== null) {
                matches.push({
                   startIndex: pElem.startIndex + m.index,
                   endIndex: pElem.startIndex + m.index + m[0].length,
                   key: m[0]
                });
             }
          }
        }
      } else if (elem.table) {
        for (const row of elem.table.tableRows) {
          for (const cell of row.tableCells) {
             searchElements(cell.content);
          }
        }
      } else if (elem.tableOfContents) {
         searchElements(elem.tableOfContents.content);
      }
    }
  }
  if (docData.body && docData.body.content) {
     searchElements(docData.body.content);
  }
  return matches;
}

export async function copyGoogleDocAndReplace(
  driveClient: any, 
  docsClient: any, 
  templateId: string, 
  newTitle: string, 
  replacements: Record<string, string>
): Promise<string> {
  try {
    // 1. Copy the template document
    const copyResponse = await driveClient.files.copy({
      fileId: templateId,
      requestBody: {
        name: newTitle,
      },
      fields: 'id, webViewLink',
    });

    const newDocId = copyResponse.data.id;
    const newDocUrl = copyResponse.data.webViewLink;

    // 2. Prepare find-and-replace requests to inject unique placeholders
    const uuidMap: Record<string, string> = {};
    const initialRequests = Object.entries(replacements).map(([key, value]) => {
      // Create a unique placeholder for each key. Avoid special chars to keep it in a single textRun
      const uuid = `__REPLACE${key.replace(/[^A-Za-z0-9]/g, '')}__`;
      uuidMap[uuid] = value || '';
      return {
        replaceAllText: {
          containsText: {
            text: `{{${key}}}`,
            matchCase: true,
          },
          replaceText: uuid,
        }
      };
    });

    // Execute first pass to set placeholders
    if (initialRequests.length > 0) {
      await docsClient.documents.batchUpdate({
        documentId: newDocId,
        requestBody: { requests: initialRequests },
      });
    }

    // 3. Fetch doc to find exact indices of the UUIDs
    const docRes = await docsClient.documents.get({ documentId: newDocId });
    const docData = docRes.data;

    // 4. Find all inserted UUIDs
    const regex = /__REPLACE[A-Za-z0-9]+__/g;
    const matches = findPlaceholders(docData, regex);
    
    // 5. Build markdown insert requests in reverse order to keep indices valid!
    matches.sort((a, b) => b.startIndex - a.startIndex);

    const finalRequests: any[] = [];

    for (const match of matches) {
       const markdownValue = uuidMap[match.key];
       if (markdownValue === undefined) continue;

       // Delete the placeholder text
       finalRequests.push({
          deleteContentRange: {
             range: {
                startIndex: match.startIndex,
                endIndex: match.endIndex
             }
          }
       });

       // Insert and style the markdown
       const mdReqs = markdownToDocsRequests(markdownValue, match.startIndex);
       if (mdReqs.requests.length > 0) {
           finalRequests.push(...mdReqs.requests);
       }
    }

    // 6. Execute the final formatting batch update
    if (finalRequests.length > 0) {
      await docsClient.documents.batchUpdate({
        documentId: newDocId,
        requestBody: { requests: finalRequests },
      });
    }

    return newDocUrl;
  } catch (error: any) {
    console.error('Error copying and updating Google Doc:', error.message || error);
    throw new Error(`Failed to create Google Doc from template: ${error.message}`);
  }
}
