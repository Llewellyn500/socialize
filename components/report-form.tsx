"use client";

import { FormEvent, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { FiAlertCircle, FiCheck } from "react-icons/fi";
import { CustomSelect } from "@/components/ui/custom-select";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import styles from "@/components/service-content.module.css";

const reasons = [
  "Impersonation or deceptive identity",
  "Phishing, malware, or unsafe link",
  "Harassment, threats, or private information",
  "Intellectual-property concern",
  "Another policy concern",
];

const reasonOptions = reasons.map((item) => ({ value: item, label: item }));

export function ReportForm({ handle, fallbackEmail }: { handle: string; fallbackEmail: string }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<{ tone: "error" | "success"; message: string } | null>(null);

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    if (website) return;
    if (!reason || details.trim().length < 20) {
      setStatus({ tone: "error", message: "Choose a reason and add at least 20 characters of specific context." });
      return;
    }
    if (!db || !isFirebaseConfigured) {
      setStatus({ tone: "error", message: "The report endpoint is not configured on this deployment. Use the safety email below." });
      return;
    }

    setPending(true);
    try {
      await addDoc(collection(db, "reports"), {
        handle,
        reason,
        details: details.trim(),
        contactEmail: contactEmail.trim() || null,
        createdAt: serverTimestamp(),
        status: "new",
      });
      setReason("");
      setDetails("");
      setContactEmail("");
      setStatus({ tone: "success", message: "Report received. Keep a copy of the profile URL for your records." });
    } catch {
      setStatus({ tone: "error", message: "The report could not be submitted. Use the safety email below instead." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.reportForm} onSubmit={submitReport}>
      <fieldset disabled={pending}>
        <legend>Profile report</legend>
        <div className={styles.reportField}>
          <label htmlFor="reported-profile">Profile</label>
          <input defaultValue={`@${handle}`} id="reported-profile" readOnly type="text" />
        </div>
        <div className={styles.reportField}>
          <label htmlFor="report-reason">Reason</label>
          <CustomSelect
            aria-label="Reason"
            id="report-reason"
            options={reasonOptions}
            placeholder="Select the closest reason"
            required
            value={reason}
            onChange={setReason}
          />
        </div>
        <div className={styles.reportField}>
          <label htmlFor="report-details">Specific content and context</label>
          <textarea id="report-details" maxLength={1000} minLength={20} required rows={7} value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Name the link, text, or image and explain the risk." />
        </div>
        <div className={styles.reportField}>
          <label htmlFor="report-contact">Contact email (optional)</label>
          <input id="report-contact" maxLength={254} placeholder="you@example.com" type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} />
        </div>
        <div aria-hidden="true" style={{ position: "absolute", left: "-10000px" }}>
          <label htmlFor="report-website">Website</label>
          <input id="report-website" tabIndex={-1} value={website} onChange={(event) => setWebsite(event.target.value)} />
        </div>
        <button className={styles.reportSubmit} type="submit">{pending ? "Sending report…" : "Submit report"}</button>
      </fieldset>
      {status ? (
        <p role={status.tone === "error" ? "alert" : "status"} style={{ display: "flex", alignItems: "center", gap: ".55rem", color: status.tone === "error" ? "#a83226" : "#287c3b" }}>
          {status.tone === "error" ? <FiAlertCircle aria-hidden="true" /> : <FiCheck aria-hidden="true" />}
          {status.message} {status.tone === "error" ? <a href={fallbackEmail}>Email safety</a> : null}
        </p>
      ) : null}
    </form>
  );
}
