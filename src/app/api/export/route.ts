import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGoogleDriveClient, getGoogleDocsClient, copyGoogleDocAndReplace } from "@/lib/google-docs";
import { extractGoogleDocId } from "@/lib/google-docs";
import removeMd from "remove-markdown";

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
    
    const dateStr = new Date().toISOString().split('T')[0];
    const newTitle = `CapEx_RnD_Worksheet_${dateStr}`;

    const cleanMd = (text: string | undefined | null) => {
        if (!text) return 'N/A';
        // Strip markdown to make it plain text for Google Docs find/replace
        return removeMd(text);
    };

    // Map our state data to the placeholders in the document
    const replacements = {
      'Project Name': result.epicLink ? result.epicLink.split('/').pop() || 'Project' : 'Project',
      'Wiki Link': result.wikiLink || 'N/A',
      'Epic Link': result.epicLink || 'N/A',
      'SoW Link': result.sowLink || 'N/A',
      'BRD Link': result.brdLink || 'N/A',
      'Tech PIC': result.smes || 'N/A',
      'PM or Product Manger': 'N/A', // Could add this to UI later
      'SE manager': result.teamLead || 'N/A',
      'Project Description': cleanMd(result.description),
      'Business objectives': cleanMd(result.businessObjective),
      
      // Fixed the missing mapping tags!
      'New Work vs Updating': `New: ${result.newWorkPercentage || '0%'}, Updating: ${result.updatingPercentage || '0%'}`,
      'Research and Learning vs Development': `Research/Learning: ${result.researchLearningPercentage || '0%'}, Development: ${result.developmentPercentage || '0%'}`,
      'Researched and new learnings': cleanMd(result.researchedLearnings),
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