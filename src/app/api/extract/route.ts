import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { WorksheetData } from "@/types/worksheet";
import { getJiraClient, extractJiraKey } from "@/lib/jira";
import { fetchJiraEpicData, JiraIssueData } from "@/lib/jira-utils";
import { getGoogleDocsClient, extractGoogleDocId, fetchGoogleDocText } from "@/lib/google-docs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const schema = {
  type: Type.OBJECT,
  properties: {
    projectName: { type: Type.STRING },
    wikiLink: { type: Type.STRING },
    epicLink: { type: Type.STRING },
    sowLink: { type: Type.STRING },
    brdLink: { type: Type.STRING },
    smes: { type: Type.STRING },
    teamLead: { type: Type.STRING },
    description: { type: Type.STRING },
    businessObjective: { type: Type.STRING },
    newWorkPercentage: { type: Type.STRING, description: "e.g., '80%'" },
    updatingPercentage: { type: Type.STRING, description: "e.g., '20%'" },
    researchLearningPercentage: { type: Type.STRING, description: "e.g., '30%'" },
    developmentPercentage: { type: Type.STRING, description: "e.g., '70%'" },
    researchedLearnings: { type: Type.STRING },
    challengesSolutions: { type: Type.STRING },
    technologiesUsed: { type: Type.STRING },
    codeOptimizations: { type: Type.STRING },
    processesOfExperimentation: { type: Type.STRING },
    businessUncertaintiesSolved: { type: Type.STRING },
    technicalUncertaintiesSolved: { type: Type.STRING },
    isInternalUseSoftware: { type: Type.BOOLEAN },
    commerciallyAvailable: { type: Type.STRING },
    reducedCostSpeed: { type: Type.STRING },
    economicRisk: { type: Type.STRING },
  },
  required: [
    "description",
    "businessObjective",
    "newWorkPercentage",
    "updatingPercentage",
    "researchLearningPercentage",
    "developmentPercentage",
    "researchedLearnings",
    "challengesSolutions",
    "technologiesUsed",
    "codeOptimizations",
    "processesOfExperimentation",
    "businessUncertaintiesSolved",
    "technicalUncertaintiesSolved",
    "isInternalUseSoftware",
  ],
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: "Unauthorized. Please sign in with Google." }, { status: 401 });
    }

    const { jiraUrls, wikiUrls, sowUrl, brdUrl } = await req.json();

    let jiraContext = "No Jira data provided.";
    let sowText = "No SOW text provided.";
    let brdText = "No BRD text provided.";

    // Process Google Doc URL (SOW) if provided
    if (sowUrl) {
      const docId = extractGoogleDocId(sowUrl);
      if (docId) {
        try {
          const docsClient = getGoogleDocsClient(session.accessToken);
          sowText = await fetchGoogleDocText(docsClient, docId);
          console.log(`Successfully fetched SOW text from Google Doc: ${docId}, length: ${sowText.length} chars`);
        } catch (docsError: any) {
          console.warn("Failed to fetch SOW Google Doc data:", docsError.message);
          sowText = `Attempted to fetch SOW Doc but failed: ${docsError.message}.`;
        }
      } else {
        sowText = `Invalid SOW URL provided: ${sowUrl}`;
      }
    }

    // Process Google Doc URL (BRD) if provided
    if (brdUrl) {
      const docId = extractGoogleDocId(brdUrl);
      if (docId) {
        try {
          const docsClient = getGoogleDocsClient(session.accessToken);
          brdText = await fetchGoogleDocText(docsClient, docId);
          console.log(`Successfully fetched BRD text from Google Doc: ${docId}, length: ${brdText.length} chars`);
        } catch (docsError: any) {
          console.warn("Failed to fetch BRD Google Doc data:", docsError.message);
          brdText = `Attempted to fetch BRD Doc but failed: ${docsError.message}.`;
        }
      } else {
        brdText = `Invalid BRD URL provided: ${brdUrl}`;
      }
    }
    
    // Process Jira URLs if provided and env vars are set
    if (jiraUrls && process.env.JIRA_DOMAIN && process.env.JIRA_EMAIL && process.env.JIRA_API_TOKEN) {
      try {
        const jiraClient = getJiraClient();
        const urls = jiraUrls.split(',').map((u: string) => u.trim());
        const issuesData: JiraIssueData[] = [];

        for (const url of urls) {
          const key = extractJiraKey(url);
          if (key) {
             const data = await fetchJiraEpicData(jiraClient, key);
             issuesData.push(data);
          }
        }
        
        if (issuesData.length > 0) {
            jiraContext = "Jira Epic Data:\n" + issuesData.map(data => 
                `Key: ${data.key}\nSummary: ${data.summary}\nDescription: ${data.description}\n` +
                `Assignee: ${data.assignee || 'Unassigned'}\nReporter: ${data.reporter || 'Unassigned'}\n` +
                `Labels: ${data.labels.join(', ')}\nComponents: ${data.components.join(', ')}\n` +
                `Subtasks:\n${data.subtasks.map(st => `  - ${st.key}: ${st.summary} (${st.status})`).join('\n')}\n` +
                `Linked/Child Issues:\n${data.linkedIssues?.map(li => `  - ${li.key}: ${li.summary} (${li.status})\n    Description: ${li.description}`).join('\n\n')}`
            ).join("\n\n---\n\n");
        }
      } catch (jiraError: any) {
        console.warn("Failed to fetch Jira data:", jiraError.message);
        jiraContext = `Attempted to fetch Jira data but failed: ${jiraError.message}. Proceeding with just the URL.`;
      }
    }

    const promptContext = `
      You are an expert technical project manager, software architect, and tax credit analyst.
      Your goal is to complete a CapEx R&D Tax Credit Worksheet as thoroughly as possible using ALL available context. 
      You MUST infer and deduce answers from the provided Jira data, SOW text, and context. Do NOT simply say "Requires review" if the answer can be reasonably inferred from the technical descriptions, subtasks, or summaries.

      CRITICAL INSTRUCTIONS FOR EXTRACTION:
      1. USE BOTH JIRA AND SOW: You must actively synthesize information from BOTH the Jira Epic/child stories AND the SOW document. Do not rely solely on one. Extract the high-level goals from the SOW and the granular technical implementations/uncertainties from the Jira tickets. Cite both sources where applicable (e.g. "[SOW], [JIRA-123]").
      2. Spikes = Experimentation: Specifically look for Jira stories labeled or titled "Spike", "POC", "investigate", "research", or "evaluate". These explicitly represent technical uncertainties and experimentation. Use them heavily to populate the "Technical Uncertainty" and "Experimentation" fields.
      3. Infer Challenges & Solutions: Look at technical subtasks (e.g., "Refactor X", "Migrate Y", "Fix bug in Z"). These indicate technical challenges and the solutions applied. Cite the specific Jira keys.
      4. Infer Technologies: Extract any mentioned programming languages, frameworks, databases, or cloud services from the text (e.g., React, AWS, Postgres, Ruby).
      5. Percentages: If percentages are not explicitly stated, estimate them based on the ratio of "new feature" subtasks vs "bug/maintenance" subtasks. Default to 80/20 New/Updating and 20/80 Research/Dev if mostly building.
      6. Do NOT leave fields blank or say "Not provided in Wiki" if you can find the answer in the Jira data or SOW text. 
      7. The user provided an SOW URL (${sowUrl || 'None'}) and a BRD URL (${brdUrl || 'None'}). You MUST set 'sowLink' and 'brdLink' to exactly these values if provided.
      8. Extract PICs (People In Charge / Points of Contact) from the BRD text and assign them to the \`smes\` field.
      9. Project Name/Title: Extract the actual readable title of the project from the Epic Summary or the BRD/SOW headers. Do NOT just output the Epic ID (e.g., instead of "ZONKS-123", output "Customer Rebranding Project"). If both are available, combine them or use the most descriptive one.

      Here is the source material provided by the user:
      
      Jira Epic URLs (User Input): ${jiraUrls || "None provided"}
      
      Extracted Jira Data (CRITICAL - USE THIS TO ANSWER QUESTIONS): 
      ${jiraContext}
      
      Wiki Project URLs: ${wikiUrls || "None provided"}
      
      Statement of Work: 
      ${sowText || "None provided"}
      
      Business Requirements Document:
      ${brdText || "None provided"}

      Extract the information based on the schema requirements. Ensure that the R&D Information and Elimination of Uncertainty sections are formatted as rich markdown lists (bullet points) containing a blurb of collaborating information and citations (referencing specific sections or subtasks) for each point.
      
      FORMATTING REQUIREMENTS:
      - Consistently add exactly one blank line (empty line) between EVERY single bullet point in any markdown list you generate. Do not smash them together.
      - New Learnings (\`researchedLearnings\`): Put an empty line (blank line) after each learning.
      - Challenges (\`challengesSolutions\`): Format each challenge and solution EXACTLY like this (do NOT use bullet points for this section, use paragraphs):
        **Challenge:** [Describe challenge here]

        **Solution:** [Describe solution here]
        
        (Make sure there is a full blank line between the Challenge paragraph and the Solution paragraph, and another full blank line before the next Challenge begins.)
      - Experimentation (\`processesOfExperimentation\`): Add an empty line after each experimentation.
      - Citations: When adding citations, format them as markdown links back to the source doc where the information is coming from (e.g. [JIRA-123](https://${process.env.JIRA_DOMAIN || 'your-domain.atlassian.net'}/browse/JIRA-123) or link to the SOW/BRD document if applicable).
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptContext,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.2, // Slightly higher to allow inference
      },
    });

    const text = response.text;
    
    if (!text) {
        throw new Error("No response from AI")
    }

    const worksheetData: WorksheetData = JSON.parse(text);

    return NextResponse.json({ data: worksheetData });
  } catch (error) {
    console.error("Extraction API Error:", error);
    return NextResponse.json(
      { error: "Failed to process the request." },
      { status: 500 }
    );
  }
}