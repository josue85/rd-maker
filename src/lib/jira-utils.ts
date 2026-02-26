export interface JiraIssueData {
  key: string;
  summary: string;
  description: string;
  status: string;
  assignee: string | null;
  reporter: string | null;
  labels: string[];
  components: string[];
  subtasks: {
    key: string;
    summary: string;
    status: string;
  }[];
}

export async function fetchJiraEpicData(
  jiraClient: any,
  issueKey: string
): Promise<JiraIssueData> {
  try {
    const issue = await jiraClient.findIssue(issueKey);

    return {
      key: issue.key,
      summary: issue.fields.summary || "",
      description: issue.fields.description || "",
      status: issue.fields.status?.name || "",
      assignee: issue.fields.assignee?.displayName || null,
      reporter: issue.fields.reporter?.displayName || null,
      labels: issue.fields.labels || [],
      components: issue.fields.components?.map((c: any) => c.name) || [],
      subtasks: issue.fields.subtasks?.map((st: any) => ({
        key: st.key,
        summary: st.fields.summary,
        status: st.fields.status?.name,
      })) || [],
    };
  } catch (error) {
    console.error(`Error fetching Jira Issue ${issueKey}:`, error);
    throw new Error(`Failed to fetch Jira Issue ${issueKey}`);
  }
}