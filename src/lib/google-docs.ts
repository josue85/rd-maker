import { google } from 'googleapis';

// Ensure your .env.local has GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY
// The private key should be formatted correctly (replace actual newlines with \n in the env string)

export async function getGoogleDocsClient() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error("Google Service Account credentials are missing.");
  }

  // Handle formatted private key strings from .env
  const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/documents.readonly'],
  });

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