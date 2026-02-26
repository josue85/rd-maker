import { google } from 'googleapis';

export function getGoogleDocsClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  
  const docs = google.docs({ version: 'v1', auth });
  return docs;
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