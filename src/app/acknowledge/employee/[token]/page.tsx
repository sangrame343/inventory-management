"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertTriangle, PenTool, RefreshCw, Layers } from "lucide-react";

interface BatchItem {
  assetName: string;
  assetCode: string | null;
  assetTag: string;
  condition: string | null;
  assignedDate: string;
  serialNumber: string;
  locationName: string;
}

interface BatchDetails {
  companyName: string;
  companyLogoUrl: string | null;
  employeeName: string | null;
  departmentName: string | null;
  locationName: string | null;
  status: string;
  items: BatchItem[];
}

export default function EmployeeAcknowledgePage() {
  const { token } = useParams() as { token: string };
  const [details, setDetails] = useState<BatchDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signerName, setSignerName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Canvas drawing ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  // Load details
  useEffect(() => {
    async function fetchDetails() {
      try {
        const res = await fetch(`/api/acknowledge/employee/${token}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Invalid or expired acknowledgement link");
        }
        const data = await res.json();
        setDetails(data);
        if (data.employeeName) {
          setSignerName(data.employeeName);
        }
      } catch (err: any) {
        setError(err.message || "Invalid or expired acknowledgement link");
      } finally {
        setLoading(false);
      }
    }
    if (token) {
      fetchDetails();
    }
  }, [token]);

  // Set up canvas event listeners for mouse and touch
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set styling for drawing line
    ctx.strokeStyle = "#1e293b"; // Dark slate
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const getCoordinates = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      if ("touches" in e) {
        if (e.touches.length === 0) return { x: 0, y: 0 };
        return {
          x: (e.touches[0].clientX - rect.left) * scaleX,
          y: (e.touches[0].clientY - rect.top) * scaleY,
        };
      } else {
        return {
          x: (e.clientX - rect.left) * scaleX,
          y: (e.clientY - rect.top) * scaleY,
        };
      }
    };

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const coords = getCoordinates(e);
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      isDrawingRef.current = true;
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      const coords = getCoordinates(e);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    };

    const stopDrawing = () => {
      isDrawingRef.current = false;
    };

    // Mouse events
    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDrawing);
    canvas.addEventListener("mouseleave", stopDrawing);

    // Touch events for mobile/tablet
    canvas.addEventListener("touchstart", startDrawing, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    canvas.addEventListener("touchend", stopDrawing);

    return () => {
      canvas.removeEventListener("mousedown", startDrawing);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", stopDrawing);
      canvas.removeEventListener("mouseleave", stopDrawing);
      canvas.removeEventListener("touchstart", startDrawing);
      canvas.removeEventListener("touchmove", draw);
      canvas.removeEventListener("touchend", stopDrawing);
    };
  }, [details]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const isCanvasEmpty = () => {
    const canvas = canvasRef.current;
    if (!canvas) return true;
    const ctx = canvas.getContext("2d");
    if (!ctx) return true;

    const buffer = new Uint32Array(
      ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer
    );
    return !buffer.some((color) => color !== 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details) return;

    if (!signerName.trim()) {
      alert("Please enter your full name.");
      return;
    }

    if (!termsAccepted) {
      alert("You must accept the terms to acknowledge receipt.");
      return;
    }

    if (isCanvasEmpty()) {
      alert("Please sign in the signature pad.");
      return;
    }

    setSubmitting(true);

    try {
      const canvas = canvasRef.current;
      const signatureDataUrl = canvas ? canvas.toDataURL("image/png") : "";

      const res = await fetch(`/api/acknowledge/employee/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signerName,
          termsAccepted,
          signatureDataUrl,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to submit batch acknowledgement.");
      }

      setSuccess(true);
    } catch (err: any) {
      alert(err.message || "An error occurred while submitting.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 dark:bg-slate-900">
        <Loader2 className="h-10 w-10 animate-spin text-slate-600 dark:text-slate-400" />
        <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-400">
          Loading batch details...
        </p>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 dark:bg-slate-900">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-slate-100 dark:bg-slate-800 dark:border-slate-700 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
          <h2 className="mt-4 text-xl font-semibold text-slate-855 dark:text-white">
            Link Invalid or Expired
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {error || "This combined handover link is no longer valid. It may have expired or been completed."}
          </p>
          <div className="mt-6 text-xs text-slate-400">
            Please contact your system administrator to generate a new handover link.
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 dark:bg-slate-900">
        <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-xl border border-slate-100 dark:bg-slate-800 dark:border-slate-700 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
          <h2 className="mt-4 text-2xl font-bold text-slate-855 dark:text-white">
            Handover Acknowledged
          </h2>
          <p className="mt-2 text-sm text-slate-650 dark:text-slate-400">
            Thank you, <strong>{signerName}</strong>. You have successfully confirmed receipt of the assigned assets.
          </p>
          <div className="mt-6 rounded-lg bg-emerald-50/50 p-4 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/50 text-left">
            <h4 className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 uppercase tracking-wide">
              Assets Confirmed ({details.items.length})
            </h4>
            <ul className="mt-2 text-sm text-slate-700 dark:text-slate-350 space-y-1">
              {details.items.map((item, idx) => (
                <li key={idx}>• <strong>{item.assetName}</strong> (Tag: {item.assetTag})</li>
              ))}
            </ul>
          </div>
          <p className="mt-6 text-xs text-slate-400 dark:text-slate-500">
            You may now close this browser window safely.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-8">
          {details.companyLogoUrl ? (
            <img
              src={details.companyLogoUrl}
              alt={details.companyName}
              className="mx-auto h-12 object-contain"
            />
          ) : (
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white font-bold text-lg dark:bg-white dark:text-slate-900">
              {details.companyName ? details.companyName.charAt(0) : "A"}
            </div>
          )}
          <h2 className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            Combined Asset Handover sign-off
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {details.companyName}
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
          <div className="bg-slate-900 py-6 px-6 text-white dark:bg-slate-800 flex items-center gap-2">
            <Layers className="h-5 w-5 text-violet-400" />
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                Assignee Details
              </span>
              <h3 className="text-lg font-bold">{details.employeeName || details.departmentName}</h3>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
              {details.departmentName && (
                <div>
                  <span className="block text-xs font-medium text-slate-400 dark:text-slate-500">
                    Department
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {details.departmentName}
                  </span>
                </div>
              )}
              {details.locationName && (
                <div>
                  <span className="block text-xs font-medium text-slate-400 dark:text-slate-500">
                    Location
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {details.locationName}
                  </span>
                </div>
              )}
            </div>

            {/* Assets Table */}
            <div className="mb-6">
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Assigned Assets in Handover ({details.items.length})
              </span>
              <div className="overflow-x-auto rounded-xl border border-slate-150 dark:border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-500 font-bold uppercase">
                      <th className="py-2.5 px-3">Asset Name</th>
                      <th className="py-2.5 px-3">Tag ID</th>
                      <th className="py-2.5 px-3">Serial Number</th>
                      <th className="py-2.5 px-3">Location</th>
                      <th className="py-2.5 px-3 text-right">Assigned Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
                        <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">{item.assetName}</td>
                        <td className="py-3 px-3 font-mono text-[11px]">{item.assetTag}</td>
                        <td className="py-3 px-3 font-mono text-[11px]">{item.serialNumber || "—"}</td>
                        <td className="py-3 px-3 text-slate-700 dark:text-slate-350">{item.locationName || "—"}</td>
                        <td className="py-3 px-3 text-right text-slate-500">
                          {new Date(item.assignedDate).toLocaleDateString(undefined, { dateStyle: "medium" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="signer-name"
                  className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
                >
                  Confirm Your Full Name
                </label>
                <input
                  type="text"
                  id="signer-name"
                  required
                  placeholder="Enter your name as it appears in records"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="mt-2 block w-full rounded-lg border border-slate-300 bg-white py-2.5 px-3.5 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="flex items-start">
                <div className="flex h-5 items-center">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500 dark:border-slate-750 dark:bg-slate-950"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="terms" className="font-medium text-slate-700 dark:text-slate-300">
                    I confirm that I have received the assets listed above in good condition and accept
                    responsibility for their safe use and return as per company policies.
                  </label>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <PenTool className="h-4 w-4" /> Draw Your Signature
                  </label>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center gap-1"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Clear Pad
                  </button>
                </div>

                <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={200}
                    className="w-full h-[180px] bg-white rounded-lg cursor-crosshair border border-slate-100 dark:bg-white touch-none"
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                  Use your mouse, trackpad, or touchscreen to sign inside the white box.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex justify-center items-center rounded-lg bg-slate-900 py-3 px-4 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 dark:bg-white dark:text-slate-950 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing & Uploading Handover...
                  </>
                ) : (
                  "Submit Handover Sign-off"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
