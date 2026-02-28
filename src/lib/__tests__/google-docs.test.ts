import { describe, it, expect, vi } from 'vitest';
import { extractGoogleDocId, markdownToDocsRequests, copyGoogleDocAndReplace } from '../google-docs';

describe('Google Docs Utilities', () => {
  describe('extractGoogleDocId', () => {
    it('should extract the doc ID from a full Google Docs URL', () => {
      const url = 'https://docs.google.com/document/d/15P2KQxaCHcTXgKEnQD8WV58t-F_NAHBUfeBFxqBgzHY/edit';
      expect(extractGoogleDocId(url)).toBe('15P2KQxaCHcTXgKEnQD8WV58t-F_NAHBUfeBFxqBgzHY');
    });

    it('should extract the doc ID without trailing /edit', () => {
      const url = 'https://docs.google.com/document/d/15P2KQxaCHcTXgKEnQD8WV58t-F_NAHBUfeBFxqBgzHY';
      expect(extractGoogleDocId(url)).toBe('15P2KQxaCHcTXgKEnQD8WV58t-F_NAHBUfeBFxqBgzHY');
    });

    it('should return null for invalid URLs', () => {
      expect(extractGoogleDocId('https://google.com')).toBeNull();
      expect(extractGoogleDocId('just-a-string')).toBeNull();
    });
  });

  describe('markdownToDocsRequests', () => {
    it('should convert bold text into correct Google Docs requests', () => {
      const markdown = '**Bold Text**';
      const startIndex = 10;
      
      const { requests, length } = markdownToDocsRequests(markdown, startIndex);
      
      expect(length).toBeGreaterThan(0);
      expect(requests).toContainEqual(
        expect.objectContaining({
          insertText: {
            location: { index: startIndex },
            text: expect.stringContaining('Bold Text')
          }
        })
      );
      
      expect(requests).toContainEqual(
        expect.objectContaining({
          updateTextStyle: expect.objectContaining({
            textStyle: { bold: true },
            fields: 'bold'
          })
        })
      );
    });

    it('should convert lists with correct spacing', () => {
      const markdown = `- Item 1\n- Item 2`;
      const { requests } = markdownToDocsRequests(markdown, 0);
      
      const insertReq = requests.find((r: any) => r.insertText);
      expect(insertReq).toBeDefined();
      
      const insertedText = insertReq.insertText.text;
      expect(insertedText).toContain('• Item 1');
      expect(insertedText).toContain('• Item 2');
      // Should cap newlines between items to 2
      expect(insertedText).toContain('\n\n');
    });

    it('should handle links correctly', () => {
      const markdown = '[Enova](https://enova.com)';
      const { requests } = markdownToDocsRequests(markdown, 0);
      
      const styleReq = requests.find((r: any) => r.updateTextStyle);
      expect(styleReq).toBeDefined();
      expect(styleReq.updateTextStyle.textStyle.link.url).toBe('https://enova.com');
      expect(styleReq.updateTextStyle.fields).toContain('link');
    });
    
    it('should unescape HTML entities correctly', () => {
      const markdown = 'Test &amp; &lt; &gt;';
      const { requests } = markdownToDocsRequests(markdown, 0);
      const insertReq = requests.find((r: any) => r.insertText);
      expect(insertReq.insertText.text).toContain('Test & < >');
    });
  });
  
  describe('copyGoogleDocAndReplace', () => {
    it('should copy doc and perform find and replace', async () => {
      const mockDriveClient = {
        files: {
          copy: vi.fn().mockResolvedValue({
            data: { id: 'new-doc-id', webViewLink: 'https://docs.google.com/new' }
          })
        }
      };
      
      const mockDocsClient = {
        documents: {
          batchUpdate: vi.fn().mockResolvedValue({}),
          get: vi.fn().mockResolvedValue({
            data: {
              body: {
                content: [
                  {
                    paragraph: {
                      elements: [
                         { textRun: { content: '__REPLACEKey123__' }, startIndex: 5 }
                      ]
                    }
                  }
                ]
              }
            }
          })
        }
      };
      
      const url = await copyGoogleDocAndReplace(
        mockDriveClient,
        mockDocsClient,
        'template-id',
        'New Title',
        { 'Key123': '**Markdown**' }
      );
      
      expect(url).toBe('https://docs.google.com/new');
      expect(mockDriveClient.files.copy).toHaveBeenCalledWith({
        fileId: 'template-id',
        requestBody: { name: 'New Title' },
        fields: 'id, webViewLink'
      });
      
      // Should have called batch update twice
      expect(mockDocsClient.documents.batchUpdate).toHaveBeenCalledTimes(2);
      
      // First pass: replace placeholder
      const firstBatch = mockDocsClient.documents.batchUpdate.mock.calls[0][0];
      expect(firstBatch.requestBody.requests[0].replaceAllText.containsText.text).toBe('{{Key123}}');
      
      // Second pass: insert markdown
      const secondBatch = mockDocsClient.documents.batchUpdate.mock.calls[1][0];
      expect(secondBatch.requestBody.requests).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            deleteContentRange: expect.any(Object)
          })
        ])
      );
    });
  });
});
