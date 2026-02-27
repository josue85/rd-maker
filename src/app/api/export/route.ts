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
    
    const dateStr = new Date().toISOString().split('T')[0];
    const newTitle = `CapEx_RnD_Worksheet_${dateStr}`;

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
      'Project Description': result.description || 'N/A',
      'Business objectives': result.businessObjective || 'N/A',
      'Code Optimizations': result.codeOptimizations || 'N/A',
      'processes of experimentation': result.processesOfExperimentation || 'N/A',
      'Bussiness Uncertainty': result.businessUncertaintiesSolved || 'N/A',
      'Technical Uncertainty': result.technicalUncertaintiesSolved || 'N/A',
      'Commercially Available': result.commerciallyAvailable || 'N/A',
      'reduce cost, improve speed and/or have any other': result.reducedCostSpeed || 'N/A',
      'Economic Risk': result.economicRisk || 'N/A',
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