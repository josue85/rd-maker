import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getJiraClient, extractJiraKey } from '../jira';

describe('Jira Utilities', () => {
  describe('extractJiraKey', () => {
    it('should extract the key from a standard Jira URL', () => {
      const url = 'https://company.atlassian.net/browse/PROJ-123';
      expect(extractJiraKey(url)).toBe('PROJ-123');
    });

    it('should extract the key when URL has extra paths or query params', () => {
      const url = 'https://enova.atlassian.net/browse/EPIC-456?focusedCommentId=123';
      expect(extractJiraKey(url)).toBe('EPIC-456');
    });

    it('should return the key if just the key is provided', () => {
      expect(extractJiraKey('TEAM-789')).toBe('TEAM-789');
    });

    it('should handle lowercase keys and return them uppercase', () => {
      expect(extractJiraKey('https://company.atlassian.net/browse/proj-123')).toBe('PROJ-123');
      expect(extractJiraKey('team-789')).toBe('TEAM-789');
    });

    it('should return null if no key is found', () => {
      expect(extractJiraKey('https://google.com')).toBeNull();
      expect(extractJiraKey('invalid-string')).toBeNull();
    });
  });

  describe('getJiraClient', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should throw an error if environment variables are missing', () => {
      process.env.JIRA_DOMAIN = '';
      process.env.JIRA_EMAIL = '';
      process.env.JIRA_API_TOKEN = '';

      expect(() => getJiraClient()).toThrowError(/Jira environment variables are missing/);
    });

    it('should initialize JiraClient when valid env vars are present', () => {
      process.env.JIRA_DOMAIN = 'test.atlassian.net';
      process.env.JIRA_EMAIL = 'test@example.com';
      process.env.JIRA_API_TOKEN = 'token123';

      const client = getJiraClient();
      expect(client).toBeDefined();
      // Test stripping of http protocol
      expect((client as any).host).toBe('test.atlassian.net');
    });
    
    it('should strip http/https and trailing slashes from JIRA_DOMAIN', () => {
      process.env.JIRA_DOMAIN = 'https://test2.atlassian.net/';
      process.env.JIRA_EMAIL = 'test@example.com';
      process.env.JIRA_API_TOKEN = 'token123';

      const client = getJiraClient();
      expect((client as any).host).toBe('test2.atlassian.net');
    });
  });
});
