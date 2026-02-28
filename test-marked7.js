import { marked } from 'marked';

function testParser(markdown) {
  let textSegments = [];
  const tokens = marked.lexer(markdown);

  function processTokens(tks, styles) {
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
         textSegments.push({ text: t.text || t.raw, ...styles });
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
          textSegments.push({ text: '\n\n' });
       }
    } else if (token.type === 'heading') {
       processTokens(token.tokens, { bold: true });
       textSegments.push({ text: '\n\n' });
    } else if (token.type === 'space') {
       textSegments.push({ text: '\n' });
    } else {
       textSegments.push({ text: token.raw });
    }
  }
  
  // Clean up excessive newlines
  const cleaned = [];
  for (const seg of textSegments) {
     if (seg.text === '\n' || seg.text === '\n\n') {
         if (cleaned.length > 0 && cleaned[cleaned.length - 1].text.endsWith('\n')) {
            const last = cleaned[cleaned.length - 1];
            if (last.text.endsWith('\n\n') && seg.text.startsWith('\n')) {
                // already has 2 newlines, skip
                continue;
            } else if (last.text.endsWith('\n') && seg.text === '\n\n') {
                last.text += '\n'; // make it \n\n
                continue;
            }
         }
     }
     cleaned.push({...seg});
  }
  
  let finalStr = "";
  for (const c of cleaned) finalStr += c.text;
  return finalStr;
}

const md2 = `- Item 1

- Item 2`;
console.dir(testParser(md2), { depth: null });
