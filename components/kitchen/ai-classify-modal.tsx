"use client";

import { useState, useRef } from "react";
import Image from "next/image";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Gemini Vision Visual Inspection</h2>
              <p className="text-xs text-slate-500 font-medium">Batch: {foodName}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Advisory Notice Banner */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
            <ShieldCheck className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold">Advisory Visual Assessment:</span> AI observations provide heuristic categorization assistance and do not constitute a legal or microbiological safety guarantee.
            </div>
          </div>

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Image Upload Area */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
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
              <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-100 aspect-video flex items-center justify-center group">
                <Image
                  src={previewUrl}
                  alt="Surplus preview"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-white/90 text-slate-800 text-xs font-semibold shadow-xs hover:bg-white transition flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Change Photo</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-emerald-500 hover:bg-emerald-50/20 transition cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <div className="p-3 rounded-full bg-slate-100 text-slate-500">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Click to upload photo</span>
                  <span className="text-[11px] text-slate-400">JPEG, PNG, WebP up to 5 MB</span>
                </div>
              </div>
            )}
          </div>

          {/* Operator Context Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Operator Notes / Preparation Details (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Cooked 2 hours ago, kept at 65°C hot holding"
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* AI Inspection Result View */}
          {aiResult && (
            <div className="bg-purple-50/60 border border-purple-200 rounded-2xl p-4 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-600" />
                  <span>AI Visual Classification Summary</span>
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-200 text-purple-900">
                  {Math.round(aiResult.confidence * 100)}% Confidence
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Identified Item</span>
                  <span className="font-bold text-slate-900">{aiResult.foodType}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Assigned Category</span>
                  <span className="font-bold uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md inline-block">
                    {aiResult.category.replace("_", " ")}
                  </span>
                </div>
              </div>

              <div className="text-xs bg-white p-3 rounded-xl border border-purple-100">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Visible Condition</span>
                <p className="text-slate-700">{aiResult.visibleCondition}</p>
              </div>

              {aiResult.recoveryDecision && (
                <div className="p-3 bg-emerald-100/60 border border-emerald-200 rounded-xl text-xs">
                  <div className="flex items-center justify-between font-bold text-emerald-950">
                    <span>Deterministic Decision:</span>
                    <span className="uppercase tracking-wider">{aiResult.recoveryDecision.path}</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 mt-1">{aiResult.recoveryDecision.actionRecommendation}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            {aiResult ? "Close" : "Cancel"}
          </button>

          <button
            type="button"
            onClick={handleUploadAndClassify}
            disabled={isUploading || isAnalyzing || (!selectedFile && !hasUploadedImage)}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
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
