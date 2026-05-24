import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Edit3,
  Home,
  Layers,
  LogOut,
  Plus,
  RefreshCcw,
  Save,
  Shield,
  Trash2,
  Users,
  X,
} from 'lucide-react';

const API = 'http://localhost:3000/api';

const emptyMangaForm = {
  title: '',
  author: '',
  status: 'ongoing',
  description: '',
  cover_image: '',
  categoryIds: [],
};

const emptyChapterForm = {
  manga_id: '',
  chapter_number: '',
  title: '',
};

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function getMessage(error, fallback = 'Co loi xay ra') {
  return error?.message || fallback;
}

export default function Admin({ onGoHome, onGoAuth, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboard, setDashboard] = useState(null);
  const [mangas, setMangas] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [selectedMangaId, setSelectedMangaId] = useState('');
  const [mangaForm, setMangaForm] = useState(emptyMangaForm);
  const [chapterForm, setChapterForm] = useState(emptyChapterForm);
  const [editingMangaId, setEditingMangaId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const token = localStorage.getItem('doctruyen_token');
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('doctruyen_user') || 'null');
    } catch {
      return null;
    }
  }, []);

  async function adminFetch(path, options = {}) {
    if (!token) throw new Error('Ban can dang nhap admin');

    const res = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Request that bai');
    return data;
  }

  async function loadAdminData() {
    setLoading(true);
    setError('');
    try {
      const [dashboardData, mangaData, userData, categoryData] = await Promise.all([
        adminFetch('/admin/dashboard'),
        adminFetch('/admin/mangas'),
        adminFetch('/admin/users'),
        adminFetch('/admin/categories'),
      ]);

      setDashboard(dashboardData);
      setMangas(mangaData);
      setUsers(userData);
      setCategories(categoryData);
      if (!selectedMangaId && mangaData[0]) {
        setSelectedMangaId(String(mangaData[0].id));
        setChapterForm(form => ({ ...form, manga_id: String(mangaData[0].id) }));
      }
    } catch (err) {
      setError(getMessage(err, 'Khong tai duoc du lieu admin'));
      if (err.message.includes('token') || err.message.includes('quyen') || err.message.includes('admin')) {
        setTimeout(() => onGoAuth?.(), 700);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadChapters(mangaId) {
    if (!mangaId) {
      setChapters([]);
      return;
    }

    try {
      const data = await adminFetch(`/admin/mangas/${mangaId}/chapters`);
      setChapters(data);
    } catch (err) {
      setError(getMessage(err, 'Khong tai duoc chapter'));
    }
  }

  useEffect(() => {
    loadAdminData();
  }, []);

  useEffect(() => {
    loadChapters(selectedMangaId);
  }, [selectedMangaId]);

  function resetMangaForm() {
    setEditingMangaId(null);
    setMangaForm(emptyMangaForm);
  }

  function startEditManga(manga) {
    setEditingMangaId(manga.id);
    setMangaForm({
      title: manga.title || '',
      author: manga.author || '',
      status: manga.status || 'ongoing',
      description: manga.description || '',
      cover_image: manga.cover_image || '',
      categoryIds: (manga.Categories || []).map(category => category.id),
    });
    setActiveTab('mangas');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function toggleCategory(categoryId) {
    setMangaForm(form => {
      const exists = form.categoryIds.includes(categoryId);
      return {
        ...form,
        categoryIds: exists
          ? form.categoryIds.filter(id => id !== categoryId)
          : [...form.categoryIds, categoryId],
      };
    });
  }

  async function saveManga(event) {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    setError('');

    try {
      const payload = {
        ...mangaForm,
        title: mangaForm.title.trim(),
        author: mangaForm.author.trim(),
        description: mangaForm.description.trim(),
        cover_image: mangaForm.cover_image.trim() || null,
      };

      if (!payload.title) throw new Error('Ten truyen khong duoc de trong');

      if (editingMangaId) {
        await adminFetch(`/admin/mangas/${editingMangaId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setNotice('Da cap nhat truyen');
      } else {
        await adminFetch('/admin/mangas', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setNotice('Da them truyen moi');
      }

      resetMangaForm();
      await loadAdminData();
    } catch (err) {
      setError(getMessage(err, 'Luu truyen that bai'));
    } finally {
      setSaving(false);
    }
  }

  async function deleteManga(mangaId) {
    const ok = window.confirm('Xoa truyen nay? Cac chapter lien quan cung se bi xoa.');
    if (!ok) return;

    setError('');
    setNotice('');
    try {
      await adminFetch(`/admin/mangas/${mangaId}`, { method: 'DELETE' });
      setNotice('Da xoa truyen');
      if (String(mangaId) === selectedMangaId) {
        setSelectedMangaId('');
        setChapters([]);
      }
      await loadAdminData();
    } catch (err) {
      setError(getMessage(err, 'Xoa truyen that bai'));
    }
  }

  async function saveChapter(event) {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    setError('');

    try {
      const payload = {
        manga_id: Number(chapterForm.manga_id),
        chapter_number: Number(chapterForm.chapter_number),
        title: chapterForm.title.trim(),
      };

      if (!payload.manga_id || !payload.chapter_number) {
        throw new Error('Chon truyen va nhap so chapter');
      }

      await adminFetch('/admin/chapters', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setNotice('Da them chapter');
      setChapterForm(form => ({ ...form, chapter_number: '', title: '' }));
      setSelectedMangaId(String(payload.manga_id));
      await loadChapters(payload.manga_id);
      await loadAdminData();
    } catch (err) {
      setError(getMessage(err, 'Them chapter that bai'));
    } finally {
      setSaving(false);
    }
  }

  async function deleteChapter(chapterId) {
    const ok = window.confirm('Xoa chapter nay?');
    if (!ok) return;

    try {
      await adminFetch(`/admin/chapters/${chapterId}`, { method: 'DELETE' });
      setNotice('Da xoa chapter');
      await loadChapters(selectedMangaId);
      await loadAdminData();
    } catch (err) {
      setError(getMessage(err, 'Xoa chapter that bai'));
    }
  }

  async function updateUserRole(userId, roleId) {
    setError('');
    setNotice('');
    try {
      await adminFetch(`/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role_id: roleId }),
      });
      setNotice('Da cap nhat quyen user');
      await loadAdminData();
    } catch (err) {
      setError(getMessage(err, 'Cap nhat quyen that bai'));
    }
  }

  function handleLogout() {
    localStorage.removeItem('doctruyen_token');
    localStorage.removeItem('doctruyen_user');
    onLogout?.();
  }

  const stats = dashboard?.stats || {};

  return (
    <div className="admin-page">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-mark"><Shield size={21} /></span>
          <div>
            <strong>DocTruyen</strong>
            <span>Admin</span>
          </div>
        </div>

        <nav className="admin-nav">
          <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>
            <BarChart3 size={18} /> Tong quan
          </button>
          <button className={activeTab === 'mangas' ? 'active' : ''} onClick={() => setActiveTab('mangas')}>
            <BookOpen size={18} /> Truyen
          </button>
          <button className={activeTab === 'chapters' ? 'active' : ''} onClick={() => setActiveTab('chapters')}>
            <Layers size={18} /> Chapter
          </button>
          <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>
            <Users size={18} /> User
          </button>
        </nav>

        <div className="admin-sidebar-actions">
          <button onClick={onGoHome}><Home size={17} /> Ve trang chu</button>
          <button onClick={handleLogout}><LogOut size={17} /> Dang xuat</button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <p>Quan tri he thong</p>
            <h1>{activeTab === 'overview' ? 'Tong quan' : activeTab === 'mangas' ? 'Quan ly truyen' : activeTab === 'chapters' ? 'Quan ly chapter' : 'Quan ly user'}</h1>
          </div>
          <div className="admin-user-chip">
            <span>{user?.username?.[0]?.toUpperCase() || 'A'}</span>
            <div>
              <strong>{user?.username || 'admin'}</strong>
              <small>{user?.email || 'admin@doctruyen.com'}</small>
            </div>
          </div>
        </header>

        {(notice || error) && (
          <div className={`admin-alert ${error ? 'error' : 'success'}`}>
            <span>{error || notice}</span>
            <button onClick={() => { setNotice(''); setError(''); }} aria-label="Dong thong bao">
              <X size={16} />
            </button>
          </div>
        )}

        {loading ? (
          <section className="admin-empty">Dang tai du lieu...</section>
        ) : (
          <>
            {activeTab === 'overview' && (
              <section className="admin-section">
                <div className="admin-stat-grid">
                  <StatCard icon={<BookOpen />} label="Tong truyen" value={stats.totalMangas || 0} />
                  <StatCard icon={<Layers />} label="Tong chapter" value={stats.totalChapters || 0} />
                  <StatCard icon={<Users />} label="Nguoi dung" value={stats.totalUsers || 0} />
                  <StatCard icon={<BarChart3 />} label="Binh luan" value={stats.totalComments || 0} />
                </div>

                <div className="admin-two-col">
                  <Panel title="Truyen moi">
                    <SimpleList
                      items={dashboard?.latestMangas || []}
                      renderItem={item => (
                        <>
                          <strong>{item.title}</strong>
                          <span>{item.author || 'Chua ro tac gia'} - {item.status === 'ongoing' ? 'Dang ra' : 'Hoan thanh'}</span>
                        </>
                      )}
                    />
                  </Panel>
                  <Panel title="User moi">
                    <SimpleList
                      items={dashboard?.latestUsers || []}
                      renderItem={item => (
                        <>
                          <strong>{item.username}</strong>
                          <span>{item.email} - {item.role_id === 1 ? 'Admin' : 'User'}</span>
                        </>
                      )}
                    />
                  </Panel>
                </div>
              </section>
            )}

            {activeTab === 'mangas' && (
              <section className="admin-section admin-grid-main">
                <Panel title={editingMangaId ? 'Sua truyen' : 'Them truyen'}>
                  <form className="admin-form" onSubmit={saveManga}>
                    <label>
                      Ten truyen
                      <input value={mangaForm.title} onChange={e => setMangaForm({ ...mangaForm, title: e.target.value })} />
                    </label>
                    <label>
                      Tac gia
                      <input value={mangaForm.author} onChange={e => setMangaForm({ ...mangaForm, author: e.target.value })} />
                    </label>
                    <label>
                      Trang thai
                      <select value={mangaForm.status} onChange={e => setMangaForm({ ...mangaForm, status: e.target.value })}>
                        <option value="ongoing">Dang ra</option>
                        <option value="completed">Hoan thanh</option>
                      </select>
                    </label>
                    <label>
                      Anh bia URL
                      <input value={mangaForm.cover_image} onChange={e => setMangaForm({ ...mangaForm, cover_image: e.target.value })} />
                    </label>
                    <label className="wide">
                      Mo ta
                      <textarea rows="4" value={mangaForm.description} onChange={e => setMangaForm({ ...mangaForm, description: e.target.value })} />
                    </label>
                    <div className="wide">
                      <span className="admin-label">The loai</span>
                      <div className="admin-checks">
                        {categories.map(category => (
                          <label key={category.id}>
                            <input
                              type="checkbox"
                              checked={mangaForm.categoryIds.includes(category.id)}
                              onChange={() => toggleCategory(category.id)}
                            />
                            {category.name}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="admin-form-actions wide">
                      <button className="admin-primary" type="submit" disabled={saving}>
                        <Save size={17} /> {saving ? 'Dang luu...' : editingMangaId ? 'Luu thay doi' : 'Them truyen'}
                      </button>
                      {editingMangaId && (
                        <button className="admin-secondary" type="button" onClick={resetMangaForm}>
                          Huy sua
                        </button>
                      )}
                    </div>
                  </form>
                </Panel>

                <Panel title="Danh sach truyen" action={<button className="admin-icon-text" onClick={loadAdminData}><RefreshCcw size={15} /> Tai lai</button>}>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Truyen</th>
                          <th>Tac gia</th>
                          <th>Trang thai</th>
                          <th>Chapter</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {mangas.map(manga => (
                          <tr key={manga.id}>
                            <td><strong>{manga.title}</strong><small>{(manga.Categories || []).map(c => c.name).join(', ') || 'Chua co the loai'}</small></td>
                            <td>{manga.author || '-'}</td>
                            <td><Badge tone={manga.status === 'ongoing' ? 'green' : 'blue'}>{manga.status === 'ongoing' ? 'Dang ra' : 'Hoan thanh'}</Badge></td>
                            <td>{manga.Chapters?.length || 0}</td>
                            <td>
                              <div className="admin-row-actions">
                                <button onClick={() => startEditManga(manga)} aria-label="Sua truyen"><Edit3 size={16} /></button>
                                <button onClick={() => deleteManga(manga.id)} aria-label="Xoa truyen"><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>
              </section>
            )}

            {activeTab === 'chapters' && (
              <section className="admin-section admin-grid-main">
                <Panel title="Them chapter">
                  <form className="admin-form" onSubmit={saveChapter}>
                    <label className="wide">
                      Truyen
                      <select
                        value={chapterForm.manga_id}
                        onChange={e => {
                          setChapterForm({ ...chapterForm, manga_id: e.target.value });
                          setSelectedMangaId(e.target.value);
                        }}
                      >
                        <option value="">Chon truyen</option>
                        {mangas.map(manga => <option key={manga.id} value={manga.id}>{manga.title}</option>)}
                      </select>
                    </label>
                    <label>
                      So chapter
                      <input type="number" step="0.1" value={chapterForm.chapter_number} onChange={e => setChapterForm({ ...chapterForm, chapter_number: e.target.value })} />
                    </label>
                    <label>
                      Tieu de
                      <input value={chapterForm.title} onChange={e => setChapterForm({ ...chapterForm, title: e.target.value })} />
                    </label>
                    <div className="admin-form-actions wide">
                      <button className="admin-primary" type="submit" disabled={saving}>
                        <Plus size={17} /> Them chapter
                      </button>
                    </div>
                  </form>
                </Panel>

                <Panel title="Chapter cua truyen">
                  <div className="admin-select-row">
                    <select value={selectedMangaId} onChange={e => setSelectedMangaId(e.target.value)}>
                      <option value="">Chon truyen</option>
                      {mangas.map(manga => <option key={manga.id} value={manga.id}>{manga.title}</option>)}
                    </select>
                  </div>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Chapter</th>
                          <th>Tieu de</th>
                          <th>Luot xem</th>
                          <th>Ngay tao</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {chapters.map(chapter => (
                          <tr key={chapter.id}>
                            <td>{chapter.chapter_number}</td>
                            <td><strong>{chapter.title || '-'}</strong></td>
                            <td>{chapter.view_count || 0}</td>
                            <td>{formatDate(chapter.created_at)}</td>
                            <td>
                              <div className="admin-row-actions">
                                <button onClick={() => deleteChapter(chapter.id)} aria-label="Xoa chapter"><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {!chapters.length && (
                          <tr><td colSpan="5">Chua co chapter.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Panel>
              </section>
            )}

            {activeTab === 'users' && (
              <section className="admin-section">
                <Panel title="Danh sach user">
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Email</th>
                          <th>Vai tro</th>
                          <th>Ngay tao</th>
                          <th>Doi quyen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(item => (
                          <tr key={item.id}>
                            <td><strong>{item.username}</strong></td>
                            <td>{item.email}</td>
                            <td><Badge tone={item.role_id === 1 ? 'blue' : 'gray'}>{item.role_id === 1 ? 'Admin' : 'User'}</Badge></td>
                            <td>{formatDate(item.created_at)}</td>
                            <td>
                              <select value={item.role_id} onChange={e => updateUserRole(item.id, Number(e.target.value))}>
                                <option value={1}>Admin</option>
                                <option value={2}>User</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="admin-stat">
      <span>{icon}</span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
    </div>
  );
}

function Panel({ title, action, children }) {
  return (
    <section className="admin-panel">
      <div className="admin-panel-head">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function SimpleList({ items, renderItem }) {
  if (!items.length) return <div className="admin-empty compact">Chua co du lieu.</div>;

  return (
    <div className="admin-simple-list">
      {items.map(item => (
        <div key={item.id}>
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
}

function Badge({ tone = 'gray', children }) {
  return <span className={`admin-badge ${tone}`}>{children}</span>;
}
