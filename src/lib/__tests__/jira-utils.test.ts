import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchJiraEpicData } from '../jira-utils';

describe('Jira Utils', () => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    global.fetch = vi.fn();
    // Suppress console.warn/error in tests
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('should fetch Jira issue data successfully including subtasks', async () => {
    const mockJiraClient = {
      findIssue: vi.fn().mockResolvedValue({
        key: 'EPIC-123',
        fields: {
          summary: 'Main Epic',
          description: 'Epic Description',
          status: { name: 'In Progress' },
          assignee: { displayName: 'John Doe' },
          reporter: { displayName: 'Jane Doe' },
          labels: ['backend', 'v1'],
          components: [{ name: 'API' }],
          subtasks: [
            {
              key: 'SUB-1',
              fields: { summary: 'Subtask 1', status: { name: 'Done' } }
            }
          ]
        }
      })
    };

    // Mock the fetch for the agile API
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        issues: []
      })
    });

    const data = await fetchJiraEpicData(mockJiraClient, 'EPIC-123');

    expect(mockJiraClient.findIssue).toHaveBeenCalledWith('EPIC-123');
    expect(data.key).toBe('EPIC-123');
    expect(data.summary).toBe('Main Epic');
    expect(data.assignee).toBe('John Doe');
    expect(data.labels).toContain('backend');
    expect(data.components).toContain('API');
    expect(data.subtasks.length).toBe(1);
    expect(data.subtasks[0].key).toBe('SUB-1');
    expect(data.linkedIssues).toEqual([]);
  });

  it('should fetch child issues from agile API if present', async () => {
    process.env.JIRA_DOMAIN = 'test.atlassian.net';
    process.env.JIRA_EMAIL = 'test@example.com';
    process.env.JIRA_API_TOKEN = 'token';

    const mockJiraClient = {
      findIssue: vi.fn().mockResolvedValue({
        key: 'EPIC-456',
        fields: {
          summary: 'Another Epic',
          status: { name: 'Done' }
        }
      })
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        issues: [
          {
            key: 'CHILD-1',
            fields: {
              summary: 'Child story',
              status: { name: 'To Do' },
              description: 'Child desc'
            }
          }
        ]
      })
    });

    const data = await fetchJiraEpicData(mockJiraClient, 'EPIC-456');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://test.atlassian.net/rest/agile/1.0/epic/EPIC-456/issue',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Accept': 'application/json'
        })
      })
    );

    expect(data.linkedIssues).toHaveLength(1);
    expect(data.linkedIssues![0].key).toBe('CHILD-1');
    expect(data.linkedIssues![0].summary).toBe('Child story');
  });

  it('should gracefully handle agile API failure and still return epic data', async () => {
    const mockJiraClient = {
      findIssue: vi.fn().mockResolvedValue({
        key: 'EPIC-789',
        fields: { summary: 'Epic Summary' }
      })
    };

    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 404
    });

    const data = await fetchJiraEpicData(mockJiraClient, 'EPIC-789');

    expect(data.key).toBe('EPIC-789');
    expect(data.linkedIssues).toEqual([]); // empty array as fallback
    expect(console.warn).toHaveBeenCalled();
  });

  it('should throw an error if findIssue fails completely', async () => {
    const mockJiraClient = {
      findIssue: vi.fn().mockRejectedValue(new Error('Network error'))
    };

    await expect(fetchJiraEpicData(mockJiraClient, 'BAD-KEY')).rejects.toThrow('Failed to fetch Jira Issue BAD-KEY');
  });
});
