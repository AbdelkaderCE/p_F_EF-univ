import React, { useState } from 'react';
import TeacherAssignmentWorkflow from '../../components/admin/TeacherAssignmentWorkflow';
import StudentAssignmentManager from '../../components/admin/StudentAssignmentManager';
import { Users, BookOpen, Layers } from 'lucide-react';

const Groups = () => {
  const [activeTab, setActiveTab] = useState('assign-teacher');
  const [selectedGroup, setSelectedGroup] = useState(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3 mb-2">
            <Layers className="w-10 h-10 text-purple-600" />
            PFE Group Management
          </h1>
          <p className="text-gray-600">
            Manage PFE groups, assign teachers and students, and organize group structure.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('assign-teacher')}
            className={`px-6 py-3 font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'assign-teacher'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            Assign Teacher
          </button>
          <button
            onClick={() => setActiveTab('assign-students')}
            className={`px-6 py-3 font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'assign-students'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-5 h-5" />
            Assign Students
          </button>
        </div>

        {/* Tab Content */}
        <div className="mb-8">
          {activeTab === 'assign-teacher' && (
            <TeacherAssignmentWorkflow onComplete={setSelectedGroup} />
          )}

          {activeTab === 'assign-students' && (
            <StudentAssignmentManager
              groupId={selectedGroup?.id}
            />
          )}
        </div>

        {/* Info Box */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 max-w-7xl mx-auto">
          <h3 className="font-bold text-purple-900 mb-3">📚 Group Management Workflow</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-purple-800">
            <div>
              <p className="font-semibold mb-1">Step 1: Assign Teacher</p>
              <p>Select a teacher, subject, and group to establish the teaching assignment.</p>
            </div>
            <div>
              <p className="font-semibold mb-1">Step 2: View Students</p>
              <p>Once assigned, the system automatically displays all registered students in that group.</p>
            </div>
            <div>
              <p className="font-semibold mb-1">Step 3: Manage Members</p>
              <p>Search, add, remove, or promote students within the group efficiently.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Groups;
