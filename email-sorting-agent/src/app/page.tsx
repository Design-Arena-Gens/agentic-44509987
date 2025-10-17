"use client";

import { useMemo, useState } from "react";
import { bulkCategorize, categorizeEmail } from "@/lib/classifier";
import {
  CATEGORY_COLOR_CLASSES,
  CATEGORY_LABELS,
  DEFAULT_CATEGORY_DESCRIPTIONS,
} from "@/lib/categories";
import { SAMPLE_EMAILS } from "@/lib/sampleEmails";
import { CategorizedEmail, EmailCategory, EmailRecord } from "@/lib/types";

type DraftEmail = {
  sender: string;
  subject: string;
  preview: string;
};

const emptyDraft: DraftEmail = {
  sender: "",
  subject: "",
  preview: "",
};

const relativeTime = (iso: string) => {
  const then = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? "s" : ""} ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  const diffWeeks = Math.round(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks} wk${diffWeeks > 1 ? "s" : ""} ago`;
  const diffMonths = Math.round(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} mo${diffMonths > 1 ? "s" : ""} ago`;
  const diffYears = Math.round(diffDays / 365);
  return `${diffYears} yr${diffYears > 1 ? "s" : ""} ago`;
};

const categoryOrder: EmailCategory[] = [
  "important",
  "finance",
  "updates",
  "promotions",
  "social",
  "travel",
  "spam",
  "general",
];

const ScoreStrip = ({ email }: { email: CategorizedEmail }) => {
  const maxScore = Math.max(...email.scoreBreakdown.map((entry) => entry.score), 1);

  return (
    <div className="flex gap-1 items-center" aria-hidden>
      {email.scoreBreakdown.map((entry) => (
        <div
          key={entry.category}
          className={`h-2 rounded-sm flex-1 min-w-[20px] ${CATEGORY_COLOR_CLASSES[entry.category]} border`}
          style={{
            opacity: entry.score === 0 ? 0.2 : 0.4 + (entry.score / maxScore) * 0.6,
          }}
        />
      ))}
    </div>
  );
};

const CategoryBadge = ({ category }: { category: EmailCategory }) => (
  <span
    className={`text-xs font-medium px-3 py-1 rounded-full inline-flex items-center gap-1 ${CATEGORY_COLOR_CLASSES[category]}`}
  >
    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
    {CATEGORY_LABELS[category]}
  </span>
);

const EmailRow = ({
  email,
  onSelect,
  isActive,
}: {
  email: CategorizedEmail;
  onSelect: (email: CategorizedEmail) => void;
  isActive: boolean;
}) => (
  <button
    onClick={() => onSelect(email)}
    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
      isActive ? "border-black/40 bg-black/5" : "border-black/10 hover:border-black/20"
    }`}
  >
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-black/80 truncate">{email.subject}</span>
        <span className="text-xs text-black/50 truncate">{email.sender}</span>
      </div>
      <CategoryBadge category={email.category} />
    </div>
    <p className="text-sm text-black/60 line-clamp-2 mt-2">{email.preview}</p>
    <div className="mt-3">
      <ScoreStrip email={email} />
    </div>
  </button>
);

const EmailDetail = ({ email }: { email: CategorizedEmail | null }) => {
  if (!email) {
    return (
      <div className="rounded-xl border border-dashed border-black/20 p-6 text-center text-black/40">
        Select an email to inspect the classification breakdown.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-black/10 p-6 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-black/85">{email.subject}</h3>
          <p className="text-sm text-black/50">
            {email.sender} • {relativeTime(email.receivedAt)}
          </p>
        </div>
        <CategoryBadge category={email.category} />
      </div>

      <p className="mt-4 text-sm leading-6 text-black/70 whitespace-pre-line">{email.preview}</p>

      <div className="mt-6">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-black/50">
          Classification rationale
        </h4>
        <ul className="mt-2 space-y-1 text-sm text-black/70 list-disc list-inside">
          {email.reasons.map((reason, idx) => (
            <li key={idx}>{reason}</li>
          ))}
        </ul>
      </div>

      <div className="mt-6">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-black/50">
          Confidence distribution
        </h4>
        <div className="mt-3 space-y-2">
          {email.scoreBreakdown.map((entry) => (
            <div key={entry.category}>
              <div className="flex justify-between text-xs text-black/50">
                <span>{CATEGORY_LABELS[entry.category]}</span>
                <span>{entry.score}</span>
              </div>
              <div className="h-2 bg-black/5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${CATEGORY_COLOR_CLASSES[entry.category]} border-0`}
                  style={{
                    width: `${Math.min(entry.score * 10, 100)}%`,
                    opacity: entry.score === 0 ? 0.2 : 0.9,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  const [draft, setDraft] = useState<DraftEmail>(emptyDraft);
  const [categorizedEmails, setCategorizedEmails] = useState<CategorizedEmail[]>(
    bulkCategorize(SAMPLE_EMAILS)
  );
  const [selectedCategory, setSelectedCategory] = useState<EmailCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<CategorizedEmail | null>(
    categorizedEmails[0] ?? null
  );

  const filteredEmails = useMemo(() => {
    let pool = categorizedEmails;
    if (selectedCategory !== "all") {
      pool = pool.filter((email) => email.category === selectedCategory);
    }

    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      pool = pool.filter(
        (email) =>
          email.subject.toLowerCase().includes(needle) ||
          email.preview.toLowerCase().includes(needle) ||
          email.sender.toLowerCase().includes(needle)
      );
    }

    return pool.sort((a, b) => {
      const indexA = categoryOrder.indexOf(a.category);
      const indexB = categoryOrder.indexOf(b.category);
      if (indexA === indexB) {
        return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
      }
      return indexA - indexB;
    });
  }, [categorizedEmails, selectedCategory, search]);

  const summary = useMemo(() => {
    return categorizedEmails.reduce(
      (acc, email) => {
        acc[email.category] = (acc[email.category] ?? 0) + 1;
        return acc;
      },
      {} as Record<EmailCategory, number>
    );
  }, [categorizedEmails]);

  const categoryButtons: Array<EmailCategory | "all"> = ["all", ...categoryOrder];

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.subject.trim() || !draft.sender.trim() || !draft.preview.trim()) return;

    const newEmail: EmailRecord = {
      id: crypto.randomUUID(),
      sender: draft.sender.trim(),
      subject: draft.subject.trim(),
      preview: draft.preview.trim(),
      receivedAt: new Date().toISOString(),
    };

    const classified = categorizeEmail(newEmail);
    setCategorizedEmails((prev) => [classified, ...prev]);
    setSelectedEmail(classified);
    setDraft(emptyDraft);
  };

  const handleImportSamples = () => {
    const classified = bulkCategorize(SAMPLE_EMAILS);
    setCategorizedEmails(classified);
    setSelectedEmail(classified[0] ?? null);
  };

  const handleClear = () => {
    setCategorizedEmails([]);
    setSelectedEmail(null);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
      const [subject = "", preview = "", sender = "manual@input.local"] = lines;
      setDraft({
        subject,
        preview: preview || subject,
        sender,
      });
    } catch (error) {
      console.error("Clipboard read failed", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50 text-black/90">
      <div className="mx-auto max-w-6xl px-6 py-12 space-y-10">
        <header className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-black/80">Email Sorting Agent</h1>
              <p className="text-sm text-black/50">
                Drop in customer mailboxes, triage instantly, and move on with signal-driven
                categories.
              </p>
            </div>
            <button
              type="button"
              onClick={handleImportSamples}
              className="text-sm font-medium px-4 py-2 rounded-full border border-black/15 hover:border-black/30 transition"
            >
              Load sample inbox
            </button>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            {categoryButtons.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
                  selectedCategory === category
                    ? "border-black/60 bg-black/5"
                    : "border-black/15 hover:border-black/30"
                }`}
              >
                {category === "all" ? "All" : CATEGORY_LABELS[category]}
                {category !== "all" && (
                  <span className="ml-2 text-black/40">
                    {(summary[category as EmailCategory] ?? 0).toString().padStart(2, "0")}
                  </span>
                )}
              </button>
            ))}
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="space-y-6">
            <form
              onSubmit={handleSubmit}
              className="rounded-xl border border-black/10 bg-white p-6 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-black/70 uppercase tracking-wide">
                  Create quick classification
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePaste}
                    className="text-xs font-medium px-3 py-1.5 rounded-full border border-black/15 hover:border-black/30 transition"
                  >
                    Paste clipboard
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-xs text-red-500 font-medium px-3 py-1.5 rounded-full border border-red-100 hover:border-red-300 transition"
                  >
                    Clear inbox
                  </button>
                </div>
              </div>

              <label className="space-y-2 text-sm text-black/60">
                <span>Sender</span>
                <input
                  value={draft.sender}
                  onChange={(event) => setDraft((prev) => ({ ...prev, sender: event.target.value }))}
                  placeholder="alex@company.com"
                  className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm focus:outline-none focus:border-black/40"
                />
              </label>

              <label className="space-y-2 text-sm text-black/60">
                <span>Subject</span>
                <input
                  value={draft.subject}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, subject: event.target.value }))
                  }
                  placeholder="Subject line"
                  className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm focus:outline-none focus:border-black/40"
                />
              </label>

              <label className="space-y-2 text-sm text-black/60">
                <span>Body preview</span>
                <textarea
                  value={draft.preview}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, preview: event.target.value }))
                  }
                  placeholder="First lines of the email"
                  rows={4}
                  className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm focus:outline-none focus:border-black/40 resize-none"
                />
              </label>

              <button
                type="submit"
                className="w-full rounded-lg bg-black text-white text-sm font-medium py-2.5 shadow-sm hover:bg-black/90 transition disabled:opacity-60"
                disabled={!draft.sender || !draft.subject || !draft.preview}
              >
                Classify email
              </button>
            </form>

            <div className="rounded-xl border border-black/10 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-black/60">
                Category intelligence
              </h3>
              <div className="mt-4 grid gap-3">
                {categoryOrder.map((category) => (
                  <div
                    key={category}
                    className="rounded-lg border border-black/10 p-3 flex flex-col gap-1 bg-black/2"
                  >
                    <div className="flex items-center justify-between">
                      <CategoryBadge category={category} />
                      <span className="text-xs text-black/50">
                        {(summary[category] ?? 0).toString().padStart(2, "0")} email
                        {(summary[category] ?? 0) === 1 ? "" : "s"}
                      </span>
                    </div>
                    <p className="text-xs text-black/50">
                      {DEFAULT_CATEGORY_DESCRIPTIONS[category]}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-black/10 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search email subject, body, or sender…"
                  className="flex-1 rounded-lg border border-black/15 bg-white px-3 py-2 text-sm focus:outline-none focus:border-black/40"
                />
                <span className="text-xs text-black/40">
                  {filteredEmails.length} of {categorizedEmails.length}
                </span>
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {filteredEmails.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-black/15 p-6 text-center text-sm text-black/40">
                    Nothing matches this combination. Try relaxing the filters.
                  </div>
                ) : (
                  filteredEmails.map((email) => (
                    <EmailRow
                      key={email.id}
                      email={email}
                      onSelect={setSelectedEmail}
                      isActive={selectedEmail?.id === email.id}
                    />
                  ))
                )}
              </div>
            </div>

            <EmailDetail email={selectedEmail} />
          </div>
        </section>
      </div>
    </div>
  );
}
