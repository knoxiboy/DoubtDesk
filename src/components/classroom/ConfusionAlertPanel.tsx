"use client";

import React, { useEffect, useState, useCallback } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfusionAlert {
    id: string | number;
    topic: string;        
    confidence: number;   
    summary: string;
}

interface ConfusionAlertPanelProps {
    roomId: string;
}

export default function ConfusionAlertPanel({ roomId }: ConfusionAlertPanelProps) {
    const [alert, setAlert] = useState<ConfusionAlert | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    const fetchLatestAlert = useCallback(async () => {
        if (!roomId) return;
        try {
            const response = await fetch(`/api/confusion?roomId=${encodeURIComponent(roomId)}`);
            if (response.ok) {
                const data = await response.json();
                
                if (data) {
                    const standardizedAlert: ConfusionAlert = {
                        id: data.id,
                        topic: data.topic || data.coreConcept || "General Subject Confusion",
                        summary: data.summary || "Multiple students are flagging related technical doubts.",
                        confidence: data.confidence !== undefined 
                            ? Number(data.confidence) 
                            : (data.confidenceScore !== undefined ? Math.round(Number(data.confidenceScore) * 100) : 0)
                    };
                    setAlert(standardizedAlert);
                } else {
                    setAlert(null);
                }
            }
        } catch (error) {
            console.error("Failed to sync structural sync tracking streams:", error);
        }
    }, [roomId]);

    useEffect(() => {
        fetchLatestAlert();

        const syncInterval = setInterval(fetchLatestAlert, 60 * 1000);

        return () => {
            clearInterval(syncInterval);
        };
    }, [fetchLatestAlert]);

    const handleDismiss = async () => {
        if (!alert) return;
        setLoading(true);
        try {
            const response = await fetch(`/api/confusion?id=${alert.id}`, {
                method: "PATCH",
            });

            if (response.ok) {
                setAlert(null);
            }
        } catch (error) {
            console.error("Failed to dismiss tracking data point:", error);
        } finally {
            setLoading(false);
        }
    };

    // ✅ Wrapper DOM mein hamesha rahega taaki Screen Readers dynamic updates (aria-live) track kar sakein
    return (
        <div 
            aria-live="polite" 
            role="alert" 
            aria-atomic="true"
            className="w-full"
        >
            {alert && (
                <div className="w-full bg-amber-50 border-l-4 border-amber-500 p-4 my-3 rounded-r-md shadow-sm transition-all duration-200">
                    <div className="flex items-start justify-between">
                        <div className="flex space-x-3">
                            <div className="flex-shrink-0 mt-0.5">
                                <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-amber-800">
                                    Confusion Spike Detected:{" "}
                                    <span className="underline decoration-wavy decoration-amber-400 font-bold">
                                        {alert.topic}
                                    </span>
                                </h3>
                                <p className="mt-1 text-xs text-amber-700 leading-relaxed">
                                    {alert.summary}
                                </p>
                                <div className="mt-2 flex items-center space-x-2">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-200 text-amber-900">
                                        Confidence: {alert.confidence}%
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="ml-4 flex-shrink-0 flex">
                            <button
                                type="button"
                                disabled={loading}
                                onClick={handleDismiss}
                                className="inline-flex rounded-md p-1.5 text-amber-500 hover:bg-amber-100 hover:text-amber-700 focus:outline-none transition-colors disabled:opacity-40"
                            >
                                <span className="sr-only">Dismiss confusion alert for {alert.topic}</span>
                                <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
