import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ProfileHeader from '../../../components/dashboard/teacher/ProfileHeader';
import StatCards from '../../../components/dashboard/teacher/StatCards';
import DashboardCharts from '../../../components/dashboard/teacher/DashboardCharts';
import DataTables from '../../../components/dashboard/teacher/DataTables';
import StudentManagement from '../../../components/dashboard/teacher/StudentManagement';
import request from '../../../services/api';

export default function TeacherDashboard() {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    if (i18n.language === 'ar') {
      document.documentElement.classList.add('font-arabic');
    } else {
      document.documentElement.classList.remove('font-arabic');
    }
  }, [i18n.language]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const result = await request('/api/dashboard/teacher');
        if (result.success) {
          setData(result.data);
        } else {
          throw new Error(result.message);
        }
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-slate-50 dark:bg-slate-900">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-600 dark:text-slate-300 font-medium">{t('loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50 dark:bg-slate-900 px-4">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-2xl shadow-sm border border-red-100 dark:border-red-800/30 max-w-md w-full text-center">
          <svg className="w-12 h-12 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          <h2 className="text-xl font-bold mb-2">{t('error')}</h2>
          <p className="text-sm opacity-80">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 transition-colors rounded-lg font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Profile Header */}
        <ProfileHeader profile={data?.profile} />

        {/* Tab Navigation Menu */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-8 rtl:space-x-reverse mb-6 transition-colors">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-4 text-sm font-bold transition-colors ${
              activeTab === 'overview'
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-500'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {t('overview', { defaultValue: 'Overview' })}
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`pb-4 text-sm font-bold transition-colors ${
              activeTab === 'students'
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-500'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {t('studentManagement')}
          </button>
        </div>

        {activeTab === 'overview' ? (
          <>
            {/* Overview Stats Cards */}
            <StatCards data={data} />

            {/* Interactive Charts */}
            <DashboardCharts data={data} />

            {/* Detailed Data Tables */}
            <DataTables data={data} />
          </>
        ) : (
          <StudentManagement enseignements={data?.enseignements} />
        )}

      </div>
    </div>
  );
}
