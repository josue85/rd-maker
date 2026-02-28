"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { WorksheetData } from "@/types/worksheet";
import { useSession, signIn, signOut } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import useDrivePicker from "react-google-drive-picker";
import { Trash2, File as FileIcon, Image as ImageIcon, FileText } from "lucide-react";

type AdditionalFile = {
  id: string;
  name: string;
  mimeType: string;
  base64?: string;
  url?: string;
  isDrive: boolean;
};

const MarkdownEditor = ({ value, onChange, label, className = "h-32", placeholder = "" }: any) => {
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label>{label}</Label>
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-md border border-border">
          <button 
            type="button"
            onClick={() => setMode("preview")} 
            className={`text-xs px-3 py-1 rounded-sm transition-colors ${mode === "preview" ? "bg-white shadow-sm font-semibold text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            Preview
          </button>
          <button 
            type="button"
            onClick={() => setMode("edit")} 
            className={`text-xs px-3 py-1 rounded-sm transition-colors ${mode === "edit" ? "bg-white shadow-sm font-semibold text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            Raw Edit
          </button>
        </div>
      </div>
      {mode === "preview" ? (
        <div className={`p-4 border border-input rounded-md bg-white overflow-y-auto min-h-[8rem] max-h-[30rem] ${className.replace('h-', 'min-h-')}`}>
          {value ? (
              <ReactMarkdown 
              components={{
                ul: ({node, ...props}) => <ul className="list-disc pl-6 space-y-3 mb-6 mt-2" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal pl-6 space-y-3 mb-6 mt-2" {...props} />,
                p: ({node, ...props}) => <p className="mb-4 last:mb-0 leading-relaxed" {...props} />,
                a: ({node, ...props}) => <a className="text-primary hover:underline font-medium" target="_blank" rel="noopener noreferrer" {...props} />,
                h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-4 mt-8" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-3 mt-6" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-md font-bold mb-2 mt-5" {...props} />,
                li: ({node, ...props}) => <li className="pl-1 marker:text-muted-foreground" {...props} />,
                strong: ({node, ...props}) => <strong className="font-semibold text-gray-900" {...props} />,
              }}
            >
              {value}
            </ReactMarkdown>
          ) : (
            <span className="text-muted-foreground italic">No content...</span>
          )}
        </div>
      ) : (
        <Textarea className={`font-mono text-sm ${className}`} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
};

export default function Home() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WorksheetData | null>(null);

  // Form states for Picker population
  const [jiraUrls, setJiraUrls] = useState("");
  const [sowUrl, setSowUrl] = useState("");
  const [brdUrl, setBrdUrl] = useState("");
  const [wikiUrls, setWikiUrls] = useState("");
  const [additionalFiles, setAdditionalFiles] = useState<AdditionalFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [openPicker] = useDrivePicker();

  const handleOpenDrivePickerMulti = () => {
    if (!session?.accessToken) {
      alert("Please sign in first.");
      return;
    }
    openPicker({
      clientId: "440311247922-3401s8srtbvvumphc20r0dm74n1osq9l.apps.googleusercontent.com",
      developerKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "", 
      viewId: "DOCS",
      token: session.accessToken,
      showUploadView: true,
      showUploadFolders: true,
      supportDrives: true,
      multiselect: true,
      callbackFunction: (data) => {
        if (data.action === 'picked') {
          const newFiles = data.docs.map((doc: any) => ({
            id: doc.id,
            name: doc.name,
            mimeType: doc.mimeType,
            url: doc.url,
            isDrive: true
          }));
          setAdditionalFiles((prev) => [...prev, ...newFiles]);
        }
      },
    });
  };

  const handleLocalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const newFiles = await Promise.all(
      files.map(async (file) => {
        return new Promise<AdditionalFile>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              id: Math.random().toString(36).substring(7),
              name: file.name,
              mimeType: file.type,
              base64: reader.result as string, // data URL format
              isDrive: false,
            });
          };
          reader.readAsDataURL(file);
        });
      })
    );
    setAdditionalFiles((prev) => [...prev, ...newFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (id: string) => {
    setAdditionalFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleOpenPicker = (setFieldUrl: (url: string) => void) => {
    if (!session?.accessToken) {
      alert("Please sign in first.");
      return;
    }
    openPicker({
      // We extract client ID from standard env vars usually, hardcoded fallback for the picker component to function.
      clientId: "440311247922-3401s8srtbvvumphc20r0dm74n1osq9l.apps.googleusercontent.com",
      developerKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "", 
      viewId: "DOCS",
      token: session.accessToken,
      showUploadView: true,
      showUploadFolders: true,
      supportDrives: true,
      multiselect: false,
      callbackFunction: (data) => {
        if (data.action === 'picked') {
          const file = data.docs[0];
          setFieldUrl(file.url);
        }
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const data = {
      jiraUrls,
      wikiUrls,
      sowUrl,
      brdUrl,
      additionalFiles,
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
                      value={jiraUrls}
                      onChange={(e) => setJiraUrls(e.target.value)}
                      placeholder="https://enova.atlassian.net/browse/EPIC-123"
                      className="border-input focus:border-primary focus:ring-primary/20"
                      required
                    />
                    <p className="text-xs text-muted-foreground">The system will automatically fetch the epic description and all linked subtasks.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sowUrl" className="text-sm font-semibold text-gray-700">Google Doc Link (SOW)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="sowUrl"
                        value={sowUrl}
                        onChange={(e) => setSowUrl(e.target.value)}
                        placeholder="https://docs.google.com/document/d/..."
                        className="border-input focus:border-primary focus:ring-primary/20 flex-1"
                      />
                      <Button type="button" variant="outline" onClick={() => handleOpenPicker(setSowUrl)}>
                        Select File
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="brdUrl" className="text-sm font-semibold text-gray-700">Google Doc Link (BRD)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="brdUrl"
                        value={brdUrl}
                        onChange={(e) => setBrdUrl(e.target.value)}
                        placeholder="https://docs.google.com/document/d/..."
                        className="border-input focus:border-primary focus:ring-primary/20 flex-1"
                      />
                      <Button type="button" variant="outline" onClick={() => handleOpenPicker(setBrdUrl)}>
                        Select File
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Make sure you have Viewer access to these documents.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wikiUrls" className="text-sm font-semibold text-gray-700">Wiki Project URL(s)</Label>
                    <Input
                      id="wikiUrls"
                      value={wikiUrls}
                      onChange={(e) => setWikiUrls(e.target.value)}
                      placeholder="https://wiki.enova.com/pages/viewpage.action?pageId=..."
                      className="border-input focus:border-primary focus:ring-primary/20"
                    />
                  </div>

                  <div className="space-y-4 pt-4 border-t border-border">
                    <div className="space-y-1">
                      <Label className="text-sm font-semibold text-gray-700">Additional Context & Supporting Files (Optional)</Label>
                      <p className="text-xs text-muted-foreground">Upload or link architecture diagrams, flow charts, or spreadsheets. The AI will read them directly to extract extra technical challenges and insights.</p>
                    </div>
                    
                    <div className="flex gap-4">
                      <Button type="button" variant="outline" onClick={handleOpenDrivePickerMulti} className="flex-1 bg-white hover:bg-slate-50 border-dashed border-2 border-slate-300">
                        <FileText className="w-4 h-4 mr-2 text-primary" />
                        Select from Google Drive
                      </Button>
                      
                      <div className="flex-1 relative">
                        <input
                          type="file"
                          multiple
                          ref={fileInputRef}
                          onChange={handleLocalFileUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          accept="image/*,application/pdf,.csv,.txt"
                        />
                        <Button type="button" variant="outline" className="w-full bg-white hover:bg-slate-50 border-dashed border-2 border-slate-300 pointer-events-none">
                          <FileIcon className="w-4 h-4 mr-2 text-primary" />
                          Upload Local Files
                        </Button>
                      </div>
                    </div>

                    {additionalFiles.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Attached Files ({additionalFiles.length})</p>
                        <ul className="space-y-2">
                          {additionalFiles.map((f) => (
                            <li key={f.id} className="flex items-center justify-between p-2 text-sm bg-white border border-border rounded-md shadow-sm">
                              <div className="flex items-center overflow-hidden">
                                {f.mimeType.startsWith('image') ? <ImageIcon className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" /> : <FileText className="w-4 h-4 text-slate-500 mr-2 flex-shrink-0" />}
                                <span className="truncate max-w-[200px] sm:max-w-[300px]">{f.name}</span>
                                {f.isDrive && <span className="ml-2 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Drive</span>}
                              </div>
                              <button type="button" onClick={() => removeFile(f.id)} className="text-slate-400 hover:text-red-500 p-1">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
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
              <CardContent className="pt-6 space-y-8">
                <div className="grid grid-cols-2 gap-6">
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

                <MarkdownEditor
                  label="Description of Project"
                  className="h-32"
                  value={result.description || ''} 
                  onChange={(val: string) => handleInputChange('description', val)} 
                />
                
                <MarkdownEditor
                  label="Business Objective"
                  className="h-32"
                  value={result.businessObjective || ''} 
                  onChange={(val: string) => handleInputChange('businessObjective', val)} 
                />
              </CardContent>
            </Card>

            <Card className="border-t-4 border-t-primary shadow-md">
              <CardHeader className="bg-muted/30 border-b border-border pb-4">
                <CardTitle className="text-lg text-[#333333]">R&D Information</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-8">
                
                <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                  <h3 className="font-medium text-sm mb-4">Project Percentages (Approximate)</h3>
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <Label className="text-xs text-muted-foreground">New Work vs Updating</Label>
                      <div className="flex items-center gap-2">
                        <Input className="w-24" placeholder="80%" value={result.newWorkPercentage || ''} onChange={(e) => handleInputChange('newWorkPercentage', e.target.value)} /> <span className="text-sm font-medium">New</span>
                        <Input className="w-24 ml-4" placeholder="20%" value={result.updatingPercentage || ''} onChange={(e) => handleInputChange('updatingPercentage', e.target.value)} /> <span className="text-sm font-medium">Updating</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-xs text-muted-foreground">Research/Learning vs Development</Label>
                      <div className="flex items-center gap-2">
                        <Input className="w-24" placeholder="30%" value={result.researchLearningPercentage || ''} onChange={(e) => handleInputChange('researchLearningPercentage', e.target.value)} /> <span className="text-sm font-medium">Research</span>
                        <Input className="w-24 ml-4" placeholder="70%" value={result.developmentPercentage || ''} onChange={(e) => handleInputChange('developmentPercentage', e.target.value)} /> <span className="text-sm font-medium">Dev</span>
                      </div>
                    </div>
                  </div>
                </div>

                <MarkdownEditor
                  label="What kind of things were researched and/or new learnings?"
                  className="h-48"
                  value={result.researchedLearnings || ''} 
                  onChange={(val: string) => handleInputChange('researchedLearnings', val)} 
                />

                <MarkdownEditor
                  label="Challenges faced and solutions used to overcome them"
                  className="h-64"
                  value={result.challengesSolutions || ''} 
                  onChange={(val: string) => handleInputChange('challengesSolutions', val)} 
                />

                <div className="space-y-2">
                  <Label>Technologies used for this work</Label>
                  <Input placeholder="e.g. Ruby, PGS, VUE, PostgreSQL" value={result.technologiesUsed || ''} onChange={(e) => handleInputChange('technologiesUsed', e.target.value)} />
                </div>

                <MarkdownEditor
                  label="Code optimizations done for this epic"
                  className="h-48"
                  value={result.codeOptimizations || ''} 
                  onChange={(val: string) => handleInputChange('codeOptimizations', val)} 
                />

                <MarkdownEditor
                  label="Processes of experimentation done for this epic"
                  className="h-48"
                  placeholder="Modeling, simulations, trial and error (Optimizely, AB Test, etc)"
                  value={result.processesOfExperimentation || ''} 
                  onChange={(val: string) => handleInputChange('processesOfExperimentation', val)} 
                />
              </CardContent>
            </Card>

            <Card className="border-t-4 border-t-primary shadow-md">
              <CardHeader className="bg-muted/30 border-b border-border pb-4">
                <CardTitle className="text-lg text-[#333333]">Elimination of Uncertainty & Internal Use</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-8">
                
                <MarkdownEditor
                  label="What business uncertainties were solved during this work?"
                  className="h-48"
                  placeholder="e.g. customer behavior, previously undefined processes"
                  value={result.businessUncertaintiesSolved || ''} 
                  onChange={(val: string) => handleInputChange('businessUncertaintiesSolved', val)} 
                />

                <MarkdownEditor
                  label="What technical or solutioning uncertainty did we have and how did we overcome it?"
                  className="h-48"
                  placeholder="Spikes completed to understand solution development, POCs implemented"
                  value={result.technicalUncertaintiesSolved || ''} 
                  onChange={(val: string) => handleInputChange('technicalUncertaintiesSolved', val)} 
                />

                <hr className="my-6 border-border" />

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
                  <div className="space-y-6 pl-6 border-l-2 border-primary ml-2 py-2">
                    <MarkdownEditor
                      label="Is this component commercially available?"
                      className="h-32"
                      value={result.commerciallyAvailable || ''} 
                      onChange={(val: string) => handleInputChange('commerciallyAvailable', val)} 
                    />
                    <MarkdownEditor
                      label="Did the project reduce cost, improve speed and/or have any other measurable improvement?"
                      className="h-32"
                      value={result.reducedCostSpeed || ''} 
                      onChange={(val: string) => handleInputChange('reducedCostSpeed', val)} 
                    />
                    <MarkdownEditor
                      label="Did the project pose a significant economic risk test?"
                      className="h-32"
                      value={result.economicRisk || ''} 
                      onChange={(val: string) => handleInputChange('economicRisk', val)} 
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end pt-4 pb-12">
               <Button onClick={handleExport} disabled={exporting} size="lg" className="bg-[#95ca53] hover:bg-[#86b54a] text-white shadow-md text-lg px-8 py-6 h-auto">
                  {exporting ? "Exporting..." : "Export Final to Google Doc"}
               </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}