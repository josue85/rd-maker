import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGoogleDriveClient, getGoogleDocsClient, copyGoogleDocAndReplace } from "@/lib/google-docs";
import { extractGoogleDocId } from "@/lib/google-docs";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { result, templateDocUrl } = await req.json();
    
    // Default template if one is not provided in the UI
    const defaultTemplateId = '15P2KQxaCHcTXgKEnQD8WV58t-F_NAHBUfeBFxqBgzHY';
    const templateId = templateDocUrl ? extractGoogleDocId(templateDocUrl) || defaultTemplateId : defaultTemplateId;

    const driveClient = getGoogleDriveClient(session.accessToken as string);
    const docsClient = getGoogleDocsClient(session.accessToken as string);
    
    // Format date as YYYYMMDD
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}${mm}${dd}`;
    
    const projName = result.projectName || result.epicLink?.split('/').pop() || 'Project';
    const newTitle = `${projName} Research and Development Tax Credit Worksheet ${dateStr}`;

    const cleanMd = (text: string | undefined | null) => {
      if (!text) return 'N/A';
      
      return text.trim() || 'N/A';
    };

    const formatLink = (url: string | undefined | null, text: string) => {
      if (!url || url === 'N/A') return 'N/A';
      return url.trim().startsWith('http') ? `[${text}](${url.trim()})` : url.trim();
    };

    // Map our state data to the placeholders in the document
    const replacements = {
      'Project Name': result.projectName || result.epicLink?.split('/').pop() || 'Project',
      'Wiki Link': formatLink(result.wikiLink, 'Wiki'),
      'Epic Link': formatLink(result.epicLink, 'Epic'),
      'SoW Link': formatLink(result.sowLink, 'Statement of Work'),
      'BRD Link': formatLink(result.brdLink, 'BRD'),
      'Tech PIC': result.smes || 'N/A',
      'PM or Product Manger': 'N/A', // Could add this to UI later
      'SE manager': result.teamLead || 'N/A',
      'Project Description': cleanMd(result.description),
      'Business objectives': cleanMd(result.businessObjective),
      
      // Fixed the missing mapping tags!
      'New Work vs Updating': `New: ${result.newWorkPercentage || '0%'}, Updating: ${result.updatingPercentage || '0%'}`,
      'Research and Learning vs Development': `Research/Learning: ${result.researchLearningPercentage || '0%'}, Development: ${result.developmentPercentage || '0%'}`,
      'What kind of things were researched and/or new learnings': cleanMd(result.researchedLearnings),
      'Challenges': cleanMd(result.challengesSolutions),
      'Technologies': cleanMd(result.technologiesUsed),

      'Code Optimizations': cleanMd(result.codeOptimizations),
      'processes of experimentation': cleanMd(result.processesOfExperimentation),
      'Bussiness Uncertainty': cleanMd(result.businessUncertaintiesSolved),
      'Technical Uncertainty': cleanMd(result.technicalUncertaintiesSolved),
      'Commercially Available': cleanMd(result.commerciallyAvailable),
      'reduce cost, improve speed and/or have any other': cleanMd(result.reducedCostSpeed),
      'Economic Risk': cleanMd(result.economicRisk),
    };

    const docUrl = await copyGoogleDocAndReplace(
      driveClient,
      docsClient,
      templateId,
      newTitle,
      replacements
    );

    return NextResponse.json({ url: docUrl });
  } catch (error: any) {
    console.error("Export API Error:", error.message || error);
    return NextResponse.json(
      { error: "Failed to export document.", details: error.message || String(error) },
      { status: 500 }
    );
  }
}