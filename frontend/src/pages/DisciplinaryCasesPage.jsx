/*
  Intent: Administrative nerve-center for disciplinary oversight.
          Merges case management with conseil disciplinaire meeting workflow.
          Confidential by nature — the interface whispers, never shouts.
  Access: Teacher / Admin only. Students see StudentDisciplinaryView instead.
  Palette: canvas base, surface cards. Semantic colors for status only.
  Depth: shadow-card + border-edge on cards. No stacked shadows.
  Typography: Inter. Section headings = text-base font-semibold. Body = text-sm.
  Spacing: 4px base. Cards p-6. gap-6 between sections.
*/

import React, { useState, useEffect } from 'react';
import CaseDetailPage from './CaseDetailPage';
import StudentDisciplinaryView from './StudentDisciplinaryView';
import request from '../services/api';
import { useAuth } from '../contexts/AuthContext';

/* ── Inline SVG Icons (stroke 1.5) ─────────────────────────── */

const icons = {
  folder: (p) => (
    <svg {...p} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" />
    </svg>
  ),
  clock: (p) => (
    <svg {...p} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  calendar: (p) => (
    <svg {...p} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  ),
  check: (p) => (
    <svg {...p} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  plus: (p) => (
    <svg {...p} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
  search: (p) => (
    <svg {...p} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  ),
  lock: (p) => (
    <svg {...p} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  ),
  alert: (p) => (
    <svg {...p} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  ),
  users: (p) => (
    <svg {...p} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  ),
  scale: (p) => (
    <svg {...p} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.97Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.97Z" />
    </svg>
  ),
  arrowLeft: (p) => (
    <svg {...p} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
  ),
  archive: (p) => (
    <svg {...p} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
    </svg>
  ),
  download: (p) => (
    <svg {...p} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  ),
  x: (p) => (
    <svg {...p} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  ),
  save: (p) => (
    <svg {...p} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3.75H6.912a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859M12 3v8.25m0 0-3-3m3 3 3-3" />
    </svg>
  ),
};

/* ── Mock Data — Cases ──────────────────────────────────────── */
/* Data fetched from API — see component useEffect */

/* ── Mock Data — Meetings ───────────────────────────────────── */
/* Data fetched from API — see component useEffect */

const STAFF_MEMBERS = [
  'Prof. Hamidi', 'Prof. Kaci', 'Prof. Belkacem',
  'Dr. Merniz', 'Prof. Saadi', 'Dr. Amrani',
];

/* ── Status Configs ─────────────────────────────────────────── */

const CASE_STATUS_CONFIG = {
  pending:    { label: 'Pending Investigation', bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-warning', border: 'border-amber-200 dark:border-amber-800/50', dot: 'bg-warning' },
  hearing:    { label: 'Hearing Scheduled', bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-brand', border: 'border-blue-200 dark:border-blue-800/50', dot: 'bg-brand' },
  sanctioned: { label: 'Sanction Applied', bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-danger', border: 'border-red-200 dark:border-red-800/50', dot: 'bg-danger' },
  closed:     { label: 'Case Closed', bg: 'bg-green-50 dark:bg-green-950/40', text: 'text-success', border: 'border-green-200 dark:border-green-800/50', dot: 'bg-success' },
};

const MEETING_STATUS_CONFIG = {
  scheduled: { label: 'Scheduled', bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-brand', border: 'border-blue-200 dark:border-blue-800/50', dot: 'bg-brand' },
  finalized: { label: 'Finalized', bg: 'bg-green-50 dark:bg-green-950/40', text: 'text-success', border: 'border-green-200 dark:border-green-800/50', dot: 'bg-success' },
};

const VIOLATION_TYPES = ['All', 'Plagiarism', 'Exam Fraud', 'Misconduct'];

/* ── Helpers ────────────────────────────────────────────────── */

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateLong(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function daysSince(dateStr) {
  return Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function normalizeCase(rawCase) {
  if (!rawCase) return null;

  const statusMap = {
    signale: 'pending',
    en_instruction: 'hearing',
    jugement: 'hearing',
    traite: 'closed',
  };

  const etudiant = rawCase.etudiant || {};
  const user = etudiant.user || {};
  const caseId = rawCase.id;
  const normalizedId = typeof caseId === 'string' && caseId.startsWith('CASE-')
    ? caseId
    : `CASE-${caseId}`;
  const dateSignal = rawCase.dateSignal || rawCase.dateReported || rawCase.createdAt || new Date().toISOString();
  const description = rawCase.descriptionSignal || rawCase.description || '';
  const infractionName = rawCase.infraction?.nom || rawCase.violationType || 'Misconduct';

  return {
    ...rawCase,
    rawId: typeof caseId === 'number' ? caseId : undefined,
    studentEtudiantId: etudiant.id || rawCase.studentEtudiantId || null,
    studentUserId: user.id || rawCase.studentUserId || null,
    id: normalizedId,
    status: statusMap[rawCase.status] || rawCase.status || 'pending',
    studentName: rawCase.studentName || [user.prenom, user.nom].filter(Boolean).join(' ').trim() || 'Unknown student',
    studentId: rawCase.studentId || etudiant.matricule || '-',
    department: rawCase.department || '-',
    violationType: infractionName,
    description,
    dateReported: dateSignal,
    dateOfIncident: rawCase.dateOfIncident || dateSignal,
    timeline: Array.isArray(rawCase.timeline) && rawCase.timeline.length > 0
      ? rawCase.timeline
      : [
          {
            event: 'Report Submitted',
            date: dateSignal,
            detail: description || `Case reported for ${infractionName}.`,
            by: rawCase.enseignantSignalantR
              ? [rawCase.enseignantSignalantR.user?.prenom, rawCase.enseignantSignalantR.user?.nom].filter(Boolean).join(' ')
              : 'Teacher',
          },
        ],
    evidenceFiles: Array.isArray(rawCase.evidenceFiles) ? rawCase.evidenceFiles : [],
    decision: rawCase.decision
      ? {
          verdict: rawCase.decision.nom,
          details: rawCase.remarqueDecision || rawCase.decision.description || '',
          date: rawCase.dateDecision || rawCase.updatedAt || rawCase.createdAt || new Date().toISOString(),
          issuedBy: 'Disciplinary council',
        }
      : rawCase.decision || null,
  };
}

function normalizeMeeting(rawMeeting) {
  if (!rawMeeting) return null;

  const meetingId = rawMeeting.id;
  const normalizedId = typeof meetingId === 'string' && meetingId.startsWith('MEET-')
    ? meetingId
    : `MEET-${meetingId}`;

  const participants = Array.isArray(rawMeeting.participants)
    ? rawMeeting.participants
    : Array.isArray(rawMeeting.membres)
      ? rawMeeting.membres.map((m) => [m.enseignant?.user?.prenom, m.enseignant?.user?.nom].filter(Boolean).join(' ').trim()).filter(Boolean)
      : [];

  const caseIds = Array.isArray(rawMeeting.caseIds)
    ? rawMeeting.caseIds
    : Array.isArray(rawMeeting.dossiers)
      ? rawMeeting.dossiers.map((d) => `CASE-${d.id}`)
      : [];

  return {
    ...rawMeeting,
    id: normalizedId,
    date: rawMeeting.date || rawMeeting.dateReunion || new Date().toISOString(),
    time: rawMeeting.time || (rawMeeting.heure ? new Date(rawMeeting.heure).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'),
    location: rawMeeting.location || rawMeeting.lieu || 'TBD',
    status: rawMeeting.status === 'planifie' ? 'scheduled' : rawMeeting.status === 'termine' ? 'finalized' : (rawMeeting.status || 'scheduled'),
    participants,
    caseIds,
  };
}

/* ── Shared Sub-components ──────────────────────────────────── */

function StatusBadge({ status, config }) {
  const cfg = config[status];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function StatCard({ label, value, icon, accent = 'brand' }) {
  const accents = {
    brand:   'bg-blue-50 dark:bg-blue-950/40 text-brand',
    warning: 'bg-amber-50 dark:bg-amber-950/40 text-warning',
    danger:  'bg-red-50 dark:bg-red-950/40 text-danger',
    success: 'bg-green-50 dark:bg-green-950/40 text-success',
  };
  return (
    <div className="bg-surface rounded-lg border border-edge shadow-card p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg ${accents[accent]} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-ink tracking-tight">{value}</p>
        <p className="text-xs text-ink-tertiary mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function Avatar({ name, size = 'w-8 h-8 text-xs' }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <div className={`${size} rounded-full bg-brand-light flex items-center justify-center shrink-0`}>
      <span className="font-bold text-brand">{initials}</span>
    </div>
  );
}

function TeacherQuickReport({
  students,
  form,
  onChange,
  onSubmit,
  submitting,
  error,
  success,
}) {
  return (
    <div className="bg-surface rounded-lg border border-edge shadow-card p-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-ink">Teacher Report</h2>
          <p className="text-sm text-ink-tertiary mt-1">Select one student and write the reason to open a disciplinary case.</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-1">
          <label className="block text-xs font-medium text-ink-secondary mb-1">Student</label>
          <select
            value={form.studentId}
            onChange={(e) => onChange('studentId', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-control-bg border border-control-border rounded-md text-ink focus:ring-2 focus:ring-brand/30 focus:border-brand"
            required
          >
            <option value="">Select student...</option>
            {students.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.fullName} {s.matricule ? `(${s.matricule})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3">
          <label className="block text-xs font-medium text-ink-secondary mb-1">Reason</label>
          <textarea
            value={form.reason}
            onChange={(e) => onChange('reason', e.target.value)}
            rows={3}
            maxLength={2000}
            className="w-full px-3 py-2 text-sm bg-control-bg border border-control-border rounded-md text-ink placeholder:text-ink-muted focus:ring-2 focus:ring-brand/30 focus:border-brand"
            placeholder="Describe what happened..."
            required
          />
        </div>

        <div className="md:col-span-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            {error && <p className="text-xs text-danger">{error}</p>}
            {success && <p className="text-xs text-success">{success}</p>}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-brand rounded-md hover:bg-brand-hover active:bg-brand-dark transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Create Case'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── Tab Definitions ────────────────────────────────────────── */

const TABS = [
  { id: 'cases',       label: 'Cases',       Icon: icons.folder },
  { id: 'meetings',    label: 'Meetings',    Icon: icons.calendar },
  { id: 'new-meeting', label: 'New Meeting', Icon: icons.plus },
];

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function DisciplinaryCasesPage({ role = 'teacher' }) {
  const { user } = useAuth();

  /* Top-level nav */
  const [activeTab, setActiveTab] = useState('cases');
  const [selectedCase, setSelectedCase] = useState(null);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [preselectedCases, setPreselectedCases] = useState([]);

  /* Cases filter state */
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  /* Meetings filter state */
  const [meetingFilterStatus, setMeetingFilterStatus] = useState('all');
  const [meetingSearch, setMeetingSearch] = useState('');

  /* Data from API */
  const [cases, setCases] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [students, setStudents] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportSuccess, setReportSuccess] = useState('');
  const [reportForm, setReportForm] = useState({ studentId: '', reason: '' });

  const currentRoles = Array.isArray(user?.roles) ? user.roles : [];
  const canTeacherReport = role === 'teacher' || currentRoles.includes('enseignant');

  const loadCases = async () => {
    const response = await request('/api/v1/disciplinary/cases');
    const rawCases = Array.isArray(response?.data) ? response.data : [];
    setCases(rawCases.map(normalizeCase).filter(Boolean));
  };

  useEffect(() => {
    (async () => {
      try {
        const [cRes, mRes, sRes] = await Promise.allSettled([
          request('/api/v1/disciplinary/cases'),
          request('/api/v1/disciplinary/meetings'),
          request('/api/v1/disciplinary/students'),
        ]);

        if (cRes.status === 'fulfilled') {
          const rawCases = Array.isArray(cRes.value?.data) ? cRes.value.data : [];
          setCases(rawCases.map(normalizeCase).filter(Boolean));
        }

        if (mRes.status === 'fulfilled') {
          const rawMeetings = Array.isArray(mRes.value?.data) ? mRes.value.data : [];
          setMeetings(rawMeetings.map(normalizeMeeting).filter(Boolean));
        }

        if (sRes.status === 'fulfilled') {
          setStudents(Array.isArray(sRes.value?.data) ? sRes.value.data : []);
        }
      } catch {
        /* endpoints may not exist yet */
      } finally {
        setDataLoading(false);
      }
    })();
  }, []);

  const updateReportForm = (field, value) => {
    setReportForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleTeacherReportSubmit = async (event) => {
    event.preventDefault();
    setReportError('');
    setReportSuccess('');

    const studentId = Number(reportForm.studentId);
    const reason = reportForm.reason.trim();

    if (!studentId || !reason) {
      setReportError('Please select a student and enter the reason.');
      return;
    }

    try {
      setReportSubmitting(true);
      await request('/api/v1/disciplinary/cases', {
        method: 'POST',
        body: JSON.stringify({
          studentId,
          reason,
          titre: 'Teacher disciplinary report',
          typeInfraction: 'Misconduct',
          gravite: 'majeure',
        }),
      });

      await loadCases();
      setReportForm({ studentId: '', reason: '' });
      setReportSuccess('Case created successfully.');
      setActiveTab('cases');
    } catch (error) {
      setReportError(error?.message || 'Failed to create case.');
    } finally {
      setReportSubmitting(false);
    }
  };

  // Students see their own view
  if (role === 'student') return <StudentDisciplinaryView />;

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-4 border-brand/30 border-t-brand rounded-full animate-spin" />
      </div>
    );
  }

  /* Derived data */
  const filteredCases = cases.filter((c) => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (filterType !== 'All' && c.violationType !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return c.studentName.toLowerCase().includes(q) || c.studentId.includes(q) || c.id.toLowerCase().includes(q);
    }
    return true;
  });

  const stats = {
    total: cases.length,
    pending: cases.filter(c => c.status === 'pending').length,
    hearing: cases.filter(c => c.status === 'hearing').length,
    resolved: cases.filter(c => c.status === 'sanctioned' || c.status === 'closed').length,
  };

  const filteredMeetings = meetings
    .filter(m => {
      if (meetingFilterStatus !== 'all' && m.status !== meetingFilterStatus) return false;
      if (meetingSearch) {
        const q = meetingSearch.toLowerCase();
        return m.id.toLowerCase().includes(q) ||
          m.caseIds.some(cid => {
            const cs = cases.find(c => c.id === cid);
            return cs && cs.studentName.toLowerCase().includes(q);
          });
      }
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  /* Navigation */
  const goToNewMeeting = (caseIds = []) => {
    setPreselectedCases(caseIds);
    setActiveTab('new-meeting');
  };

  /* Detail views */
  if (selectedCase) {
    return <CaseDetailPage caseData={selectedCase} onBack={() => setSelectedCase(null)} />;
  }

  if (selectedMeeting) {
    return (
      <MeetingDetailView
        meeting={selectedMeeting}
        cases={cases}
        onBack={() => setSelectedMeeting(null)}
      />
    );
  }

  /* Main view */
  return (
    <div className="space-y-6 min-w-0">

      {/* Confidential banner */}
      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-lg px-4 py-3 flex items-center gap-3">
        {icons.lock({ className: 'w-5 h-5 text-warning shrink-0' })}
        <div>
          <p className="text-sm font-medium text-warning">Restricted Access — Confidential Records</p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
            This module contains sensitive disciplinary data. Access is logged and limited to authorized personnel only.
          </p>
        </div>
      </div>

      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink tracking-tight">Disciplinary Council</h1>
          <p className="mt-1 text-sm text-ink-tertiary">Manage cases, schedule hearings, and record decisions.</p>
        </div>
        <button
          onClick={() => goToNewMeeting()}
          className="px-4 py-2.5 text-sm font-medium text-white bg-brand rounded-md hover:bg-brand-hover active:bg-brand-dark transition-all duration-150 flex items-center gap-2 shadow-sm focus:ring-2 focus:ring-brand/30 focus:ring-offset-2"
        >
          {icons.plus({ className: 'w-4 h-4' })}
          New Meeting
        </button>
      </div>

      {canTeacherReport && (
        <TeacherQuickReport
          students={students}
          form={reportForm}
          onChange={updateReportForm}
          onSubmit={handleTeacherReportSubmit}
          submitting={reportSubmitting}
          error={reportError}
          success={reportSuccess}
        />
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Cases" value={stats.total} accent="brand" icon={icons.folder({ className: 'w-5 h-5' })} />
        <StatCard label="Pending Investigation" value={stats.pending} accent="warning" icon={icons.clock({ className: 'w-5 h-5' })} />
        <StatCard label="Hearing Scheduled" value={stats.hearing} accent="brand" icon={icons.calendar({ className: 'w-5 h-5' })} />
        <StatCard label="Resolved" value={stats.resolved} accent="success" icon={icons.check({ className: 'w-5 h-5' })} />
      </div>

      {/* Tab navigation */}
      <div className="bg-surface-200 dark:bg-surface-300/30 rounded-md p-1 inline-flex">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-all duration-150 flex items-center gap-2 focus:ring-2 focus:ring-brand/30 ${
              activeTab === id
                ? 'bg-brand text-white shadow-sm'
                : 'text-ink-secondary hover:text-ink hover:bg-surface-300/50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'cases' && (
        <CasesTab
          cases={filteredCases}
          allCases={cases}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterType={filterType}
          setFilterType={setFilterType}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSelectCase={setSelectedCase}
          onConvoke={goToNewMeeting}
        />
      )}

      {activeTab === 'meetings' && (
        <MeetingsTab
          meetings={filteredMeetings}
          cases={cases}
          filterStatus={meetingFilterStatus}
          setFilterStatus={setMeetingFilterStatus}
          search={meetingSearch}
          setSearch={setMeetingSearch}
          onViewMeeting={setSelectedMeeting}
        />
      )}

      {activeTab === 'new-meeting' && (
        <NewMeetingTab
          cases={cases}
          preselected={preselectedCases}
          onSave={() => { setPreselectedCases([]); setActiveTab('meetings'); }}
          onCancel={() => { setPreselectedCases([]); setActiveTab('cases'); }}
        />
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   CASES TAB
   ═══════════════════════════════════════════════════════════════ */

function CasesTab({
  cases, allCases,
  filterStatus, setFilterStatus,
  filterType, setFilterType,
  searchQuery, setSearchQuery,
  onSelectCase, onConvoke,
}) {
  return (
    <div className="bg-surface rounded-lg border border-edge shadow-card">

      {/* Filters bar */}
      <div className="px-6 py-4 border-b border-edge-subtle flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Status pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { key: 'all', label: 'All' },
            { key: 'pending', label: 'Pending' },
            { key: 'hearing', label: 'Hearing' },
            { key: 'sanctioned', label: 'Sanctioned' },
            { key: 'closed', label: 'Closed' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-100 focus:ring-2 focus:ring-brand/30 ${
                filterStatus === f.key
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-ink-secondary bg-surface-200 dark:bg-surface-300/30 hover:bg-surface-300 hover:text-ink'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Type + search */}
        <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-3 py-1.5 text-sm bg-control-bg border border-control-border rounded-md text-ink-secondary focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
          >
            {VIOLATION_TYPES.map(t => (
              <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>
            ))}
          </select>

          <div className="relative flex-1 sm:flex-initial">
            {icons.search({ className: 'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted' })}
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full sm:w-56 pl-9 pr-3 py-1.5 text-sm bg-control-bg border border-control-border rounded-md text-ink placeholder:text-ink-muted focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-edge-subtle">
              <th className="px-6 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">Case ID</th>
              <th className="px-6 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">Student</th>
              <th className="px-6 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider hidden md:table-cell">Violation</th>
              <th className="px-6 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider hidden lg:table-cell">Date</th>
              <th className="px-6 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge-subtle">
            {cases.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  {icons.folder({ className: 'w-10 h-10 text-ink-muted mx-auto mb-3' })}
                  <p className="text-sm font-medium text-ink-secondary">No cases found</p>
                  <p className="text-xs text-ink-muted mt-1">Try adjusting your filters or search query.</p>
                </td>
              </tr>
            ) : (
              cases.map(c => {
                const pending = c.status === 'pending';
                const overdue = pending && daysSince(c.dateReported) > 14;

                return (
                  <tr
                    key={c.id}
                    className={`hover:bg-surface-200/50 dark:hover:bg-surface-300/20 transition-colors duration-100 cursor-pointer ${overdue ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''}`}
                    onClick={() => onSelectCase(c)}
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        {overdue && <span className="w-2 h-2 rounded-full bg-danger animate-pulse shrink-0" title="Overdue" />}
                        <span className="font-mono text-xs font-medium text-ink">{c.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <p className="font-medium text-ink">{c.studentName}</p>
                      <p className="text-xs text-ink-muted mt-0.5">{c.studentId} · {c.department}</p>
                    </td>
                    <td className="px-6 py-3.5 hidden md:table-cell">
                      <span className="text-ink-secondary">{c.violationType}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={c.status} config={CASE_STATUS_CONFIG} />
                      {overdue && (
                        <p className="text-[10px] text-danger font-medium mt-1">
                          {daysSince(c.dateReported)} days pending
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-3.5 hidden lg:table-cell">
                      <span className="text-ink-tertiary text-xs">{formatDate(c.dateOfIncident)}</span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={e => { e.stopPropagation(); onConvoke([c.id]); }}
                          className="px-2.5 py-1 text-xs font-medium text-ink-secondary bg-surface-200 dark:bg-surface-300/30 border border-edge rounded-md hover:bg-surface-300 transition-colors duration-100 focus:ring-2 focus:ring-brand/30"
                          title="Schedule meeting"
                        >
                          {icons.scale({ className: 'w-3.5 h-3.5' })}
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); onSelectCase(c); }}
                          className="px-3 py-1 text-xs font-medium text-brand bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors duration-100 focus:ring-2 focus:ring-brand/30"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-edge-subtle flex items-center justify-between">
        <p className="text-xs text-ink-muted">Showing {cases.length} of {allCases.length} cases</p>
        <div className="flex items-center gap-1">
          <button className="px-2.5 py-1 text-xs font-medium text-ink-tertiary bg-surface-200 dark:bg-surface-300/30 rounded hover:bg-surface-300 transition-colors focus:ring-2 focus:ring-brand/30">Prev</button>
          <button className="px-2.5 py-1 text-xs font-medium text-white bg-brand rounded shadow-sm">1</button>
          <button className="px-2.5 py-1 text-xs font-medium text-ink-tertiary bg-surface-200 dark:bg-surface-300/30 rounded hover:bg-surface-300 transition-colors focus:ring-2 focus:ring-brand/30">Next</button>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   MEETINGS TAB
   ═══════════════════════════════════════════════════════════════ */

function MeetingsTab({ meetings, cases, filterStatus, setFilterStatus, search, setSearch, onViewMeeting }) {
  return (
    <div className="bg-surface rounded-lg border border-edge shadow-card">

      {/* Filters */}
      <div className="px-6 py-4 border-b border-edge-subtle flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-1.5">
          {[
            { key: 'all', label: 'All Meetings' },
            { key: 'scheduled', label: 'Scheduled' },
            { key: 'finalized', label: 'Finalized' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-100 focus:ring-2 focus:ring-brand/30 ${
                filterStatus === f.key
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-ink-secondary bg-surface-200 dark:bg-surface-300/30 hover:bg-surface-300 hover:text-ink'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative sm:ml-auto">
          {icons.search({ className: 'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted' })}
          <input
            type="text"
            placeholder="Search meetings..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-56 pl-9 pr-3 py-1.5 text-sm bg-control-bg border border-control-border rounded-md text-ink placeholder:text-ink-muted focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-edge-subtle">
              <th className="px-6 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider hidden md:table-cell">Participants</th>
              <th className="px-6 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">Related Cases</th>
              <th className="px-6 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider hidden lg:table-cell">Decision</th>
              <th className="px-6 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge-subtle">
            {meetings.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  {icons.archive({ className: 'w-10 h-10 text-ink-muted mx-auto mb-3' })}
                  <p className="text-sm font-medium text-ink-secondary">No meetings found</p>
                  <p className="text-xs text-ink-muted mt-1">Adjust your filters or schedule a new meeting.</p>
                </td>
              </tr>
            ) : (
              meetings.map(m => {
                const relatedCases = m.caseIds.map(cid => cases.find(c => c.id === cid)).filter(Boolean);
                return (
                  <tr
                    key={m.id}
                    className="hover:bg-surface-200/50 dark:hover:bg-surface-300/20 transition-colors duration-100 cursor-pointer"
                    onClick={() => onViewMeeting(m)}
                  >
                    <td className="px-6 py-3.5">
                      <p className="font-medium text-ink text-sm">{formatDate(m.date)}</p>
                      <p className="text-xs text-ink-muted">{m.time} · {m.location}</p>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="font-mono text-xs text-ink-secondary">{m.id}</span>
                    </td>
                    <td className="px-6 py-3.5 hidden md:table-cell">
                      <div className="flex items-center -space-x-1">
                        {m.participants.slice(0, 3).map(p => (
                          <Avatar key={p} name={p} size="w-6 h-6 text-[9px]" />
                        ))}
                        {m.participants.length > 3 && (
                          <div className="w-6 h-6 rounded-full bg-surface-300 flex items-center justify-center text-[9px] font-medium text-ink-tertiary">
                            +{m.participants.length - 3}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex flex-col gap-0.5">
                        {relatedCases.map(rc => (
                          <span key={rc.id} className="text-xs text-ink-secondary">{rc.studentName}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 hidden lg:table-cell max-w-[180px]">
                      {m.decision
                        ? <span className="text-xs text-ink truncate block">{m.decision}</span>
                        : <span className="text-xs text-ink-muted">--</span>
                      }
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={m.status} config={MEETING_STATUS_CONFIG} />
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={e => { e.stopPropagation(); onViewMeeting(m); }}
                        className="px-3 py-1 text-xs font-medium text-brand bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors duration-100 focus:ring-2 focus:ring-brand/30"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   NEW MEETING TAB
   ═══════════════════════════════════════════════════════════════ */

function NewMeetingTab({ cases, preselected = [], onSave, onCancel }) {
  const [selectedCaseIds, setSelectedCaseIds] = useState(preselected);
  const [form, setForm] = useState({
    title: 'Conseil disciplinaire',
    date: '', time: '', location: '', mode: 'in_person', agenda: '',
    president: 'Prof. Hamidi', members: [],
  });
  const [saved, setSaved] = useState(false);

  const selectedCases = selectedCaseIds.map(id => cases.find(c => c.id === id)).filter(Boolean);

  const removeCaseId = (id) => setSelectedCaseIds(prev => prev.filter(x => x !== id));
  const addCaseId = (id) => { if (!selectedCaseIds.includes(id)) setSelectedCaseIds(prev => [...prev, id]); };

  const toggleMember = (name) => setForm(f => ({
    ...f, members: f.members.includes(name) ? f.members.filter(x => x !== name) : [...f.members, name],
  }));

  const handleSave = () => { setSaved(true); setTimeout(() => onSave(), 1500); };

  /* Success state */
  if (saved) {
    return (
      <div className="bg-surface rounded-lg border border-edge shadow-card p-12 text-center">
        {icons.check({ className: 'w-16 h-16 text-success mx-auto mb-4' })}
        <h2 className="text-xl font-bold text-ink mb-2">Meeting Scheduled</h2>
        <p className="text-sm text-ink-secondary">Invitations will be sent to all participants.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Left column — 2/3 */}
      <div className="lg:col-span-2 space-y-6">

        {/* Related cases */}
        <div className="bg-surface rounded-lg border border-edge shadow-card p-6">
          <h3 className="text-base font-semibold text-ink mb-4">Related Cases</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedCases.map(c => (
              <div key={c.id} className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 rounded-md text-xs font-medium text-brand">
                <Avatar name={c.studentName} size="w-5 h-5 text-[8px]" />
                {c.studentName}
                <button
                  onClick={() => removeCaseId(c.id)}
                  className="text-brand/50 hover:text-brand transition-colors"
                >
                  {icons.x({ className: 'w-3 h-3' })}
                </button>
              </div>
            ))}
            {selectedCases.length === 0 && (
              <span className="text-xs text-ink-muted">No cases selected yet.</span>
            )}
          </div>
          <select
            onChange={e => { addCaseId(e.target.value); e.target.value = ''; }}
            defaultValue=""
            className="w-full px-3 py-2.5 text-sm bg-control-bg border border-control-border rounded-md text-ink focus:ring-2 focus:ring-brand/30 focus:border-brand"
          >
            <option value="" disabled>+ Add a case...</option>
            {cases.filter(c => !selectedCaseIds.includes(c.id)).map(c => (
              <option key={c.id} value={c.id}>{c.studentName} ({c.id})</option>
            ))}
          </select>
        </div>

        {/* Meeting details */}
        <div className="bg-surface rounded-lg border border-edge shadow-card p-6">
          <h3 className="text-base font-semibold text-ink mb-4">Meeting Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1">Title</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm bg-control-bg border border-control-border rounded-md text-ink focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1">Mode</label>
              <select
                value={form.mode}
                onChange={e => setForm(f => ({ ...f, mode: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm bg-control-bg border border-control-border rounded-md text-ink focus:ring-2 focus:ring-brand/30 focus:border-brand"
              >
                <option value="in_person">In Person</option>
                <option value="video">Video Conference</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm bg-control-bg border border-control-border rounded-md text-ink focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1">Time</label>
              <input
                type="time"
                value={form.time}
                onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm bg-control-bg border border-control-border rounded-md text-ink focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-ink-secondary mb-1">Location / Link</label>
              <input
                placeholder="Room, address, or video conference link..."
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm bg-control-bg border border-control-border rounded-md text-ink placeholder:text-ink-muted focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1">Agenda / Grounds</label>
            <textarea
              value={form.agenda}
              onChange={e => setForm(f => ({ ...f, agenda: e.target.value }))}
              placeholder="Describe the grounds for the hearing..."
              rows={4}
              className="w-full px-3 py-2.5 text-sm bg-control-bg border border-control-border rounded-md text-ink placeholder:text-ink-muted focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none"
            />
          </div>
        </div>
      </div>

      {/* Right column — 1/3 */}
      <div className="space-y-6">

        {/* Participants */}
        <div className="bg-surface rounded-lg border border-edge shadow-card p-6">
          <h3 className="text-base font-semibold text-ink mb-4">Council Members</h3>

          {/* Chair */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Chair</label>
            <div className="flex items-center gap-3 px-3 py-2.5 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800/50 rounded-md">
              <Avatar name={form.president} size="w-6 h-6 text-[9px]" />
              <span className="text-sm font-medium text-success">{form.president}</span>
            </div>
          </div>

          {/* Members */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Members</label>
            <div className="space-y-1">
              {STAFF_MEMBERS.filter(n => n !== form.president).map(name => (
                <label
                  key={name}
                  className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-surface-200 dark:hover:bg-surface-300/20 transition-colors duration-100 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={form.members.includes(name)}
                    onChange={() => toggleMember(name)}
                    className="rounded border-control-border text-brand focus:ring-brand/30"
                  />
                  <Avatar name={name} size="w-6 h-6 text-[9px]" />
                  <span className="text-sm text-ink">{name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleSave}
            disabled={!form.date || !form.time || selectedCases.length === 0}
            className="w-full px-4 py-2.5 text-sm font-medium text-white bg-brand rounded-md hover:bg-brand-hover active:bg-brand-dark transition-all duration-150 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-brand/30 focus:ring-offset-2"
          >
            {icons.save({ className: 'w-4 h-4' })}
            Save &amp; Send Invitations
          </button>
          <button
            onClick={onCancel}
            className="w-full px-4 py-2.5 text-sm font-medium text-ink-secondary bg-surface border border-edge rounded-md hover:bg-surface-200 transition-colors duration-150 focus:ring-2 focus:ring-brand/30 focus:ring-offset-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   MEETING DETAIL VIEW
   ═══════════════════════════════════════════════════════════════ */

function MeetingDetailView({ meeting, cases, onBack }) {
  const relatedCases = meeting.caseIds.map(cid => cases.find(c => c.id === cid)).filter(Boolean);
  const [decisions, setDecisions] = useState(
    Object.fromEntries(relatedCases.map(c => [c.id, { decision: '', justification: '', newStatus: c.status }]))
  );
  const [globalNotes, setGlobalNotes] = useState('');
  const [finalized, setFinalized] = useState(meeting.status === 'finalized');

  const DECISION_OPTIONS = [
    { value: '', label: 'Choose a decision...' },
    { value: 'Oral Warning', label: 'Oral Warning' },
    { value: 'Written Warning', label: 'Written Warning' },
    { value: 'Reprimand', label: 'Reprimand' },
    { value: 'Temporary Exclusion', label: 'Temporary Exclusion' },
    { value: 'Permanent Exclusion', label: 'Permanent Exclusion' },
    { value: 'Dismissed', label: 'Dismissed (No Action)' },
  ];

  const handleFinalize = () => setFinalized(true);

  return (
    <div className="space-y-6">

      {/* Back + Header */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-medium text-ink-secondary hover:text-ink transition-colors duration-100 mb-4 focus:ring-2 focus:ring-brand/30 rounded"
        >
          {icons.arrowLeft({ className: 'w-4 h-4' })}
          Back to Meetings
        </button>

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-ink tracking-tight">{meeting.title}</h1>
              <StatusBadge status={finalized ? 'finalized' : meeting.status} config={MEETING_STATUS_CONFIG} />
            </div>
            <p className="text-sm text-ink-tertiary">
              {formatDateLong(meeting.date)} · {meeting.time} · {meeting.location}
            </p>
          </div>
        </div>
      </div>

      {/* Participants summary */}
      <div className="bg-surface rounded-lg border border-edge shadow-card p-5 flex flex-col sm:flex-row flex-wrap gap-6">
        <div>
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Participants</p>
          <div className="flex items-center gap-3 flex-wrap">
            {meeting.participants.map(p => (
              <div key={p} className="flex items-center gap-2 text-xs text-ink-secondary">
                <Avatar name={p} size="w-6 h-6 text-[9px]" />
                {p}
              </div>
            ))}
          </div>
        </div>
        <div className="sm:border-l sm:border-edge sm:pl-6">
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Related Cases</p>
          <div className="flex items-center gap-3 flex-wrap">
            {relatedCases.map(c => (
              <div key={c.id} className="flex items-center gap-2 text-xs font-medium text-ink">
                <Avatar name={c.studentName} size="w-6 h-6 text-[9px]" />
                {c.studentName}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Per-case decision cards */}
      {relatedCases.map(c => (
        <div key={c.id} className="bg-surface rounded-lg border border-edge shadow-card">
          {/* Student header */}
          <div className="px-6 py-4 border-b border-edge-subtle flex items-center gap-3">
            <Avatar name={c.studentName} size="w-9 h-9 text-xs" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{c.studentName}</p>
              <p className="text-xs text-ink-muted">{c.studentId} · {c.department} · {c.violationType}</p>
            </div>
            <StatusBadge status={c.status} config={CASE_STATUS_CONFIG} />
          </div>

          {/* Case context */}
          <div className="mx-6 mt-4 mb-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-lg px-4 py-3 flex items-center gap-3">
            {icons.alert({ className: 'w-4 h-4 text-warning shrink-0' })}
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Case {c.id} — {c.description.substring(0, 120)}{c.description.length > 120 ? '...' : ''}
            </p>
          </div>

          {/* Decision form */}
          <div className="px-6 pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1">Decision</label>
                <select
                  value={decisions[c.id]?.decision || ''}
                  onChange={e => setDecisions(d => ({ ...d, [c.id]: { ...d[c.id], decision: e.target.value } }))}
                  disabled={finalized}
                  className="w-full px-3 py-2.5 text-sm bg-control-bg border border-control-border rounded-md text-ink focus:ring-2 focus:ring-brand/30 focus:border-brand disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {DECISION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1">New Status</label>
                <select
                  value={decisions[c.id]?.newStatus || ''}
                  onChange={e => setDecisions(d => ({ ...d, [c.id]: { ...d[c.id], newStatus: e.target.value } }))}
                  disabled={finalized}
                  className="w-full px-3 py-2.5 text-sm bg-control-bg border border-control-border rounded-md text-ink focus:ring-2 focus:ring-brand/30 focus:border-brand disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {Object.entries(CASE_STATUS_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1">Justification</label>
              <textarea
                value={decisions[c.id]?.justification || ''}
                onChange={e => setDecisions(d => ({ ...d, [c.id]: { ...d[c.id], justification: e.target.value } }))}
                placeholder="Grounds and details for the decision..."
                rows={3}
                disabled={finalized}
                className="w-full px-3 py-2.5 text-sm bg-control-bg border border-control-border rounded-md text-ink placeholder:text-ink-muted focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      ))}

      {/* Global notes / minutes */}
      <div className="bg-surface rounded-lg border border-edge shadow-card p-6">
        <h3 className="text-base font-semibold text-ink mb-3">Minutes / Global Notes</h3>
        <textarea
          value={globalNotes}
          onChange={e => setGlobalNotes(e.target.value)}
          placeholder="Summary of deliberations, general observations..."
          rows={4}
          disabled={finalized}
          className="w-full px-3 py-2.5 text-sm bg-control-bg border border-control-border rounded-md text-ink placeholder:text-ink-muted focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none disabled:opacity-60 disabled:cursor-not-allowed"
        />
      </div>

      {/* Finalize */}
      {!finalized && (
        <div className="flex justify-end">
          <button
            onClick={handleFinalize}
            className="px-6 py-2.5 text-sm font-medium text-white bg-brand rounded-md hover:bg-brand-hover active:bg-brand-dark transition-all duration-150 flex items-center gap-2 shadow-sm focus:ring-2 focus:ring-brand/30 focus:ring-offset-2"
          >
            {icons.check({ className: 'w-4 h-4' })}
            Finalize &amp; Update Statuses
          </button>
        </div>
      )}

      {finalized && (
        <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800/50 rounded-lg px-5 py-4 flex items-center gap-3">
          {icons.check({ className: 'w-5 h-5 text-success' })}
          <span className="text-sm font-medium text-success">Meeting finalized — statuses have been updated.</span>
        </div>
      )}
    </div>
  );
}
