import { google } from 'googleapis';

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

    // 2. Prepare find-and-replace requests
    const requests = Object.entries(replacements).map(([key, value]) => ({
      replaceAllText: {
        containsText: {
          text: `{{${key}}}`,
          matchCase: true,
        },
        replaceText: value || '',
      }
    }));

    // 3. Execute the batch update
    if (requests.length > 0) {
      await docsClient.documents.batchUpdate({
        documentId: newDocId,
        requestBody: {
          requests,
        },
      });
    }

    return newDocUrl;
  } catch (error: any) {
    console.error('Error copying and updating Google Doc:', error.message || error);
    throw new Error(`Failed to create Google Doc from template: ${error.message}`);
  }
}