import { useState } from "react";

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_STUDENTS = [
  { id: "ETU-001", name: "Amira Bensalem", field: "Informatique", level: "L3", status: "under_review", infractions: 3, lastReport: "2025-03-10" },
  { id: "ETU-002", name: "Karim Ouahrani", field: "Mathématiques", level: "M1", status: "warning", infractions: 1, lastReport: "2025-03-08" },
  { id: "ETU-003", name: "Lina Hadj Ali", field: "Physique", level: "L2", status: "closed", infractions: 2, lastReport: "2025-02-20" },
  { id: "ETU-004", name: "Yacine Ferhat", field: "Informatique", level: "M2", status: "heavy_sanction", infractions: 5, lastReport: "2025-03-12" },
  { id: "ETU-005", name: "Sara Mokhtar", field: "Chimie", level: "L1", status: "warning", infractions: 1, lastReport: "2025-03-05" },
  { id: "ETU-006", name: "Mehdi Ziani", field: "Électronique", level: "L3", status: "under_review", infractions: 2, lastReport: "2025-03-11" },
  { id: "ETU-007", name: "Nour El Houda Brahimi", field: "Droit", level: "M1", status: "closed", infractions: 1, lastReport: "2025-01-15" },
  { id: "ETU-008", name: "Riad Boudiaf", field: "Architecture", level: "L2", status: "under_review", infractions: 4, lastReport: "2025-03-09" },
];

const MOCK_MEETINGS = [
  { id: "MTG-001", title: "Conseil disciplinaire", date: "2025-03-14", time: "10:00", location: "Salle C12", students: ["ETU-001", "ETU-006"], participants: ["Prof. Hamidi", "Prof. Kaci", "Dr. Merniz"], status: "scheduled", decision: null },
  { id: "MTG-002", title: "Conseil disciplinaire", date: "2025-03-10", time: "14:00", location: "Visioconférence", students: ["ETU-004"], participants: ["Prof. Hamidi", "Prof. Belkacem"], status: "finalized", decision: "Exclusion temporaire (2 semaines)" },
  { id: "MTG-003", title: "Conseil disciplinaire", date: "2025-02-28", time: "09:00", location: "Salle B5", students: ["ETU-003", "ETU-007"], participants: ["Prof. Hamidi", "Dr. Merniz", "Prof. Kaci"], status: "finalized", decision: "Avertissement écrit" },
  { id: "MTG-004", title: "Conseil disciplinaire", date: "2025-03-18", time: "11:00", location: "Salle A1", students: ["ETU-002", "ETU-005"], participants: ["Prof. Hamidi", "Prof. Kaci"], status: "scheduled", decision: null },
];

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  under_review:   { label: "En examen",        color: "#DC2626", bg: "#FEE2E2", dot: "#DC2626" },
  warning:        { label: "Avertissement",    color: "#D97706", bg: "#FEF3C7", dot: "#D97706" },
  closed:         { label: "Classé",           color: "#2563EB", bg: "#DBEAFE", dot: "#2563EB" },
  heavy_sanction: { label: "Sanction lourde",  color: "#111827", bg: "#F3F4F6", dot: "#111827" },
};

const MEETING_STATUS = {
  scheduled: { label: "Planifié",   color: "#2563EB", bg: "#EFF6FF" },
  finalized:  { label: "Finalisé",   color: "#059669", bg: "#ECFDF5" },
};

// ─── Utility Components ────────────────────────────────────────────────────────
function Badge({ status }) {
  const cfg = STATUS_CONFIG[status] || {};
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      fontSize: 11, fontWeight: 700, letterSpacing: ".03em", whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

function MeetingBadge({ status }) {
  const cfg = MEETING_STATUS[status] || {};
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      fontSize: 11, fontWeight: 700,
    }}>{cfg.label}</span>
  );
}

function Avatar({ name, size = 32 }) {
  const initials = name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  const colors = ["#1D4ED8","#7C3AED","#BE123C","#0F766E","#B45309","#1E40AF"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: color, color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 700, flexShrink: 0,
    }}>{initials}</div>
  );
}

function Button({ children, variant = "primary", onClick, style = {}, disabled = false }) {
  const styles = {
    primary: { background: "#1D4ED8", color: "#fff", border: "none" },
    secondary: { background: "#F1F5F9", color: "#334155", border: "1px solid #E2E8F0" },
    danger: { background: "#DC2626", color: "#fff", border: "none" },
    ghost: { background: "transparent", color: "#64748B", border: "1px solid #E2E8F0" },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "8px 16px", borderRadius: 8,
        fontSize: 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex", alignItems: "center", gap: 6,
        transition: "all .15s", opacity: disabled ? .5 : 1,
        ...styles[variant], ...style,
      }}
    >{children}</button>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 12,
      border: "1px solid #E2E8F0",
      boxShadow: "0 1px 4px rgba(0,0,0,.05)",
      ...style,
    }}>{children}</div>
  );
}

function Input({ placeholder, value, onChange, style = {} }) {
  return (
    <input
      placeholder={placeholder} value={value} onChange={onChange}
      style={{
        padding: "8px 12px", borderRadius: 8, border: "1px solid #E2E8F0",
        fontSize: 13, outline: "none", background: "#F8FAFC",
        width: "100%", ...style,
      }}
    />
  );
}

function Select({ value, onChange, options, style = {} }) {
  return (
    <select
      value={value} onChange={e => onChange(e.target.value)}
      style={{
        padding: "8px 12px", borderRadius: 8, border: "1px solid #E2E8F0",
        fontSize: 13, background: "#F8FAFC", cursor: "pointer", ...style,
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ─── Sidebar Navigation ────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "dashboard", icon: "⊞", label: "Tableau de bord" },
  { id: "students",  icon: "👥", label: "Étudiants" },
  { id: "new-meeting", icon: "＋", label: "Nouveau conseil" },
  { id: "archives",  icon: "🗃", label: "Archives" },
];

function Sidebar({ active, onNav }) {
  return (
    <aside style={{
      width: 220, flexShrink: 0, background: "#0F172A",
      display: "flex", flexDirection: "column",
      minHeight: "100vh", position: "sticky", top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: "24px 20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg,#3B82F6,#1D4ED8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
          }}>⚖</div>
          <div>
            <div style={{ color: "#F8FAFC", fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>Conseil</div>
            <div style={{ color: "#64748B", fontSize: 10, fontWeight: 500 }}>Disciplinaire</div>
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: "#1E293B", margin: "0 16px 16px" }} />

      {/* Nav links */}
      <nav style={{ flex: 1, padding: "0 10px" }}>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => onNav(item.id)}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 8, border: "none",
              background: active === item.id ? "#1D4ED8" : "transparent",
              color: active === item.id ? "#fff" : "#94A3B8",
              fontSize: 13, fontWeight: active === item.id ? 600 : 500,
              cursor: "pointer", marginBottom: 2, textAlign: "left",
              transition: "all .15s",
            }}
          >
            <span style={{ fontSize: 15 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* User */}
      <div style={{ padding: "16px 20px", borderTop: "1px solid #1E293B" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar name="Prof. Hamidi" size={32} />
          <div>
            <div style={{ color: "#F1F5F9", fontSize: 12, fontWeight: 600 }}>Prof. Hamidi</div>
            <div style={{ color: "#475569", fontSize: 10 }}>Président du conseil</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── Screen 2.1: Dashboard ────────────────────────────────────────────────────
function Dashboard({ students, meetings, onNav, onViewMeeting }) {
  const stats = [
    { label: "Sous sanction",        value: students.filter(s => s.status === "under_review" || s.status === "heavy_sanction").length, color: "#DC2626", icon: "⚠" },
    { label: "Réunions en attente",  value: meetings.filter(m => m.status === "scheduled").length, color: "#D97706", icon: "📅" },
    { label: "Dossiers clos/mois",   value: students.filter(s => s.status === "closed").length, color: "#2563EB", icon: "✓" },
    { label: "Réunions cette semaine", value: 2, color: "#7C3AED", icon: "🗓" },
  ];

  const recentMeetings = [...meetings].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", marginBottom: 4 }}>Tableau de bord</h1>
        <p style={{ color: "#64748B", fontSize: 14 }}>Vue d'ensemble du module disciplinaire</p>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
        {stats.map((s, i) => (
          <Card key={i} style={{ padding: "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              </div>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: s.color + "18",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
              }}>{s.icon}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick actions + recent */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 20 }}>
        <Card style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 14 }}>Actions rapides</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Button onClick={() => onNav("new-meeting")} style={{ justifyContent: "center" }}>＋ Nouveau conseil</Button>
            <Button variant="secondary" onClick={() => onNav("students")} style={{ justifyContent: "center" }}>👥 Liste étudiants</Button>
            <Button variant="secondary" onClick={() => onNav("archives")} style={{ justifyContent: "center" }}>🗃 Historique complet</Button>
          </div>
        </Card>

        <Card>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>Réunions récentes</div>
            <Button variant="ghost" onClick={() => onNav("archives")} style={{ fontSize: 12, padding: "4px 10px" }}>Voir tout →</Button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                {["Date","Participants","Étudiants","Statut"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "#94A3B8", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentMeetings.map(m => (
                <tr key={m.id}
                  onClick={() => onViewMeeting(m.id)}
                  style={{ borderTop: "1px solid #F1F5F9", cursor: "pointer", transition: "background .1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding: "12px 16px", fontWeight: 500 }}>{new Date(m.date).toLocaleDateString("fr-FR")}</td>
                  <td style={{ padding: "12px 16px", color: "#64748B" }}>{m.participants.length}</td>
                  <td style={{ padding: "12px 16px", color: "#64748B" }}>{m.students.length}</td>
                  <td style={{ padding: "12px 16px" }}><MeetingBadge status={m.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

// ─── Screen 2.2: Student List ─────────────────────────────────────────────────
function StudentList({ students, onNewMeeting }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");
  const [selected, setSelected] = useState([]);

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const matchQ = s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || s.field.toLowerCase().includes(q);
    const matchS = filterStatus === "all" || s.status === filterStatus;
    const matchL = filterLevel === "all" || s.level === filterLevel;
    return matchQ && matchS && matchL;
  });

  const toggleSelect = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setSelected(selected.length === filtered.length ? [] : filtered.map(s => s.id));

  return (
    <div>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", marginBottom: 4 }}>Étudiants</h1>
          <p style={{ color: "#64748B", fontSize: 14 }}>{students.length} étudiants enregistrés</p>
        </div>
      </div>

      {/* Toolbar */}
      {selected.length > 0 && (
        <div style={{
          background: "#1D4ED8", color: "#fff", borderRadius: 10,
          padding: "12px 20px", marginBottom: 16,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{selected.length} étudiant(s) sélectionné(s)</span>
          <Button
            variant="secondary"
            onClick={() => onNewMeeting(selected)}
            style={{ background: "#fff", color: "#1D4ED8", fontSize: 12 }}
          >⚖ Convoquer au conseil disciplinaire</Button>
        </div>
      )}

      {/* Filters */}
      <Card style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Input placeholder="🔍  Rechercher par nom, ID, filière…" value={search} onChange={e => setSearch(e.target.value)} />
          <Select value={filterStatus} onChange={setFilterStatus} style={{ minWidth: 160 }} options={[
            { value: "all", label: "Tous les statuts" },
            { value: "under_review", label: "En examen" },
            { value: "warning", label: "Avertissement" },
            { value: "closed", label: "Classé" },
            { value: "heavy_sanction", label: "Sanction lourde" },
          ]} />
          <Select value={filterLevel} onChange={setFilterLevel} style={{ minWidth: 120 }} options={[
            { value: "all", label: "Tous niveaux" },
            { value: "L1", label: "L1" }, { value: "L2", label: "L2" }, { value: "L3", label: "L3" },
            { value: "M1", label: "M1" }, { value: "M2", label: "M2" },
          ]} />
        </div>
      </Card>

      {/* Table */}
      <Card>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
              <th style={{ padding: "12px 16px", width: 40 }}>
                <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} />
              </th>
              {["ID","Nom","Filière / Niveau","Statut","Infractions","Dernier rapport","Actions"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#94A3B8", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr key={s.id}
                style={{ borderTop: i > 0 ? "1px solid #F1F5F9" : "none", transition: "background .1s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <td style={{ padding: "12px 16px" }}>
                  <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggleSelect(s.id)} />
                </td>
                <td style={{ padding: "12px 16px", color: "#94A3B8", fontSize: 11, fontFamily: "monospace" }}>{s.id}</td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={s.name} size={30} />
                    <span style={{ fontWeight: 600, color: "#0F172A" }}>{s.name}</span>
                  </div>
                </td>
                <td style={{ padding: "12px 16px", color: "#64748B" }}>
                  <span>{s.field}</span>
                  <span style={{ marginLeft: 6, background: "#F1F5F9", borderRadius: 6, padding: "1px 7px", fontSize: 11, fontWeight: 700, color: "#475569" }}>{s.level}</span>
                </td>
                <td style={{ padding: "12px 16px" }}><Badge status={s.status} /></td>
                <td style={{ padding: "12px 16px", textAlign: "center" }}>
                  <span style={{
                    background: s.infractions >= 3 ? "#FEE2E2" : "#F1F5F9",
                    color: s.infractions >= 3 ? "#DC2626" : "#64748B",
                    borderRadius: 20, padding: "2px 10px", fontWeight: 700, fontSize: 12,
                  }}>{s.infractions}</span>
                </td>
                <td style={{ padding: "12px 16px", color: "#94A3B8", fontSize: 12 }}>
                  {new Date(s.lastReport).toLocaleDateString("fr-FR")}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <Button variant="ghost" onClick={() => onNewMeeting([s.id])} style={{ fontSize: 11, padding: "4px 10px" }}>Convoquer</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "#94A3B8" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
            <div style={{ fontSize: 14 }}>Aucun étudiant trouvé</div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Screen 2.3: New Meeting ──────────────────────────────────────────────────
function NewMeeting({ students, preselected = [], onSave }) {
  const [selectedStudents, setSelectedStudents] = useState(
    preselected.map(id => students.find(s => s.id === id)).filter(Boolean)
  );
  const [form, setForm] = useState({
    title: "Conseil disciplinaire",
    date: "", time: "",
    location: "", mode: "in_person",
    agenda: "", president: "Prof. Hamidi",
    members: [], participants: [],
  });
  const [saved, setSaved] = useState(false);

  const ASSEMBLED_COUNCIL = ["Prof. Hamidi", "Prof. Kaci", "Dr. Merniz", "Prof. Belkacem"];

  const removeStudent = (id) => setSelectedStudents(prev => prev.filter(s => s.id !== id));
  const addStudent = (id) => {
    const s = students.find(x => x.id === id);
    if (s && !selectedStudents.find(x => x.id === id)) setSelectedStudents(prev => [...prev, s]);
  };

  const handleSave = () => {
    setSaved(true);
    onSave && onSave({ ...form, students: selectedStudents });
  };

  if (saved) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", marginBottom: 8 }}>Réunion planifiée !</h2>
      <p style={{ color: "#64748B", marginBottom: 24 }}>Les invitations ont été envoyées aux participants.</p>
      <Button onClick={() => setSaved(false)}>Planifier une nouvelle réunion</Button>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", marginBottom: 4 }}>Nouveau conseil disciplinaire</h1>
        <p style={{ color: "#64748B", fontSize: 14 }}>Planifier une réunion et envoyer les convocations</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
        {/* Left: Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Students */}
          <Card style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 12 }}>Étudiants convoqués</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {selectedStudents.map(s => (
                <div key={s.id} style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "5px 10px", borderRadius: 20,
                  background: "#EFF6FF", border: "1px solid #BFDBFE",
                  fontSize: 12, fontWeight: 600, color: "#1D4ED8",
                }}>
                  <Avatar name={s.name} size={20} />
                  {s.name}
                  <button onClick={() => removeStudent(s.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#93C5FD", fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
                </div>
              ))}
              {selectedStudents.length === 0 && <span style={{ color: "#94A3B8", fontSize: 13 }}>Aucun étudiant sélectionné</span>}
            </div>
            <select
              onChange={e => { addStudent(e.target.value); e.target.value = ""; }}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, background: "#F8FAFC", width: "100%" }}
              defaultValue=""
            >
              <option value="" disabled>+ Ajouter un étudiant…</option>
              {students.filter(s => !selectedStudents.find(x => x.id === s.id)).map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
              ))}
            </select>
          </Card>

          {/* Meeting details */}
          <Card style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 12 }}>Détails de la réunion</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>Titre</label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>Mode</label>
                <Select value={form.mode} onChange={v => setForm(f => ({ ...f, mode: v }))} options={[
                  { value: "in_person", label: "Présentiel" },
                  { value: "video", label: "Visioconférence" },
                  { value: "hybrid", label: "Hybride" },
                ]} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>Date</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, background: "#F8FAFC", width: "100%" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>Heure</label>
                <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                  style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, background: "#F8FAFC", width: "100%" }} />
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>Lieu / Lien</label>
                <Input placeholder="Salle, adresse ou lien de visioconférence…" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>Ordre du jour / Motif</label>
              <textarea
                value={form.agenda} onChange={e => setForm(f => ({ ...f, agenda: e.target.value }))}
                placeholder="Décrivez les motifs de la convocation…"
                rows={4}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, background: "#F8FAFC", resize: "vertical", fontFamily: "inherit" }}
              />
            </div>
          </Card>
        </div>

        {/* Right: Assembled Council (fixed) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>Conseil assemblé</div>
            <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 16 }}>La composition du conseil est fixe et définie par l'établissement.</div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>Président</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#F0FDF4", borderRadius: 8, border: "1px solid #BBF7D0" }}>
                <Avatar name={form.president} size={24} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#065F46" }}>{form.president}</span>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>Membres</label>
              {ASSEMBLED_COUNCIL.filter(n => n !== form.president).map(name => (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, background: "#F8FAFC", marginBottom: 6, border: "1px solid #E2E8F0" }}>
                  <Avatar name={name} size={24} />
                  <span style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>{name}</span>
                </div>
              ))}
            </div>
          </Card>

          <Button onClick={handleSave} style={{ width: "100%", justifyContent: "center", padding: "12px 16px", fontSize: 14 }}>
            💾 Enregistrer et envoyer les convocations
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Screen 2.4: Meeting Detail ───────────────────────────────────────────────
function MeetingDetail({ meeting, students, onBack, onFinalize }) {
  const meetingStudents = meeting.students.map(id => students.find(s => s.id === id)).filter(Boolean);
  const [decisions, setDecisions] = useState(
    Object.fromEntries(meetingStudents.map(s => [s.id, { decision: "", justification: "", newStatus: s.status }]))
  );
  const [globalNotes, setGlobalNotes] = useState("");
  const [finalized, setFinalized] = useState(meeting.status === "finalized");

  const DECISION_OPTIONS = [
    { value: "", label: "Choisir une décision…" },
    { value: "Avertissement oral", label: "Avertissement oral" },
    { value: "Avertissement écrit", label: "Avertissement écrit" },
    { value: "Blâme", label: "Blâme" },
    { value: "Exclusion temporaire", label: "Exclusion temporaire" },
    { value: "Exclusion définitive", label: "Exclusion définitive" },
    { value: "Classé sans suite", label: "Classé sans suite" },
  ];

  const handleFinalize = () => {
    setFinalized(true);
    onFinalize && onFinalize(meeting.id, decisions, globalNotes);
  };

  return (
    <div>
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{ border: "none", background: "#F1F5F9", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 13, color: "#64748B" }}>← Retour</button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#0F172A" }}>{meeting.title}</h1>
          <p style={{ color: "#64748B", fontSize: 13 }}>
            {new Date(meeting.date).toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            {" · "}{meeting.time}{" · "}{meeting.location}
          </p>
        </div>
        <div style={{ marginLeft: "auto" }}><MeetingBadge status={finalized ? "finalized" : meeting.status} /></div>
      </div>

      {/* Participants header */}
      <Card style={{ padding: 16, marginBottom: 20, display: "flex", gap: 24 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Participants</div>
          <div style={{ display: "flex", gap: 6 }}>
            {meeting.participants.map(p => (
              <div key={p} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#475569" }}>
                <Avatar name={p} size={24} />{p}
              </div>
            ))}
          </div>
        </div>
        <div style={{ borderLeft: "1px solid #E2E8F0", paddingLeft: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Étudiants concernés</div>
          <div style={{ display: "flex", gap: 8 }}>
            {meetingStudents.map(s => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#0F172A", fontWeight: 500 }}>
                <Avatar name={s.name} size={24} />{s.name}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Per-student decisions */}
      {meetingStudents.map(s => (
        <Card key={s.id} style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid #F1F5F9" }}>
            <Avatar name={s.name} size={36} />
            <div>
              <div style={{ fontWeight: 700, color: "#0F172A", fontSize: 15 }}>{s.name}</div>
              <div style={{ color: "#94A3B8", fontSize: 12 }}>{s.id} · {s.field} {s.level}</div>
            </div>
            <div style={{ marginLeft: "auto" }}><Badge status={s.status} /></div>
          </div>
          <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#92400E" }}>
            ⚠ {s.infractions} infraction(s) enregistrée(s) — Dernier rapport : {new Date(s.lastReport).toLocaleDateString("fr-FR")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>Décision</label>
              <Select
                value={decisions[s.id]?.decision || ""}
                onChange={v => setDecisions(d => ({ ...d, [s.id]: { ...d[s.id], decision: v } }))}
                options={DECISION_OPTIONS}
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>Nouveau statut</label>
              <Select
                value={decisions[s.id]?.newStatus || ""}
                onChange={v => setDecisions(d => ({ ...d, [s.id]: { ...d[s.id], newStatus: v } }))}
                options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))}
                style={{ width: "100%" }}
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>Justification</label>
            <textarea
              value={decisions[s.id]?.justification || ""}
              onChange={e => setDecisions(d => ({ ...d, [s.id]: { ...d[s.id], justification: e.target.value } }))}
              placeholder="Motifs et détails de la décision…"
              rows={3}
              disabled={finalized}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, background: finalized ? "#F8FAFC" : "#fff", resize: "vertical", fontFamily: "inherit" }}
            />
          </div>
        </Card>
      ))}

      {/* Global notes */}
      <Card style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 10 }}>Procès-verbal / Notes globales</div>
        <textarea
          value={globalNotes} onChange={e => setGlobalNotes(e.target.value)}
          placeholder="Résumé des délibérations, observations générales…"
          rows={4} disabled={finalized}
          style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, background: finalized ? "#F8FAFC" : "#fff", resize: "vertical", fontFamily: "inherit" }}
        />
      </Card>

      {!finalized && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button onClick={handleFinalize} style={{ padding: "12px 24px", fontSize: 14 }}>
            ✓ Finaliser et mettre à jour les statuts
          </Button>
        </div>
      )}
      {finalized && (
        <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: "14px 20px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>✅</span>
          <span style={{ fontSize: 13, color: "#065F46", fontWeight: 600 }}>Réunion finalisée — les statuts ont été mis à jour.</span>
        </div>
      )}
    </div>
  );
}

// ─── Screen 2.5: Archives ─────────────────────────────────────────────────────
function Archives({ meetings, students, onViewMeeting }) {
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = meetings.filter(m => {
    const matchS = filterStatus === "all" || m.status === filterStatus;
    const matchQ = search === "" || m.id.toLowerCase().includes(search.toLowerCase()) ||
      m.students.some(id => {
        const s = students.find(x => x.id === id);
        return s && s.name.toLowerCase().includes(search.toLowerCase());
      });
    return matchS && matchQ;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", marginBottom: 4 }}>Archives</h1>
        <p style={{ color: "#64748B", fontSize: 14 }}>Historique complet des conseils disciplinaires</p>
      </div>

      <Card style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <Input placeholder="🔍  Rechercher par ID, étudiant…" value={search} onChange={e => setSearch(e.target.value)} />
          <Select value={filterStatus} onChange={setFilterStatus} style={{ minWidth: 160 }} options={[
            { value: "all", label: "Tous les statuts" },
            { value: "scheduled", label: "Planifié" },
            { value: "finalized", label: "Finalisé" },
          ]} />
        </div>
      </Card>

      <Card>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
              {["Date","ID","Participants","Étudiants concernés","Décision","Statut","Action"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#94A3B8", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((m, i) => {
              const meetingStudents = m.students.map(id => students.find(s => s.id === id)).filter(Boolean);
              return (
                <tr key={m.id}
                  style={{ borderTop: i > 0 ? "1px solid #F1F5F9" : "none", transition: "background .1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding: "14px 16px", fontWeight: 600 }}>{new Date(m.date).toLocaleDateString("fr-FR")}<br /><span style={{ color: "#94A3B8", fontWeight: 400, fontSize: 11 }}>{m.time}</span></td>
                  <td style={{ padding: "14px 16px", fontFamily: "monospace", color: "#94A3B8", fontSize: 11 }}>{m.id}</td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", gap: -4 }}>
                      {m.participants.slice(0, 3).map(p => <Avatar key={p} name={p} size={24} />)}
                      {m.participants.length > 3 && <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#64748B" }}>+{m.participants.length - 3}</div>}
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {meetingStudents.map(s => <span key={s.id} style={{ fontSize: 12, color: "#0F172A" }}>{s.name}</span>)}
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px", maxWidth: 180 }}>
                    {m.decision
                      ? <span style={{ fontSize: 12, color: "#0F172A" }}>{m.decision}</span>
                      : <span style={{ fontSize: 12, color: "#94A3B8" }}>—</span>}
                  </td>
                  <td style={{ padding: "14px 16px" }}><MeetingBadge status={m.status} /></td>
                  <td style={{ padding: "14px 16px" }}>
                    <Button variant="ghost" onClick={() => onViewMeeting(m.id)} style={{ fontSize: 11, padding: "4px 10px" }}>Voir →</Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "#94A3B8" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🗃</div>
            <div style={{ fontSize: 14 }}>Aucune réunion trouvée</div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("dashboard");
  const [students, setStudents] = useState(MOCK_STUDENTS);
  const [meetings, setMeetings] = useState(MOCK_MEETINGS);
  const [viewMeetingId, setViewMeetingId] = useState(null);
  const [newMeetingPreselected, setNewMeetingPreselected] = useState([]);

  const handleNewMeeting = (selectedIds) => {
    setNewMeetingPreselected(selectedIds);
    setScreen("new-meeting");
  };

  const handleViewMeeting = (id) => {
    setViewMeetingId(id);
    setScreen("meeting-detail");
  };

  const handleFinalize = (meetingId, decisions, notes) => {
    setMeetings(prev => prev.map(m =>
      m.id === meetingId
        ? { ...m, status: "finalized", decision: Object.values(decisions).map(d => d.decision).filter(Boolean).join(", ") }
        : m
    ));
    setStudents(prev => prev.map(s => {
      const d = decisions[s.id];
      return d ? { ...s, status: d.newStatus } : s;
    }));
  };

  const currentMeeting = meetings.find(m => m.id === viewMeetingId);

  const renderScreen = () => {
    if (screen === "meeting-detail" && currentMeeting) {
      return <MeetingDetail meeting={currentMeeting} students={students} onBack={() => setScreen("archives")} onFinalize={handleFinalize} />;
    }
    switch (screen) {
      case "dashboard":   return <Dashboard students={students} meetings={meetings} onNav={setScreen} onViewMeeting={handleViewMeeting} />;
      case "students":    return <StudentList students={students} onNewMeeting={handleNewMeeting} />;
      case "new-meeting": return <NewMeeting students={students} preselected={newMeetingPreselected} onSave={() => {}} />;
      case "archives":    return <Archives meetings={meetings} students={students} onViewMeeting={handleViewMeeting} />;
      default:            return null;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <Sidebar active={screen} onNav={setScreen} />
      <main style={{ flex: 1, padding: "32px 36px", overflowY: "auto" }}>
        {renderScreen()}
      </main>
    </div>
  );
}
