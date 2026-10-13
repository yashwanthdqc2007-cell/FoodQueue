"use client";

import { useState, useRef } from "react";
import {
  X,
  UploadCloud,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  Camera,
} from "lucide-react";

interface AiClassifyModalProps {
  surplusId: string;
  foodName: string;
  existingImagePath?: string | null;
  existingSignedUrl?: string | null;
  existingCategory?: string;
  existingConfidence?: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function AiClassifyModal({
  surplusId,
  foodName,
  existingImagePath,
  existingSignedUrl,
  existingCategory,
  existingConfidence,
  onClose,
  onSuccess,
}: AiClassifyModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingSignedUrl || null);
  const [hasUploadedImage, setHasUploadedImage] = useState<boolean>(Boolean(existingImagePath));
  const [userNotes, setUserNotes] = useState<string>("");

  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [aiResult, setAiResult] = useState<{
    foodType: string;
    category: string;
    visibleCondition: string;
    confidence: number;
    advisory: boolean;
    advisoryNotice: string;
    recoveryDecision?: {
      path: string;
      summary: string;
      actionRecommendation: string;
    };
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setErrorMsg("Please select a valid image (JPEG, PNG, or WebP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Image size exceeds maximum limit of 5 MB");
      return;
    }

    setErrorMsg(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleUploadAndClassify() {
    setErrorMsg(null);

    try {
      // 1. If a new file was selected, upload it first
      if (selectedFile) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append("surplusId", surplusId);
        formData.append("file", selectedFile);

        const uploadRes = await fetch("/api/surplus/upload-image", {
          method: "POST",
          body: formData,
        });

        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok || uploadJson.error) {
          throw new Error(uploadJson.error?.message || "Failed to upload image");
        }

        setHasUploadedImage(true);
        if (uploadJson.data?.signedUrl) {
          setPreviewUrl(uploadJson.data.signedUrl);
        }
        setIsUploading(false);
      }

      // 2. Trigger Gemini Vision analysis
      setIsAnalyzing(true);
      const aiRes = await fetch("/api/ai/classify-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surplusId,
          notes: userNotes.trim() || undefined,
        }),
      });

      const aiJson = await aiRes.json();
      if (!aiRes.ok || aiJson.error) {
        throw new Error(aiJson.error?.message || "AI classification failed. Please retry.");
      }

      setAiResult(aiJson.data);
      onSuccess();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
      <div className="bg-brand-surface rounded-3xl max-w-xl w-full border border-brand-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-brand-border flex items-center justify-between bg-brand-surface">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-primary/20 text-brand-mint shadow-2xs">
              <Sparkles className="w-5 h-5 text-brand-mint" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-brand-text">Gemini Vision Visual Inspection</h2>
              <p className="text-xs text-brand-muted font-semibold">Surplus Batch: {foodName}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-brand-muted hover:text-brand-text hover:bg-brand-card transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Advisory Notice Banner */}
          <div className="bg-amber-950/30 border border-amber-800/50 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-200">
            <ShieldCheck className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <span className="font-extrabold text-amber-300">Advisory Visual Assessment:</span> AI observations provide heuristic categorization assistance and do not replace standard institutional food safety protocols.
            </div>
          </div>

          {errorMsg && (
            <div className="bg-rose-950/30 border border-rose-800/50 rounded-2xl p-4 flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Image Upload Area */}
          <div>
            <label className="block text-xs font-bold text-brand-text mb-2">
              Food Batch Photo (Private Storage)
            </label>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />

            {previewUrl ? (
              <div className="relative rounded-2xl border border-brand-border overflow-hidden bg-brand-card aspect-video flex items-center justify-center group shadow-2xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Surplus preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-brand-card text-brand-text border border-brand-border text-xs font-bold shadow-xs hover:bg-brand-surface transition flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Change Photo</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-brand-border rounded-2xl p-6 text-center hover:border-brand-primary hover:bg-brand-card/50 transition cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <div className="p-3 rounded-full bg-brand-card text-brand-muted">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold text-brand-text block">Click to upload photo</span>
                  <span className="text-[11px] text-brand-muted">JPEG, PNG, WebP up to 5 MB</span>
                </div>
              </div>
            )}
          </div>

          {/* Operator Context Notes */}
          <div>
            <label className="block text-xs font-bold text-brand-text mb-1.5">
              Operator Notes / Preparation Details (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Cooked 2 hours ago, kept at 65°C hot holding"
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs text-brand-text placeholder-brand-muted/50 bg-brand-card focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          {/* AI Inspection Result View */}
          {aiResult && (
            <div className="bg-brand-card border border-brand-border rounded-2xl p-4 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-brand-text flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-brand-primary" />
                  <span>AI Visual Classification Summary</span>
                </span>
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-brand-primary/20 text-brand-mint border border-brand-primary/30">
                  {Math.round(aiResult.confidence * 100)}% Confidence
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div className="p-3 rounded-xl bg-brand-surface border border-brand-border">
                  <span className="text-[10px] text-brand-muted uppercase font-bold block">Identified Item</span>
                  <span className="font-extrabold text-brand-text">{aiResult.foodType}</span>
                </div>
                <div className="p-3 rounded-xl bg-brand-surface border border-brand-border">
                  <span className="text-[10px] text-brand-muted uppercase font-bold block">Assigned Category</span>
                  <span className="font-bold uppercase text-brand-mint bg-brand-primary/20 px-2 py-0.5 rounded-md inline-block mt-0.5">
                    {aiResult.category.replace("_", " ")}
                  </span>
                </div>
              </div>

              <div className="text-xs bg-brand-surface p-3.5 rounded-xl border border-brand-border">
                <span className="text-[10px] text-brand-muted uppercase font-bold block mb-1">Visible Condition</span>
                <p className="text-brand-text">{aiResult.visibleCondition}</p>
              </div>

              {aiResult.recoveryDecision && (
                <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-xs">
                  <div className="flex items-center justify-between font-extrabold text-emerald-200">
                    <span>Deterministic Decision:</span>
                    <span className="uppercase tracking-wider text-brand-mint">{aiResult.recoveryDecision.path}</span>
                  </div>
                  <p className="text-[11px] text-emerald-300/90 mt-1 font-medium">{aiResult.recoveryDecision.actionRecommendation}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-brand-border bg-brand-surface flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-brand-border text-xs font-semibold text-brand-muted hover:text-brand-text hover:bg-brand-card transition"
          >
            {aiResult ? "Close" : "Cancel"}
          </button>

          <button
            type="button"
            onClick={handleUploadAndClassify}
            disabled={isUploading || isAnalyzing || (!selectedFile && !hasUploadedImage)}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Uploading Image...</span>
              </>
            ) : isAnalyzing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Analyzing with Gemini...</span>
              </>
            ) : aiResult ? (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-Analyze</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Run Visual AI Scan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
