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
  linkedIssues?: {
    key: string;
    summary: string;
    status: string;
    description?: string;
  }[];
}

export async function fetchJiraEpicData(
  jiraClient: any,
  issueKey: string
): Promise<JiraIssueData> {
  try {
    const issue = await jiraClient.findIssue(issueKey);
    let linkedIssues: any[] = [];
    
    // Attempt to fetch child issues of this Epic using the Jira Agile API
    try {
       const domain = process.env.JIRA_DOMAIN?.replace(/^https?:\/\//, "").replace(/\/$/, "") || '';
       const email = process.env.JIRA_EMAIL || '';
       const token = process.env.JIRA_API_TOKEN || '';
       const auth = Buffer.from(`${email}:${token}`).toString('base64');
       
       const searchRes = await fetch(`https://${domain}/rest/agile/1.0/epic/${issueKey}/issue`, {
         method: 'GET',
         headers: {
           'Authorization': `Basic ${auth}`,
           'Accept': 'application/json'
         }
       });
       
       if (searchRes.ok) {
           const searchResult = await searchRes.json();
           if (searchResult && searchResult.issues) {
               linkedIssues = searchResult.issues.map((i: any) => ({
                   key: i.key,
                   summary: i.fields.summary || "",
                   status: i.fields.status?.name || "",
                   description: i.fields.description || "",
               }));
           }
       } else {
           console.warn(`Could not fetch agile epic issues for ${issueKey}: HTTP ${searchRes.status}`);
       }
    } catch (searchErr) {
       console.warn(`Error fetching linked issues via Agile API for ${issueKey}:`, searchErr);
    }

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
      linkedIssues,
    };
  } catch (error) {
    console.error(`Error fetching Jira Issue ${issueKey}:`, error);
    throw new Error(`Failed to fetch Jira Issue ${issueKey}`);
  }
}