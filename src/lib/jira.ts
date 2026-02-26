import JiraClient from "jira-client";

// Initialize Jira Client.
// Ensure your .env.local has these values:
// JIRA_DOMAIN (e.g. your_company.atlassian.net)
// JIRA_EMAIL (e.g. user@your_company.com)
// JIRA_API_TOKEN (generated from https://id.atlassian.com/manage-profile/security/api-tokens)

export function getJiraClient() {
  if (
    !process.env.JIRA_DOMAIN ||
    !process.env.JIRA_EMAIL ||
    !process.env.JIRA_API_TOKEN
  ) {
    throw new Error(
      "Jira environment variables are missing. Please check your .env.local file."
    );
  }

  // Ensure the domain doesn't include https:// or trailing slashes
  const domain = process.env.JIRA_DOMAIN.replace(/^https?:\/\//, "").replace(
    /\/$/,
    ""
  );

  return new JiraClient({
    protocol: "https",
    host: domain,
    username: process.env.JIRA_EMAIL,
    password: process.env.JIRA_API_TOKEN,
    apiVersion: "2",
    strictSSL: true,
  });
}

/**
 * Extracts the issue key from a full Jira URL or returns the key if passed directly.
 * Example: https://company.atlassian.net/browse/PROJ-123 -> PROJ-123
 */
export function extractJiraKey(urlOrKey: string): string | null {
  const match = urlOrKey.match(/([A-Z0-9]+-[0-9]+)/i);
  return match ? match[1].toUpperCase() : null;
}