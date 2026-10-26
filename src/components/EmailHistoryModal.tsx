import React, { useEffect, useState } from 'react';
import {
  X,
  Mail,
  Send,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Project, EmailLog } from '../types';

interface EmailHistoryModalProps {
  project: Project;
  onClose: () => void;
}

export const EmailHistoryModal: React.FC<EmailHistoryModalProps> = ({ project, onClose }) => {
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProjectEmails();
  }, [project.id]);

  const fetchProjectEmails = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`);
      const data = await res.json();
      if (data.project?.emails) {
        setEmails(data.project.emails);
        if (data.project.emails.length > 0) {
          setSelectedEmail(data.project.emails[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch emails', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden my-8 flex flex-col h-[85vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs uppercase font-mono tracking-wider font-bold text-sky-400">
                  Automated Email Communications Hub
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Simulated Nodemailer / SendGrid
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mt-0.5">{project.name}</h2>
              <p className="text-xs text-slate-400">
                Recipient: <strong className="text-slate-200">{project.user.name}</strong> ({project.user.email})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Split: Email List vs Email Render */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar List */}
          <div className="w-80 border-r border-slate-800 overflow-y-auto bg-slate-950/50 p-3 space-y-2 shrink-0">
            <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Dispatched Emails ({emails.length})
            </div>

            {isLoading ? (
              <div className="p-4 text-center text-xs text-slate-500">Loading communications...</div>
            ) : emails.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">No emails dispatched yet.</div>
            ) : (
              emails.map((email) => {
                const isSelected = selectedEmail?.id === email.id;
                return (
                  <div
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-950/50 border-sky-500/50 shadow-md shadow-sky-500/10'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-400 uppercase font-semibold">
                        {email.templateType.replace(/_/g, ' ')}
                      </span>
                      <span>
                        {new Date(email.sentAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-white line-clamp-1">{email.subject}</div>
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>Delivered to {email.recipientEmail}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Email Preview Frame */}
          <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
            {selectedEmail ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="bg-slate-900/80 px-6 py-3.5 border-b border-slate-800 text-xs space-y-1 shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Subject:</span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Dispatched:{' '}
                      {new Date(selectedEmail.sentAt).toLocaleString('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                  <div className="font-bold text-white text-sm">{selectedEmail.subject}</div>
                  <div className="text-slate-400 text-[11px]">
                    To: <span className="text-sky-300">{selectedEmail.recipientName}</span> &lt;
                    {selectedEmail.recipientEmail}&gt;
                  </div>
                </div>

                <div className="flex-1 bg-slate-950 p-4 overflow-y-auto">
                  <div className="max-w-2xl mx-auto rounded-xl overflow-hidden border border-slate-800 shadow-xl bg-slate-900">
                    <iframe
                      title="Email HTML Preview"
                      srcDoc={selectedEmail.contentHtml}
                      className="w-full h-[580px] border-0 bg-[#0f172a]"
                      sandbox="allow-same-origin allow-popups"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
                Select an email from the left sidebar to preview its dispatched contents.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
