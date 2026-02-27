"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { WorksheetData } from "@/types/worksheet";
import { useSession, signIn, signOut } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WorksheetData | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      jiraUrls: formData.get("jiraUrls") as string,
      wikiUrls: formData.get("wikiUrls") as string,
      sowUrl: formData.get("sowUrl") as string,
      brdUrl: formData.get("brdUrl") as string,
    };

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to extract data");
      }

      const extractedData = await response.json();
      setResult(extractedData.data);
    } catch (error) {
      console.error(error);
      alert("An error occurred while processing the request.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof WorksheetData, value: any) => {
    if (result) {
      setResult({ ...result, [field]: value });
    }
  };

  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!result) return;
    setExporting(true);
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result, templateDocUrl: "" }), // Template is hardcoded in the backend for now
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to export document");
      }

      const { url } = await response.json();
      const newWindow = window.open(url, "_blank");
      if (!newWindow) {
        // Fallback if popup blocker prevented the new window
        window.location.assign(url);
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred while exporting the document.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans pb-24">
      {/* Enova Brand Header */}
      <header className="bg-primary text-primary-foreground shadow-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Image 
              src="/enova-logo.svg" 
              alt="Enova Logo" 
              width={100} 
              height={30} 
              priority
            />
            <div className="border-l border-primary-foreground/30 pl-6">
              <h1 className="text-lg font-bold tracking-tight">CapEx R&D Tax Credit Worksheet</h1>
            </div>
          </div>
          {result && (
             <div className="flex gap-4">
                <Button variant="outline" onClick={() => setResult(null)} className="text-primary border-primary bg-white hover:bg-primary/5">
                  Start Over
                </Button>
                <Button onClick={handleExport} disabled={exporting} className="bg-[#95ca53] hover:bg-[#86b54a] text-white shadow-md font-semibold">
                  {exporting ? "Exporting..." : "Export to Google Doc"}
                </Button>
             </div>
          )}
          {session && (
            <Button variant="ghost" onClick={() => signOut()} className="text-white hover:bg-primary/50">
              Sign Out
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-8 py-8 space-y-8">
        {status === "loading" ? (
           <div className="flex justify-center pt-20">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
           </div>
        ) : !session ? (
          <div className="flex items-center justify-center pt-20 animate-in fade-in duration-500">
            <Card className="max-w-md w-full p-8 text-center space-y-6 shadow-lg border-t-4 border-t-primary">
              <div className="mx-auto flex justify-center pb-4">
                <Image src="/enova-logo.svg" alt="Enova" width={140} height={40} className="filter invert brightness-0" />
              </div>
              <h2 className="text-2xl font-bold text-[#333333]">Sign In Required</h2>
              <p className="text-muted-foreground text-sm">
                Please sign in with your Enova Google account to allow the application to securely read your SOW/BRD documents.
              </p>
              <Button onClick={() => signIn('google')} className="w-full bg-[#95ca53] hover:bg-[#86b54a] text-white py-6 text-lg font-semibold shadow-md">
                Sign in with Google
              </Button>
            </Card>
          </div>
        ) : !result ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-8">
            <div className="bg-white p-6 border border-border rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold text-primary mb-2">Automate Your R&D Documentation</h2>
              <p className="text-muted-foreground">
                Provide the links below. The AI will securely fetch your Epic, linked stories, and Google Doc 
                to intelligently draft your CapEx R&D Tax Credit Worksheet.
              </p>
            </div>

            <Card className="border-t-4 border-t-primary shadow-md">
              <CardHeader className="bg-muted/30 border-b border-border pb-4">
                <CardTitle className="text-lg text-[#333333]">Source Materials</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="jiraUrls" className="text-sm font-semibold text-gray-700">Jira Epic URL(s) *</Label>
                    <Input
                      id="jiraUrls"
                      name="jiraUrls"
                      placeholder="https://enova.atlassian.net/browse/EPIC-123"
                      className="border-input focus:border-primary focus:ring-primary/20"
                      required
                    />
                    <p className="text-xs text-muted-foreground">The system will automatically fetch the epic description and all linked subtasks.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sowUrl" className="text-sm font-semibold text-gray-700">Google Doc Link (SOW)</Label>
                    <Input
                      id="sowUrl"
                      name="sowUrl"
                      placeholder="https://docs.google.com/document/d/1Tn5_..."
                      className="border-input focus:border-primary focus:ring-primary/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="brdUrl" className="text-sm font-semibold text-gray-700">Google Doc Link (BRD)</Label>
                    <Input
                      id="brdUrl"
                      name="brdUrl"
                      placeholder="https://docs.google.com/document/d/1Tn5_..."
                      className="border-input focus:border-primary focus:ring-primary/20"
                    />
                    <p className="text-xs text-muted-foreground">Make sure you have Viewer access to these documents.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wikiUrls" className="text-sm font-semibold text-gray-700">Wiki Project URL(s)</Label>
                    <Input
                      id="wikiUrls"
                      name="wikiUrls"
                      placeholder="https://wiki.enova.com/pages/viewpage.action?pageId=..."
                      className="border-input focus:border-primary focus:ring-primary/20"
                    />
                  </div>

                  <div className="pt-4">
                    <Button 
                      type="submit" 
                      className="w-full bg-primary hover:bg-secondary text-white font-semibold py-6 text-lg shadow-sm transition-all" 
                      disabled={loading}
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Analyzing Sources & Extracting Data...
                        </span>
                      ) : (
                        "Generate Worksheet Draft"
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-md shadow-sm">
              <strong>Success!</strong> The AI has generated a draft. Please review and edit the fields below before exporting.
            </div>
            
            <Card className="border-t-4 border-t-[#95ca53] shadow-md">
              <CardHeader className="bg-muted/30 border-b border-border pb-4">
                <CardTitle className="text-lg text-[#333333]">Project Information</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Wiki Link</Label>
                    <Input value={result.wikiLink || ''} onChange={(e) => handleInputChange('wikiLink', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Epic Link</Label>
                    <Input value={result.epicLink || ''} onChange={(e) => handleInputChange('epicLink', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>SoW Link</Label>
                    <Input value={result.sowLink || ''} onChange={(e) => handleInputChange('sowLink', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>BRD Link</Label>
                    <Input value={result.brdLink || ''} onChange={(e) => handleInputChange('brdLink', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>SMEs</Label>
                    <Input value={result.smes || ''} onChange={(e) => handleInputChange('smes', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Team Lead / Manager</Label>
                    <Input value={result.teamLead || ''} onChange={(e) => handleInputChange('teamLead', e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Label>Description of Project</Label>
                  <Textarea className="h-32" value={result.description || ''} onChange={(e) => handleInputChange('description', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Business Objective</Label>
                  <Textarea className="h-24" value={result.businessObjective || ''} onChange={(e) => handleInputChange('businessObjective', e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-t-4 border-t-primary shadow-md">
              <CardHeader className="bg-muted/30 border-b border-border pb-4">
                <CardTitle className="text-lg text-[#333333]">R&D Information</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                
                <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                  <h3 className="font-medium text-sm mb-4">Project Percentages (Approximate)</h3>
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <Label className="text-xs text-muted-foreground">New Work vs Updating</Label>
                      <div className="flex items-center gap-2">
                        <Input className="w-24" placeholder="80%" value={result.newWorkPercentage || ''} onChange={(e) => handleInputChange('newWorkPercentage', e.target.value)} /> <span className="text-sm">New</span>
                        <Input className="w-24 ml-4" placeholder="20%" value={result.updatingPercentage || ''} onChange={(e) => handleInputChange('updatingPercentage', e.target.value)} /> <span className="text-sm">Updating</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-xs text-muted-foreground">Research/Learning vs Development</Label>
                      <div className="flex items-center gap-2">
                        <Input className="w-24" placeholder="30%" value={result.researchLearningPercentage || ''} onChange={(e) => handleInputChange('researchLearningPercentage', e.target.value)} /> <span className="text-sm">Research</span>
                        <Input className="w-24 ml-4" placeholder="70%" value={result.developmentPercentage || ''} onChange={(e) => handleInputChange('developmentPercentage', e.target.value)} /> <span className="text-sm">Dev</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>What kind of things were researched and/or new learnings?</Label>
                  <Textarea className="h-24" value={result.researchedLearnings || ''} onChange={(e) => handleInputChange('researchedLearnings', e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Challenges faced and solutions used to overcome them</Label>
                  <Textarea className="h-32" value={result.challengesSolutions || ''} onChange={(e) => handleInputChange('challengesSolutions', e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Technologies used for this work</Label>
                  <Input placeholder="e.g. Ruby, PGS, VUE, PostgreSQL" value={result.technologiesUsed || ''} onChange={(e) => handleInputChange('technologiesUsed', e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Code optimizations done for this epic</Label>
                  <Textarea className="h-24" value={result.codeOptimizations || ''} onChange={(e) => handleInputChange('codeOptimizations', e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Processes of experimentation done for this epic</Label>
                  <Textarea className="h-24" placeholder="Modeling, simulations, trial and error (Optimizely, AB Test, etc)" value={result.processesOfExperimentation || ''} onChange={(e) => handleInputChange('processesOfExperimentation', e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-t-4 border-t-primary shadow-md">
              <CardHeader className="bg-muted/30 border-b border-border pb-4">
                <CardTitle className="text-lg text-[#333333]">Elimination of Uncertainty & Internal Use</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                
                <div className="space-y-2">
                  <Label>What business uncertainties were solved during this work?</Label>
                  <Textarea className="h-24" placeholder="e.g. customer behavior, previously undefined processes" value={result.businessUncertaintiesSolved || ''} onChange={(e) => handleInputChange('businessUncertaintiesSolved', e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>What technical or solutioning uncertainty did we have and how did we overcome it?</Label>
                  <Textarea className="h-24" placeholder="Spikes completed to understand solution development, POCs implemented" value={result.technicalUncertaintiesSolved || ''} onChange={(e) => handleInputChange('technicalUncertaintiesSolved', e.target.value)} />
                </div>

                <hr className="my-4" />

                <div className="flex items-center space-x-2 bg-slate-50 p-4 rounded-md border border-slate-200">
                  <Checkbox 
                    id="internalUse" 
                    checked={result.isInternalUseSoftware || false}
                    onCheckedChange={(checked) => handleInputChange('isInternalUseSoftware', checked === true)}
                  />
                  <label htmlFor="internalUse" className="text-sm font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    IS THIS INTERNAL USE SOFTWARE?
                  </label>
                </div>

                {result.isInternalUseSoftware && (
                  <div className="space-y-4 pl-6 border-l-2 border-primary ml-2 py-2">
                    <div className="space-y-2">
                      <Label>Is this component commercially available?</Label>
                      <Textarea value={result.commerciallyAvailable || ''} onChange={(e) => handleInputChange('commerciallyAvailable', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Did the project reduce cost, improve speed and/or have any other measurable improvement?</Label>
                      <Textarea value={result.reducedCostSpeed || ''} onChange={(e) => handleInputChange('reducedCostSpeed', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Did the project pose a significant economic risk test?</Label>
                      <Textarea value={result.economicRisk || ''} onChange={(e) => handleInputChange('economicRisk', e.target.value)} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end pt-4 pb-12">
               <Button onClick={handleExport} disabled={exporting} size="lg" className="bg-[#95ca53] hover:bg-[#86b54a] text-white shadow-md text-lg px-8">
                  {exporting ? "Exporting..." : "Export Final to Google Doc"}
               </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}