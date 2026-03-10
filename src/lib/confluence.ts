export function extractConfluencePageId(urlStr: string): string | null {
  try {
    const url = new URL(urlStr);
    
    // Format: https://wiki.domain.com/pages/viewpage.action?pageId=123456
    const pageId = url.searchParams.get("pageId");
    if (pageId) {
      return pageId;
    }
    
    // Format: https://wiki.domain.com/spaces/SPACE/pages/123456/Page+Title
    const pathParts = url.pathname.split('/');
    const pagesIndex = pathParts.indexOf('pages');
    if (pagesIndex !== -1 && pathParts.length > pagesIndex + 1) {
      const maybeId = pathParts[pagesIndex + 1];
      if (/^\d+$/.test(maybeId)) {
        return maybeId;
      }
    }
    
  } catch (error) {
    console.error("Failed to parse Confluence URL:", error);
  }
  return null;
}

export async function fetchConfluenceContent(urlStr: string, patToken: string): Promise<string> {
  try {
    const url = new URL(urlStr);
    const domain = url.origin;
    const pageId = extractConfluencePageId(urlStr);

    if (!pageId) {
      throw new Error("Could not extract pageId from the provided Confluence URL. Ensure it contains a page ID.");
    }

    const apiUrl = `${domain}/rest/api/content/${pageId}?expand=body.storage,body.view`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${patToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Confluence API responded with status: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const htmlContent = data.body?.view?.value || data.body?.storage?.value || "";
    
    // Strip HTML tags for LLM consumption to save tokens and improve formatting
    const textContent = htmlContent
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/<\/p>|<br\s*\/?>|<\/li>|<\/div>/gi, '\n') // Replace common block/line breaks with actual newlines
      .replace(/<[^>]+>/g, ' ') // Strip remaining tags
      .replace(/\n\s*\n/g, '\n') // Remove excessive empty lines
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();

    return textContent || "No readable content found on this wiki page.";

  } catch (error: any) {
    console.error("Error fetching Confluence page:", error);
    throw error;
  }
}
