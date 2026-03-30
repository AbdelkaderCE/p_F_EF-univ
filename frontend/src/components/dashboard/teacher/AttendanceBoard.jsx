import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import request from '../../../services/api';

function AttendanceRow({ student, enseignementId, selectedDate, onAttendanceMarked }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const history = student?.absences?.history || [];
  const record = history.find(a => {
    const recordDate = new Date(a.date).toISOString().split('T')[0];
    return recordDate === selectedDate;
  });

  const status = record 
    ? (record.present ? 'Present' : (record.justifie ? 'Justified' : 'Unjustified')) 
    : 'None';

  const handleMark = async (present, justifie) => {
    const isUnmarking = (
      (status === 'Present' && present === true) ||
      (status === 'Unjustified' && present === false && justifie === false) ||
      (status === 'Justified' && present === false && justifie === true)
    );

    setLoading(true);
    try {
      await request('/api/dashboard/teacher/students/attendance', {
        method: 'POST',
        body: JSON.stringify({
          etudiantId: parseInt(student.id),
          enseignementId: parseInt(enseignementId),
          date: new Date(selectedDate).toISOString(),
          present,
          justifie,
          unmark: isUnmarking
        })
      });
      if (onAttendanceMarked) onAttendanceMarked();
    } catch (err) {
      console.error("Failed to mark attendance", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <tr className="border-b dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
      <td className="px-6 py-4 font-mono text-sm text-slate-500 whitespace-nowrap">{student.matricule || 'N/A'}</td>
      <td className="px-6 py-4 font-bold text-sm text-slate-800 dark:text-slate-200 whitespace-nowrap">
        {student.nom} {student.prenom}
      </td>
      
      <td className="px-6 py-4">
        {status === 'None' && <span className="text-slate-400 italic text-xs">{t('unmarked')}</span>}
        {status === 'Present' && <span className="text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded">{t('present')}</span>}
        {status === 'Unjustified' && <span className="text-red-600 font-bold text-xs bg-red-50 px-2 py-1 rounded">{t('absent')}</span>}
        {status === 'Justified' && <span className="text-orange-600 font-bold text-xs bg-orange-50 px-2 py-1 rounded">{t('justified')}</span>}
      </td>

      <td className="px-6 py-4 text-right">
        <div className={`inline-flex gap-2 transition-opacity ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
          <button 
            onClick={() => handleMark(true, false)}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all border ${
              status === 'Present' 
                ? 'bg-green-500 text-white border-green-600 shadow-sm' 
                : 'bg-white text-green-700 border-green-200 hover:bg-green-50 dark:bg-slate-800 dark:border-green-900/50'
            }`}
          >
            &#x2714; P
          </button>
          <button 
            onClick={() => handleMark(false, false)}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all border ${
              status === 'Unjustified' 
                ? 'bg-red-500 text-white border-red-600 shadow-sm' 
                : 'bg-white text-red-700 border-red-200 hover:bg-red-50 dark:bg-slate-800 dark:border-red-900/50'
            }`}
          >
            &#x2716; A
          </button>
          <button 
            onClick={() => handleMark(false, true)}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all border ${
              status === 'Justified' 
                ? 'bg-orange-500 text-white border-orange-600 shadow-sm' 
                : 'bg-white text-orange-700 border-orange-200 hover:bg-orange-50 dark:bg-slate-800 dark:border-orange-900/50'
            }`}
          >
            &#x2716; J
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function AttendanceBoard({ students, enseignementId, onDataChange }) {
  const { t } = useTranslation();
  const normalizedStudents = useMemo(() => students || [], [students]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const summary = useMemo(() => {
    return normalizedStudents.reduce((acc, student) => {
      const history = student?.absences?.history || [];
      const record = history.find(a => new Date(a.date).toISOString().split('T')[0] === selectedDate);
      if (record) {
        if (record.present) acc.present++;
        else if (record.justifie) acc.justified++;
        else acc.absent++;
      }
      return acc;
    }, { present: 0, absent: 0, justified: 0 });
  }, [normalizedStudents, selectedDate]);

  if (normalizedStudents.length === 0) {
    return <div className="text-center p-6 text-slate-500 bg-white dark:bg-slate-800 rounded-xl">{t('noStudents')}</div>;
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col h-[700px]">
      
      {/* Header with Date Picker */}
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          {t('dailyTracking')}
        </h3>
        
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('date')}</label>
          <input 
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-shadow"
            required
          />
        </div>
      </div>

      {/* Wrapping the table in a flex-1 robust scrollable container so the footer stays sticky at the bottom */}
      <div className="flex-1 overflow-x-auto overflow-y-auto w-full">
        <table className="w-full text-left">
          <thead className="text-xs uppercase text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10 shadow-sm">
            <tr>
              <th className="px-6 py-3">{t('matricule')}</th>
              <th className="px-6 py-3">{t('studentName')}</th>
              <th className="px-6 py-3">{t('loggedStatus')}</th>
              <th className="px-6 py-3 text-right">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {normalizedStudents.map(student => (
              <AttendanceRow 
                key={student.id} 
                student={student} 
                enseignementId={enseignementId} 
                selectedDate={selectedDate}
                onAttendanceMarked={onDataChange}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Sticky Daily Summary Footer */}
      <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="font-bold text-slate-600 dark:text-slate-300">
            {t('summaryFor')} <span className="text-blue-600 dark:text-blue-400">{selectedDate}</span>
          </span>
          <div className="flex gap-4">
            <div className="flex flex-col items-center p-2 px-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 min-w-[100px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{t('totalPresent')}</span>
              <span className="text-xl font-black text-green-600">{summary.present}</span>
            </div>
            <div className="flex flex-col items-center p-2 px-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 min-w-[100px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{t('totalAbsent')}</span>
              <span className="text-xl font-black text-red-600">{summary.absent}</span>
            </div>
            <div className="flex flex-col items-center p-2 px-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 min-w-[100px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{t('justified')}</span>
              <span className="text-xl font-black text-orange-600">{summary.justified}</span>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}
