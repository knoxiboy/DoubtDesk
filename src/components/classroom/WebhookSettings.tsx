import { useState, useEffect } from "react";
import { Loader2, Plus, Trash2, Send, Webhook } from "lucide-react";
import { toast } from "sonner";

export default function WebhookSettings({ classroomId }: { classroomId: number }) {
    const [webhooks, setWebhooks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [url, setUrl] = useState("");
    const [platform, setPlatform] = useState("discord");
    const [events, setEvents] = useState(['doubt.created', 'doubt.flagged']);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [testingId, setTestingId] = useState<number | null>(null);

    useEffect(() => {
        fetchWebhooks();
    }, [classroomId]);

    const fetchWebhooks = async () => {
        try {
            const res = await fetch(`/api/classrooms/${classroomId}/webhooks`);
            const data = await res.json();
            if (data.success) {
                setWebhooks(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch webhooks:", error);
        } finally {
            setLoading(false);
        }
    };

    const addWebhook = async () => {
        if (!url) return toast.error("URL is required");
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/classrooms/${classroomId}/webhooks`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url, platform, events })
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Webhook added!");
                setWebhooks([...webhooks, data.data]);
                setUrl("");
            } else {
                toast.error(data.error || "Failed to add webhook");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    const testWebhook = async (webhookId: number) => {
        setTestingId(webhookId);
        try {
            const res = await fetch(`/api/classrooms/${classroomId}/webhooks/test`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ webhookId })
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Test event dispatched!");
            } else {
                toast.error(data.error || "Failed to dispatch test");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setTestingId(null);
        }
    };

    return (
        <div className="space-y-4 pt-5 border-t border-slate-200 dark:border-zinc-900 mt-5">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
                <Webhook className="w-4 h-4" /> Webhook Integrations
            </h3>

            {loading ? (
                <div className="flex justify-center p-4">
                    <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                </div>
            ) : (
                <div className="space-y-4">
                    {webhooks.length > 0 ? (
                        <div className="space-y-2">
                            {webhooks.map((wh) => (
                                <div key={wh.id} className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase truncate">
                                            {wh.platform}
                                        </p>
                                        <p className="text-[10px] text-slate-500 truncate">{wh.url}</p>
                                    </div>
                                    <button
                                        onClick={() => testWebhook(wh.id)}
                                        disabled={testingId === wh.id}
                                        className="shrink-0 flex items-center gap-1 px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 dark:hover:bg-purple-500/20 rounded-md text-[10px] font-bold transition-colors disabled:opacity-50"
                                    >
                                        {testingId === wh.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Test
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-500 dark:text-zinc-500">No webhooks configured.</p>
                    )}

                    <div className="space-y-2 bg-white dark:bg-zinc-950 p-3 border border-slate-200 dark:border-zinc-800 rounded-xl">
                        <input
                            type="url"
                            placeholder="Webhook URL (Discord/Slack)"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 px-3 py-2 text-xs outline-none focus:border-purple-500"
                        />
                        <div className="flex gap-2">
                            <select
                                value={platform}
                                onChange={(e) => setPlatform(e.target.value)}
                                className="flex-1 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 px-3 py-2 text-xs outline-none focus:border-purple-500"
                            >
                                <option value="discord">Discord</option>
                                <option value="slack">Slack</option>
                                <option value="custom">Custom</option>
                            </select>
                            <button
                                onClick={addWebhook}
                                disabled={isSubmitting || !url}
                                className="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1"
                            >
                                {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
