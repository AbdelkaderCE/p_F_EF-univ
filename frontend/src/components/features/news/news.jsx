import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import request, { resolveMediaUrl } from '../../../services/api';

const categories = [
  { name: 'All', value: '' },
  { name: 'Administrative', value: 'Administrative' },
  { name: 'Academic', value: 'Academic' },
  { name: 'Events', value: 'Events' },
  { name: 'Research', value: 'Research' },
  { name: 'Student Life', value: 'Student Life' },
];

const resolveDisplayText = (ar, en, fallback = '') => {
  if (typeof en === 'string' && en.trim()) return en.trim();
  if (typeof ar === 'string' && ar.trim()) return ar.trim();
  return fallback;
};

const getCategoryName = (item) => resolveDisplayText(item?.type?.nom_ar, item?.type?.nom_en, 'General');
const getTitle = (item) => resolveDisplayText(item?.titre_ar, item?.titre_en, 'Untitled announcement');
const getContent = (item) => resolveDisplayText(item?.contenu_ar, item?.contenu_en, '');

export default function News() {
  const { user } = useAuth();
  const isAdmin = useMemo(
    () => Array.isArray(user?.roles) && user.roles.includes('admin'),
    [user]
  );

  const [annonces, setAnnonces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAnnonce, setEditingAnnonce] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [formData, setFormData] = useState({
    titre: '',
    contenu: '',
    typeAnnonce: 'Administrative',
  });

  const fetchAnnonces = async (typeAnnonce = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeAnnonce) {
        params.set('typeAnnonce', typeAnnonce);
      }

      const queryString = params.toString();
      const endpoint = queryString ? `/api/v1/annonces?${queryString}` : '/api/v1/annonces';
      const response = await request(endpoint);
      setAnnonces(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      setAnnonces([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnonces(activeCategory);
  }, [activeCategory]);

  const resetForm = () => {
    setEditingAnnonce(null);
    setSelectedFile(null);
    setFormData({
      titre: '',
      contenu: '',
      typeAnnonce: 'Administrative',
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.titre.trim() || !formData.contenu.trim()) {
      window.alert('Title and content are required.');
      return;
    }

    try {
      if (editingAnnonce) {
        await request(`/api/v1/annonces/${editingAnnonce.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
      } else {
        const payload = new FormData();
        payload.append('titre', formData.titre);
        payload.append('contenu', formData.contenu);
        payload.append('typeAnnonce', formData.typeAnnonce);
        if (selectedFile) {
          payload.append('file', selectedFile);
        }

        await request('/api/v1/annonces', {
          method: 'POST',
          body: payload,
        });
      }

      setShowModal(false);
      resetForm();
      await fetchAnnonces(activeCategory);
    } catch (error) {
      console.error(error);
      window.alert(error?.message || 'Operation failed.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) {
      return;
    }

    try {
      await request(`/api/v1/annonces/${Number(id)}`, { method: 'DELETE' });
      await fetchAnnonces(activeCategory);
    } catch (error) {
      console.error(error);
      window.alert(error?.message || 'Delete failed.');
    }
  };

  const handleEdit = (item) => {
    setEditingAnnonce(item);
    setSelectedFile(null);
    setFormData({
      titre: getTitle(item),
      contenu: getContent(item),
      typeAnnonce: getCategoryName(item),
    });
    setShowModal(true);
  };

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">News & Announcements</h1>
          <p className="mt-1 text-sm text-ink-secondary">Ibn Khaldoun University — Tiaret</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="inline-flex items-center justify-center rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:bg-brand-hover active:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/30 focus:ring-offset-2 focus:ring-offset-canvas"
          >
            + New Announcement
          </button>
        )}
      </div>

      <div className="-mx-1 mb-8 flex gap-2 overflow-x-auto px-1 py-2 sm:mx-0 sm:px-0">
        {categories.map((category) => (
          <button
            key={category.name}
            onClick={() => setActiveCategory(category.value)}
            className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:ring-offset-2 focus:ring-offset-canvas ${
              activeCategory === category.value
                ? 'bg-brand text-white shadow-soft'
                : 'bg-surface-200 text-ink-secondary hover:bg-surface-300 hover:text-ink'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-20 text-center text-sm text-ink-tertiary">Loading...</p>
      ) : annonces.length === 0 ? (
        <p className="py-20 text-center text-sm text-ink-tertiary">No announcements</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {annonces.map((item) => {
            const attachment = item?.documents?.[0];
            const dateValue = item?.datePublication || item?.createdAt;
            const displayDate = dateValue ? new Date(dateValue).toLocaleDateString() : '-';

            return (
              <div key={item.id} className="rounded-lg border border-edge bg-surface p-6 shadow-card transition-all duration-200">
                <div className="flex justify-between gap-3">
                  <span className="text-xs font-medium uppercase tracking-wide text-brand">{getCategoryName(item)}</span>
                  <span className="text-xs text-ink-tertiary">{displayDate}</span>
                </div>

                <h3 className="mt-3 text-base font-semibold text-ink">{getTitle(item)}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-ink-secondary">{getContent(item)}</p>

                {attachment?.fichier && (
                  <div className="mt-3">
                    <a
                      href={resolveMediaUrl(attachment.fichier)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:text-brand-hover"
                    >
                      View attachment
                    </a>
                  </div>
                )}

                <div className="mt-3 text-sm text-ink-tertiary">
                  By {item?.auteur?.prenom || ''} {item?.auteur?.nom || ''}
                </div>

                {isAdmin && (
                  <div className="flex flex-wrap gap-3 mt-4">
                    <button
                      onClick={() => handleEdit(item)}
                      className="inline-flex items-center rounded-md border border-edge bg-surface px-4 py-2.5 text-sm font-medium text-ink-secondary transition-all duration-150 hover:bg-surface-200 hover:text-ink focus:outline-none focus:ring-2 focus:ring-brand/30 focus:ring-offset-2 focus:ring-offset-canvas"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="inline-flex items-center rounded-md bg-danger px-4 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-danger/30 focus:ring-offset-2 focus:ring-offset-canvas"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-xl border border-edge bg-surface p-6 shadow-card">
            <h2 className="mb-4 text-base font-semibold text-ink">
              {editingAnnonce ? 'Edit Announcement' : 'New Announcement'}
            </h2>

            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Title"
                className="mb-3 w-full rounded-md border border-control-border bg-control-bg px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
                value={formData.titre}
                onChange={(event) => setFormData((prev) => ({ ...prev, titre: event.target.value }))}
              />

              <textarea
                placeholder="Content"
                className="mb-3 min-h-[140px] w-full rounded-md border border-control-border bg-control-bg px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
                value={formData.contenu}
                onChange={(event) => setFormData((prev) => ({ ...prev, contenu: event.target.value }))}
              />

              {!editingAnnonce && (
                <div className="mb-6">
                  <label className="mb-2 block text-sm font-medium text-ink-secondary">Attach File (optional)</label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                    className="w-full text-sm text-ink-secondary file:mr-4 file:rounded-md file:border-0 file:bg-brand file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-white hover:file:bg-brand-hover"
                  />
                </div>
              )}

              <select
                className="mb-4 w-full rounded-md border border-control-border bg-control-bg px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
                value={formData.typeAnnonce}
                onChange={(event) => setFormData((prev) => ({ ...prev, typeAnnonce: event.target.value }))}
              >
                {categories.slice(1).map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.name}
                  </option>
                ))}
              </select>

              <div className="flex flex-col gap-3 sm:flex-row mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 rounded-md border border-edge bg-surface px-4 py-2.5 text-sm font-medium text-ink-secondary transition-all duration-150 hover:bg-surface-200 hover:text-ink focus:outline-none focus:ring-2 focus:ring-brand/30 focus:ring-offset-2 focus:ring-offset-canvas"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="flex-1 rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:bg-brand-hover active:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/30 focus:ring-offset-2 focus:ring-offset-canvas"
                >
                  {editingAnnonce ? 'Update' : 'Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
