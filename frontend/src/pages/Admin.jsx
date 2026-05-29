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
  Tag,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import api, { isOk } from '../api/client.js';

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

const emptyCategoryForm = {
  name: '',
  slug: '',
};

function makeSlug(value) {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function getMessage(error, fallback = 'Có lỗi xảy ra') {
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
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const [coverFile, setCoverFile] = useState(null);
  const [coverInputKey, setCoverInputKey] = useState(0);
  const [editingMangaId, setEditingMangaId] = useState(null);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingChapterId, setEditingChapterId] = useState(null);
  const [uploadChapterId, setUploadChapterId] = useState('');
  const [chapterImageFiles, setChapterImageFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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
    if (!token) throw new Error('Bạn cần đăng nhập admin');

    const { body, headers, ...rest } = options;
    const response = await api.request({
      url: path,
      method: options.method || 'GET',
      data: body ? JSON.parse(body) : options.data,
      ...rest,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(headers || {}),
      },
    });

    if (!isOk(response)) throw new Error(response.data?.message || 'Yêu cầu thất bại');
    return response.data;
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
      setError(getMessage(err, 'Không tải được dữ liệu admin'));
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
      setError(getMessage(err, 'Không tải được chương'));
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
    setCoverFile(null);
    setCoverInputKey(key => key + 1);
  }

  function startEditManga(manga) {
    setEditingMangaId(manga.id);
    setCoverFile(null);
    setCoverInputKey(key => key + 1);
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

  function handleCoverFileChange(event) {
    setCoverFile(event.target.files?.[0] || null);
  }

  function resetCategoryForm() {
    setEditingCategoryId(null);
    setCategoryForm(emptyCategoryForm);
  }

  function startEditCategory(category) {
    setEditingCategoryId(category.id);
    setCategoryForm({
      name: category.name || '',
      slug: category.slug || '',
    });
    setActiveTab('categories');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetChapterForm() {
    setEditingChapterId(null);
    setChapterForm(form => ({
      ...emptyChapterForm,
      manga_id: form.manga_id || selectedMangaId,
    }));
  }

  function startEditChapter(chapter) {
    setEditingChapterId(chapter.id);
    setChapterForm({
      manga_id: String(chapter.manga_id || selectedMangaId),
      chapter_number: String(chapter.chapter_number || ''),
      title: chapter.title || '',
    });
    setActiveTab('chapters');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveCategory(event) {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    setError('');

    try {
      const payload = {
        name: categoryForm.name.trim(),
        slug: categoryForm.slug.trim() || makeSlug(categoryForm.name),
      };

      if (!payload.name) throw new Error('Tên thể loại không được để trống');

      if (editingCategoryId) {
        await adminFetch(`/admin/categories/${editingCategoryId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setNotice('Đã cập nhật thể loại');
      } else {
        await adminFetch('/admin/categories', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setNotice('Đã thêm thể loại mới');
      }

      resetCategoryForm();
      await loadAdminData();
    } catch (err) {
      setError(getMessage(err, 'Lưu thể loại thất bại'));
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(categoryId) {
    const ok = window.confirm('Xóa thể loại này? Thể loại sẽ được gỡ khỏi các truyện liên quan.');
    if (!ok) return;

    setError('');
    setNotice('');
    try {
      await adminFetch(`/admin/categories/${categoryId}`, { method: 'DELETE' });
      setNotice('Đã xóa thể loại');
      if (editingCategoryId === categoryId) resetCategoryForm();
      await loadAdminData();
    } catch (err) {
      setError(getMessage(err, 'Xóa thể loại thất bại'));
    }
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

      if (!payload.title) throw new Error('Tên truyện không được để trống');

      let savedData;
      let savedMangaId = editingMangaId;

      if (editingMangaId) {
        savedData = await adminFetch(`/admin/mangas/${editingMangaId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setNotice('Đã cập nhật truyện');
      } else {
        savedData = await adminFetch('/admin/mangas', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        savedMangaId = savedData?.manga?.id;
        setNotice('Đã thêm truyện mới');
      }

      if (coverFile) {
        if (!savedMangaId) throw new Error('Không xác định được truyện để upload ảnh bìa');

        const formData = new FormData();
        formData.append('cover', coverFile);

        await adminFetch(`/admin/mangas/${savedMangaId}/cover`, {
          method: 'POST',
          data: formData,
        });

        setNotice(editingMangaId ? 'Đã cập nhật truyện và upload ảnh bìa' : 'Đã thêm truyện và upload ảnh bìa');
      }

      resetMangaForm();
      await loadAdminData();
    } catch (err) {
      setError(getMessage(err, 'Lưu truyện thất bại'));
    } finally {
      setSaving(false);
    }
  }

  async function deleteManga(mangaId) {
    const ok = window.confirm('Xóa truyện này? Các chương liên quan cũng sẽ bị xóa.');
    if (!ok) return;

    setError('');
    setNotice('');
    try {
      await adminFetch(`/admin/mangas/${mangaId}`, { method: 'DELETE' });
      setNotice('Đã xóa truyện');
      if (String(mangaId) === selectedMangaId) {
        setSelectedMangaId('');
        setChapters([]);
      }
      await loadAdminData();
    } catch (err) {
      setError(getMessage(err, 'Xóa truyện thất bại'));
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
        throw new Error('Chọn truyện và nhập số chương');
      }

      if (editingChapterId) {
        await adminFetch(`/admin/chapters/${editingChapterId}`, {
          method: 'PUT',
          body: JSON.stringify({
            chapter_number: payload.chapter_number,
            title: payload.title,
          }),
        });
        setNotice('Đã cập nhật chương');
      } else {
        await adminFetch('/admin/chapters', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setNotice('Đã thêm chương');
      }

      resetChapterForm();
      setSelectedMangaId(String(payload.manga_id));
      await loadChapters(payload.manga_id);
      await loadAdminData();
    } catch (err) {
      setError(getMessage(err, 'Thêm chương thất bại'));
    } finally {
      setSaving(false);
    }
  }

  async function uploadChapterImages(event) {
    event.preventDefault();
    setUploading(true);
    setNotice('');
    setError('');

    try {
      if (!uploadChapterId) throw new Error('Chọn chapter cần upload ảnh');
      if (!chapterImageFiles.length) throw new Error('Chọn ít nhất một ảnh chapter');

      const formData = new FormData();
      chapterImageFiles.forEach(file => formData.append('images', file));

      await adminFetch(`/admin/chapters/${uploadChapterId}/images`, {
        method: 'POST',
        data: formData,
      });

      setNotice('Đã upload ảnh chapter');
      setChapterImageFiles([]);
      await loadChapters(selectedMangaId);
    } catch (err) {
      setError(getMessage(err, 'Upload ảnh chapter thất bại'));
    } finally {
      setUploading(false);
    }
  }

  async function deleteChapter(chapterId) {
    const ok = window.confirm('Xóa chương này?');
    if (!ok) return;

    try {
      await adminFetch(`/admin/chapters/${chapterId}`, { method: 'DELETE' });
      setNotice('Đã xóa chương');
      if (editingChapterId === chapterId) resetChapterForm();
      if (String(uploadChapterId) === String(chapterId)) setUploadChapterId('');
      await loadChapters(selectedMangaId);
      await loadAdminData();
    } catch (err) {
      setError(getMessage(err, 'Xóa chương thất bại'));
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
      setNotice('Đã cập nhật quyền người dùng');
      await loadAdminData();
    } catch (err) {
      setError(getMessage(err, 'Cập nhật quyền thất bại'));
    }
  }

  function handleLogout() {
    localStorage.removeItem('doctruyen_token');
    localStorage.removeItem('doctruyen_user');
    onLogout?.();
  }

  const stats = dashboard?.stats || {};
  const pageTitle = {
    overview: 'Tổng quan',
    mangas: 'Quản lý truyện',
    categories: 'Quản lý thể loại',
    chapters: 'Quản lý chương',
    users: 'Quản lý người dùng',
  }[activeTab] || 'Quản trị';

  return (
    <div className="admin-page">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <img className="admin-brand-logo" src="/logo-gao.png" alt="Gạo" />
          <div>
            <strong>Gạo</strong>
            <span>Admin</span>
          </div>
        </div>

        <nav className="admin-nav">
          <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>
            <BarChart3 size={18} /> Tổng quan
          </button>
          <button className={activeTab === 'mangas' ? 'active' : ''} onClick={() => setActiveTab('mangas')}>
            <BookOpen size={18} /> Truyện
          </button>
          <button className={activeTab === 'categories' ? 'active' : ''} onClick={() => setActiveTab('categories')}>
            <Tag size={18} /> Thể loại
          </button>
          <button className={activeTab === 'chapters' ? 'active' : ''} onClick={() => setActiveTab('chapters')}>
            <Layers size={18} /> Chương
          </button>
          <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>
            <Users size={18} /> Người dùng
          </button>
        </nav>

        <div className="admin-sidebar-actions">
          <button onClick={onGoHome}><Home size={17} /> Về trang chủ</button>
          <button onClick={handleLogout}><LogOut size={17} /> Đăng xuất</button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <p>Quản trị hệ thống</p>
            <h1>{pageTitle}</h1>
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
            <button onClick={() => { setNotice(''); setError(''); }} aria-label="Đóng thông báo">
              <X size={16} />
            </button>
          </div>
        )}

        {loading ? (
          <section className="admin-empty">Đang tải dữ liệu...</section>
        ) : (
          <>
            {activeTab === 'overview' && (
              <section className="admin-section">
                <div className="admin-stat-grid">
                  <StatCard icon={<BookOpen />} label="Tổng truyện" value={stats.totalMangas || 0} />
                  <StatCard icon={<Layers />} label="Tổng chương" value={stats.totalChapters || 0} />
                  <StatCard icon={<Users />} label="Người dùng" value={stats.totalUsers || 0} />
                  <StatCard icon={<BarChart3 />} label="Bình luận" value={stats.totalComments || 0} />
                </div>

                <div className="admin-two-col">
                  <Panel title="Truyện mới">
                    <SimpleList
                      items={dashboard?.latestMangas || []}
                      renderItem={item => (
                        <>
                          <strong>{item.title}</strong>
                          <span>{item.author || 'Chưa rõ tác giả'} - {item.status === 'ongoing' ? 'Đang ra' : 'Hoàn thành'}</span>
                        </>
                      )}
                    />
                  </Panel>
                  <Panel title="Người dùng mới">
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
                <Panel title={editingMangaId ? 'Sửa truyện' : 'Thêm truyện'}>
                  <form className="admin-form" onSubmit={saveManga}>
                    <label>
                      Tên truyện
                      <input value={mangaForm.title} onChange={e => setMangaForm({ ...mangaForm, title: e.target.value })} />
                    </label>
                    <label>
                      Tác giả
                      <input value={mangaForm.author} onChange={e => setMangaForm({ ...mangaForm, author: e.target.value })} />
                    </label>
                    <label>
                      Trạng thái
                      <select value={mangaForm.status} onChange={e => setMangaForm({ ...mangaForm, status: e.target.value })}>
                        <option value="ongoing">Đang ra</option>
                        <option value="completed">Hoàn thành</option>
                      </select>
                    </label>
                    <label>
                      Ảnh bìa (URL)
                      <input value={mangaForm.cover_image} onChange={e => setMangaForm({ ...mangaForm, cover_image: e.target.value })} />
                    </label>
                    <label>
                      Upload ảnh bìa
                      <input key={coverInputKey} type="file" accept="image/*" onChange={handleCoverFileChange} />
                    </label>
                    <div className="admin-cover-note wide">
                      {coverFile ? (
                        <span><Upload size={15} /> Sẽ upload lên Cloudinary: {coverFile.name}</span>
                      ) : (
                        <span>Chọn file nếu muốn backend upload ảnh lên Cloudinary và tự lưu URL vào database.</span>
                      )}
                    </div>
                    <label className="wide">
                      Mô tả
                      <textarea rows="4" value={mangaForm.description} onChange={e => setMangaForm({ ...mangaForm, description: e.target.value })} />
                    </label>
                    <div className="wide">
                      <span className="admin-label">Thể loại</span>
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
                        <Save size={17} /> {saving ? (coverFile ? 'Đang lưu/upload...' : 'Đang lưu...') : editingMangaId ? 'Lưu thay đổi' : 'Thêm truyện'}
                      </button>
                      {editingMangaId && (
                        <button className="admin-secondary" type="button" onClick={resetMangaForm}>
                          Hủy sửa
                        </button>
                      )}
                    </div>
                  </form>
                </Panel>

                <Panel title="Danh sách truyện" action={<button className="admin-icon-text" onClick={loadAdminData}><RefreshCcw size={15} /> Tải lại</button>}>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Truyện</th>
                          <th>Tác giả</th>
                          <th>Trạng thái</th>
                          <th>Chương</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {mangas.map(manga => (
                          <tr key={manga.id}>
                            <td><strong>{manga.title}</strong><small>{(manga.Categories || []).map(c => c.name).join(', ') || 'Chưa có thể loại'}</small></td>
                            <td>{manga.author || '-'}</td>
                            <td><Badge tone={manga.status === 'ongoing' ? 'green' : 'blue'}>{manga.status === 'ongoing' ? 'Đang ra' : 'Hoàn thành'}</Badge></td>
                            <td>{manga.Chapters?.length || 0}</td>
                            <td>
                              <div className="admin-row-actions">
                                <button onClick={() => startEditManga(manga)} aria-label="Sửa truyện"><Edit3 size={16} /></button>
                                <button onClick={() => deleteManga(manga.id)} aria-label="Xóa truyện"><Trash2 size={16} /></button>
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

            {activeTab === 'categories' && (
              <section className="admin-section admin-grid-main">
                <Panel title={editingCategoryId ? 'Sửa thể loại' : 'Thêm thể loại'}>
                  <form className="admin-form" onSubmit={saveCategory}>
                    <label>
                      Tên thể loại
                      <input
                        value={categoryForm.name}
                        onChange={e => setCategoryForm({
                          ...categoryForm,
                          name: e.target.value,
                          slug: editingCategoryId ? categoryForm.slug : makeSlug(e.target.value),
                        })}
                      />
                    </label>
                    <label>
                      Slug
                      <input
                        value={categoryForm.slug}
                        onChange={e => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                        placeholder="vi-du-the-loai"
                      />
                    </label>
                    <div className="admin-form-actions wide">
                      <button className="admin-primary" type="submit" disabled={saving}>
                        <Save size={17} /> {saving ? 'Đang lưu...' : editingCategoryId ? 'Lưu thay đổi' : 'Thêm thể loại'}
                      </button>
                      {editingCategoryId && (
                        <button className="admin-secondary" type="button" onClick={resetCategoryForm}>
                          Hủy sửa
                        </button>
                      )}
                    </div>
                  </form>
                </Panel>

                <Panel title="Danh sách thể loại" action={<button className="admin-icon-text" onClick={loadAdminData}><RefreshCcw size={15} /> Tải lại</button>}>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Tên thể loại</th>
                          <th>Slug</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {categories.map(category => (
                          <tr key={category.id}>
                            <td><strong>{category.name}</strong></td>
                            <td>{category.slug}</td>
                            <td>
                              <div className="admin-row-actions">
                                <button onClick={() => startEditCategory(category)} aria-label="Sửa thể loại"><Edit3 size={16} /></button>
                                <button onClick={() => deleteCategory(category.id)} aria-label="Xóa thể loại"><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {!categories.length && (
                          <tr><td colSpan="3">Chưa có thể loại.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Panel>
              </section>
            )}

            {activeTab === 'chapters' && (
              <section className="admin-section admin-grid-main">
                <Panel title={editingChapterId ? 'Sửa chương' : 'Thêm chương'}>
                  <form className="admin-form" onSubmit={saveChapter}>
                    <label className="wide">
                      Truyện
                      <select
                        value={chapterForm.manga_id}
                        onChange={e => {
                          setChapterForm({ ...chapterForm, manga_id: e.target.value });
                          setSelectedMangaId(e.target.value);
                          setEditingChapterId(null);
                        }}
                      >
                        <option value="">Chọn truyện</option>
                        {mangas.map(manga => <option key={manga.id} value={manga.id}>{manga.title}</option>)}
                      </select>
                    </label>
                    <label>
                      Số chương
                      <input type="number" step="0.1" value={chapterForm.chapter_number} onChange={e => setChapterForm({ ...chapterForm, chapter_number: e.target.value })} />
                    </label>
                    <label>
                      Tiêu đề
                      <input value={chapterForm.title} onChange={e => setChapterForm({ ...chapterForm, title: e.target.value })} />
                    </label>
                    <div className="admin-form-actions wide">
                      <button className="admin-primary" type="submit" disabled={saving}>
                        {editingChapterId ? <Save size={17} /> : <Plus size={17} />}
                        {saving ? 'Đang lưu...' : editingChapterId ? 'Lưu chương' : 'Thêm chương'}
                      </button>
                      {editingChapterId && (
                        <button className="admin-secondary" type="button" onClick={resetChapterForm}>
                          Hủy sửa
                        </button>
                      )}
                    </div>
                  </form>
                </Panel>

                <Panel title="Upload ảnh chapter">
                  <form className="admin-form" onSubmit={uploadChapterImages}>
                    <label className="wide">
                      Chapter
                      <select value={uploadChapterId} onChange={e => setUploadChapterId(e.target.value)}>
                        <option value="">Chọn chapter</option>
                        {chapters.map(chapter => (
                          <option key={chapter.id} value={chapter.id}>
                            Chapter {chapter.chapter_number} - {chapter.title || 'Không tiêu đề'}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="wide">
                      Ảnh chapter
                      <input
                        accept="image/*"
                        multiple
                        type="file"
                        onChange={e => setChapterImageFiles(Array.from(e.target.files || []))}
                      />
                    </label>
                    <div className="admin-form-actions wide">
                      <button className="admin-primary" type="submit" disabled={uploading}>
                        <Upload size={17} /> {uploading ? 'Đang upload...' : 'Upload ảnh'}
                      </button>
                      <span className="admin-label">
                        {chapterImageFiles.length ? `${chapterImageFiles.length} ảnh đã chọn` : 'Chưa chọn ảnh'}
                      </span>
                    </div>
                  </form>
                </Panel>

                <Panel title="Chương của truyện">
                  <div className="admin-select-row">
                    <select
                      value={selectedMangaId}
                      onChange={e => {
                        setSelectedMangaId(e.target.value);
                        setChapterForm(form => ({ ...form, manga_id: e.target.value }));
                        setEditingChapterId(null);
                        setUploadChapterId('');
                      }}
                    >
                      <option value="">Chọn truyện</option>
                      {mangas.map(manga => <option key={manga.id} value={manga.id}>{manga.title}</option>)}
                    </select>
                  </div>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Chương</th>
                          <th>Tiêu đề</th>
                          <th>Lượt xem</th>
                          <th>Ảnh</th>
                          <th>Ngày tạo</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {chapters.map(chapter => (
                          <tr key={chapter.id}>
                            <td>{chapter.chapter_number}</td>
                            <td><strong>{chapter.title || '-'}</strong></td>
                            <td>{chapter.view_count || 0}</td>
                            <td>{chapter.ChapterImages?.length || 0}</td>
                            <td>{formatDate(chapter.created_at)}</td>
                            <td>
                              <div className="admin-row-actions">
                                <button onClick={() => startEditChapter(chapter)} aria-label="Sửa chương"><Edit3 size={16} /></button>
                                <button onClick={() => setUploadChapterId(String(chapter.id))} aria-label="Upload ảnh"><Upload size={16} /></button>
                                <button onClick={() => deleteChapter(chapter.id)} aria-label="Xóa chương"><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {!chapters.length && (
                          <tr><td colSpan="6">Chưa có chương.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Panel>
              </section>
            )}

            {activeTab === 'users' && (
              <section className="admin-section">
                <Panel title="Danh sách người dùng">
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Tài khoản</th>
                          <th>Email</th>
                          <th>Vai trò</th>
                          <th>Ngày tạo</th>
                          <th>Đổi quyền</th>
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
  if (!items.length) return <div className="admin-empty compact">Chưa có dữ liệu.</div>;

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
