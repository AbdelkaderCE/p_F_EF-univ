import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

export default function DashboardCharts({ data }) {
  const { t } = useTranslation();

  const moduleTypesCount = data?.enseignements?.reduce((acc, curr) => {
    const rawType = curr.type?.toUpperCase();
    const type = rawType === 'COURS' || rawType === 'TD' || rawType === 'TP' ? rawType : 'OTHER';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {}) || {};

  const moduleChartData = Object.keys(moduleTypesCount).map(key => ({
    name: key === 'OTHER' ? t('other', { defaultValue: 'Other' }) : key,
    value: moduleTypesCount[key]
  }));

  const pfeStatusCount = data?.pfeSujets?.reduce((acc, curr) => {
    const status = curr.status || 'propose';
    const translatedStatus = t(`tables.status.${status}`);
    acc[translatedStatus] = (acc[translatedStatus] || 0) + 1;
    return acc;
  }, {}) || {};

  const pfeChartData = Object.keys(pfeStatusCount).map(key => ({
    name: key,
    value: pfeStatusCount[key]
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      
      {/* Bar Chart for Modules */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">
          {t('charts.moduleDistribution')}
        </h3>
        <div className="h-64 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
            <BarChart 
              data={moduleChartData} 
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
              <XAxis dataKey="name" tick={{fill: '#64748b'}} axisLine={{stroke: '#cbd5e1'}} />
              <YAxis allowDecimals={false} tick={{fill: '#64748b'}} axisLine={{stroke: '#cbd5e1'}} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                cursor={{fill: '#f1f5f9', className: 'dark:fill-slate-700'}}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie Chart for PFE Stats */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">
          {t('charts.pfeStatus')}
        </h3>
        <div className="h-64 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
            <PieChart>
              <Pie
                data={pfeChartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pfeChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
