import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGoogleDriveClient, createGoogleDocFromHtml } from "@/lib/google-docs";
import { marked } from "marked";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await req.json();
    
    // Safely parse markdown to HTML for any string field that might contain it
    const mdToHtml = (text: string | undefined | null) => {
      if (!text) return 'N/A';
      return marked.parse(text);
    };

    // Construct the HTML document
    const htmlContent = `
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          h1 { color: #2c3e50; border-bottom: 2px solid #eee; padding-bottom: 5px; }
          h2 { color: #34495e; margin-top: 20px; }
          h3 { color: #7f8c8d; }
          .section { margin-bottom: 20px; }
          .label { font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Capital Expenditure Research And Development Worksheet</h1>

        <div class="section">
          <h2>Project Information</h2>
          <p><span class="label">Wiki:</span> <a href="${result.wikiLink || '#'}">${result.wikiLink || 'N/A'}</a></p>
          <p><span class="label">Epic:</span> <a href="${result.epicLink || '#'}">${result.epicLink || 'N/A'}</a></p>
          <p><span class="label">SoW:</span> <a href="${result.sowLink || '#'}">${result.sowLink || 'N/A'}</a></p>
          <p><span class="label">BRD:</span> <a href="${result.brdLink || '#'}">${result.brdLink || 'N/A'}</a></p>
          <p><span class="label">SMEs:</span> ${result.smes || 'N/A'}</p>
          <p><span class="label">Team Lead / Manager:</span> ${result.teamLead || 'N/A'}</p>

          <h3>Description of Project</h3>
          <div>${mdToHtml(result.description)}</div>

          <h3>Business Objective</h3>
          <div>${mdToHtml(result.businessObjective)}</div>
        </div>

        <div class="section">
          <h2>R&D Information</h2>
          <p><span class="label">What percentage of the project was new work vs updating existing work?</span><br>
          New: ${result.newWorkPercentage || '0%'}, Updating: ${result.updatingPercentage || '0%'}</p>

          <p><span class="label">What Percentage of project work was research / learning versus development?</span><br>
          Research and Learning: ${result.researchLearningPercentage || '0%'}, Development: ${result.developmentPercentage || '0%'}</p>

          <p class="label">What kind of things were researched and/or new learnings?</p>
          <div>${mdToHtml(result.researchedLearnings)}</div>

          <p class="label">During the course of this project, what challenges did you face and what solutions did you use to overcome those challenges?</p>
          <div>${mdToHtml(result.challengesSolutions)}</div>

          <p class="label">Which technologies were used for this work:</p>
          <div>${mdToHtml(result.technologiesUsed)}</div>

          <h3>What code optimizations were done for this epic?</h3>
          <div>${mdToHtml(result.codeOptimizations)}</div>

          <h3>Which processes of experimentation were done for this epic?</h3>
          <div>${mdToHtml(result.processesOfExperimentation)}</div>
        </div>

        <div class="section">
          <h2>Elimination of uncertainty</h2>
          <p class="label">What business uncertainties were solved during this work?</p>
          <div>${mdToHtml(result.businessUncertaintiesSolved)}</div>

          <p class="label">What technical or solutioning uncertainty did we have and how did we overcome it?</p>
          <div>${mdToHtml(result.technicalUncertaintiesSolved)}</div>
        </div>

        <div class="section">
          <h3>IS THIS INTERNAL USE SOFTWARE: ${result.isInternalUseSoftware ? 'Yes' : 'No'}</h3>
          
          <p class="label">Is this component commercially available?</p>
          <div>${mdToHtml(result.commerciallyAvailable)}</div>

          <p class="label">Did the project reduce cost, improve speed and/or have any other measurable improvement?</p>
          <div>${mdToHtml(result.reducedCostSpeed)}</div>

          <p class="label">Did the project pose a significant economic risk test?</p>
          <div>${mdToHtml(result.economicRisk)}</div>
        </div>
      </body>
      </html>
    `;

    const driveClient = getGoogleDriveClient(session.accessToken as string);
    const dateStr = new Date().toISOString().split('T')[0];
    const docUrl = await createGoogleDocFromHtml(driveClient, `CapEx_RnD_Worksheet_${dateStr}`, htmlContent);

    return NextResponse.json({ url: docUrl });
  } catch (error: any) {
    console.error("Export API Error:", error);
    return NextResponse.json(
      { error: "Failed to export document." },
      { status: 500 }
    );
  }
}