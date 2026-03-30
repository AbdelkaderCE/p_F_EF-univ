import React, { useState, useEffect } from 'react';
import { Search, Edit2, Trash2, AlertCircle, Loader, CheckCircle, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';

const StaffManagementTable = ({ refreshKey = 0 }) => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

  // Fetch users on component mount or refresh
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('accessToken');
        const response = await axios.get(`${API_BASE_URL}/auth/admin/users`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setUsers(response.data?.data || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load users');
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [refreshKey]);

  // Filter users based on search and role filter
  useEffect(() => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.prenom?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter((user) =>
        user.roles?.includes(roleFilter)
      );
    }

    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [searchTerm, roleFilter, users]);

  // Pagination
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const totalPages = Math.ceil(filteredUsers.length / pageSize);

  // Handle edit mode
  const startEdit = (user) => {
    setEditingUser(user.id);
    setEditForm({
      email: user.email,
      nom: user.nom || '',
      prenom: user.prenom || '',
      sexe: user.sexe || 'M',
      telephone: user.telephone || '',
      roles: user.roles || [],
    });
  };

  // Save edited user
  const saveEdit = async () => {
    try {
      setError('');
      const token = localStorage.getItem('accessToken');

      // Validate role separation
      const hasTeacherRole = editForm.roles.some((r) =>
        ['enseignant', 'directeur_etude', 'chef_specialite', 'president_jury', 'delegue'].includes(r)
      );
      const hasStudentRole = editForm.roles.includes('etudiant');

      if (hasTeacherRole && hasStudentRole) {
        setError('Cannot assign both teacher and student roles to the same user');
        return;
      }

      await axios.put(
        `${API_BASE_URL}/auth/admin/users/${editingUser}/roles`,
        { userId: editingUser, roleNames: editForm.roles },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSuccessMessage('User updated successfully');
      setEditingUser(null);

      // Refresh user list
      const response = await axios.get(`${API_BASE_URL}/auth/admin/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setUsers(response.data?.data || []);

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user');
      console.error('Error updating user:', err);
    }
  };

  // Delete user
  const deleteUser = async (userId) => {
    try {
      setError('');
      const token = localStorage.getItem('accessToken');

      await axios.put(`${API_BASE_URL}/auth/admin/users/${userId}/status`, {
        userId,
        status: 'suspended',
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setSuccessMessage('User suspended successfully');
      setShowDeleteConfirm(null);

      // Update local list
      setUsers(users.map((u) => (u.id === userId ? { ...u, status: 'suspended' } : u)));

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
      console.error('Error deleting user:', err);
    }
  };

  // Get role display name
  const getRoleDisplay = (roleNames) => {
    if (!roleNames || roleNames.length === 0) return 'No roles';
    return roleNames.map((r) => {
      const roleMap = {
        enseignant: 'Teacher',
        etudiant: 'Student',
        admin: 'Admin',
        vice_doyen: 'Vice Doyen',
        directeur_etude: 'Director of Studies',
        chef_specialite: 'Specialty Chief',
        president_jury: 'Jury President',
        delegue: 'Delegate',
      };
      return roleMap[r] || r;
    }).join(', ');
  };

  // Get role badge color
  const getRoleBadgeColor = (roleNames) => {
    if (!roleNames) return 'bg-gray-100 text-gray-700';
    if (roleNames.includes('admin')) return 'bg-red-100 text-red-700';
    if (roleNames.some((r) => ['enseignant', 'directeur_etude'].includes(r))) return 'bg-blue-100 text-blue-700';
    if (roleNames.includes('etudiant')) return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="ml-3 text-gray-600 font-semibold">Loading users...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span className="text-green-700 font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span className="text-red-700 font-semibold">{error}</span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Filters & Search</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by email, name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Roles</option>
            <option value="enseignant">Teacher</option>
            <option value="etudiant">Student</option>
            <option value="admin">Admin</option>
            <option value="vice_doyen">Vice Doyen</option>
          </select>
        </div>

        <div className="text-sm text-gray-600">
          Showing {paginatedUsers.length} of {filteredUsers.length} users
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-semibold">No users found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Role(s)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedUsers.map((user) => {
                    const roleNames = user.roles || [];
                    const isEditing = editingUser === user.id;

                    return (
                      <tr key={user.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                placeholder="First name"
                                value={editForm.prenom}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, prenom: e.target.value })
                                }
                                className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                              />
                              <input
                                type="text"
                                placeholder="Last name"
                                value={editForm.nom}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, nom: e.target.value })
                                }
                                className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                              />
                            </div>
                          ) : (
                            <div className="font-semibold text-gray-900">
                              {user.prenom} {user.nom}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-700">
                          {isEditing ? (
                            <input
                              type="email"
                              value={editForm.email}
                              onChange={(e) =>
                                setEditForm({ ...editForm, email: e.target.value })
                              }
                              className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                            />
                          ) : (
                            user.email
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${getRoleBadgeColor(
                              roleNames
                            )}`}
                          >
                            {getRoleDisplay(roleNames)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-700">
                          {isEditing ? (
                            <input
                              type="tel"
                              value={editForm.telephone}
                              onChange={(e) =>
                                setEditForm({ ...editForm, telephone: e.target.value })
                              }
                              className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                            />
                          ) : (
                            user.telephone || '-'
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={saveEdit}
                                  className="px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded text-sm font-semibold transition"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingUser(null)}
                                  className="px-3 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded text-sm font-semibold transition"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEdit(user)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                                  title="Edit user"
                                >
                                  <Edit2 className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => setShowDeleteConfirm(user.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                                  title="Delete user"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this user? This action cannot be undone.
            </p>
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteUser(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagementTable;
