import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Edit3,
  Home,
  Image as ImageIcon,
  Flag,
  Layers,
  LogOut,
  MessageCircle,
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
  alternative_names: '',
  author: '',
  status: 'ongoing',
  description: '',
  cover_image: '',
  banner_image: '',
  categoryIds: [],
};

const emptyHeroForm = {
  manga_id: '',
  title: '',
  subtitle: '',
  image_url: '',
  sort_order: 0,
  is_active: true,
};

const emptyChapterForm = {
  manga_id: '',
  chapter_number: '',
  title: '',
  chapter_type: 'image',
  content: '',
};

const emptyCategoryForm = {
  name: '',
  slug: '',
};

const ADMIN_PAGE_SIZE = 8;

function normalizeSearch(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function paginate(items, page, pageSize = ADMIN_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(Number(page) || 1, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
  };
}

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

function formatNumber(value) {
  return new Intl.NumberFormat('vi-VN').format(Number(value) || 0);
}

function FileDropZone({ label, accept, multiple = false, file, files = [], inputKey, onFile, onFiles, hint }) {
  const selectedFiles = multiple ? files : file ? [file] : [];

  function handleFiles(fileList) {
    const nextFiles = Array.from(fileList || []);
    if (multiple) {
      onFiles?.(nextFiles);
      return;
    }
    onFile?.(nextFiles[0] || null);
  }

  function preventDropDefault(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <div className="admin-file-field wide">
      <span className="admin-label">{label}</span>
      <label
        className="admin-dropzone"
        onDragEnter={preventDropDefault}
        onDragOver={preventDropDefault}
        onDrop={event => {
          preventDropDefault(event);
          handleFiles(event.dataTransfer.files);
        }}
      >
        <Upload size={24} />
        <strong>Kéo file vào đây hoặc bấm để chọn</strong>
        <small>{hint || (multiple ? 'Có thể chọn nhiều file cùng lúc.' : 'Chọn một file để upload.')}</small>
        <input
          key={inputKey}
          accept={accept}
          multiple={multiple}
          type="file"
          onChange={event => handleFiles(event.target.files)}
        />
      </label>
      {selectedFiles.length > 0 && (
        <div className="admin-file-list">
          {selectedFiles.map((selectedFile, index) => (
            <span className="admin-file-chip" key={`${selectedFile.name}-${selectedFile.size}-${index}`}>
              <ImageIcon size={14} /> {selectedFile.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function getMessage(error, fallback = 'Có lỗi xảy ra') {
  return error?.message || fallback;
}

function formatDateTime(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

export default function Admin({ onGoHome, onGoAuth, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboard, setDashboard] = useState(null);
  const [mangas, setMangas] = useState([]);
  const [heroMangaOptions, setHeroMangaOptions] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [latestComments, setLatestComments] = useState([]);
  const [commentReports, setCommentReports] = useState([]);
  const [commentStickers, setCommentStickers] = useState([]);
  const [heroSlides, setHeroSlides] = useState([]);
  const [selectedMangaId, setSelectedMangaId] = useState('');
  const [mangaForm, setMangaForm] = useState(emptyMangaForm);
  const [heroForm, setHeroForm] = useState(emptyHeroForm);
  const [chapterForm, setChapterForm] = useState(emptyChapterForm);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const [coverFile, setCoverFile] = useState(null);
  const [coverInputKey, setCoverInputKey] = useState(0);
  const [heroImageFile, setHeroImageFile] = useState(null);
  const [heroImageInputKey, setHeroImageInputKey] = useState(0);
  const [editingMangaId, setEditingMangaId] = useState(null);
  const [editingHeroSlideId, setEditingHeroSlideId] = useState(null);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingChapterId, setEditingChapterId] = useState(null);
  const [uploadChapterId, setUploadChapterId] = useState('');
  const [chapterImageFiles, setChapterImageFiles] = useState([]);
  const [chapterTextFile, setChapterTextFile] = useState(null);
  const [chapterTextInputKey, setChapterTextInputKey] = useState(0);
  const [stickerFile, setStickerFile] = useState(null);
  const [stickerName, setStickerName] = useState('');
  const [stickerInputKey, setStickerInputKey] = useState(0);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [mangaSearch, setMangaSearch] = useState('');
  const [mangaStatusFilter, setMangaStatusFilter] = useState('all');
  const [mangaCategoryFilter, setMangaCategoryFilter] = useState('all');
  const [mangaPage, setMangaPage] = useState(1);
  const [mangaSort, setMangaSort] = useState('newest');
  const [mangaPaginationInfo, setMangaPaginationInfo] = useState({
    page: 1,
    limit: ADMIN_PAGE_SIZE,
    totalItems: 0,
    totalPages: 1,
  });
  const [chapterSearch, setChapterSearch] = useState('');
  const [chapterTypeFilter, setChapterTypeFilter] = useState('all');
  const [chapterSort, setChapterSort] = useState('number_asc');
  const [chapterPage, setChapterPage] = useState(1);
  const [chapterPaginationInfo, setChapterPaginationInfo] = useState({
    page: 1,
    limit: ADMIN_PAGE_SIZE,
    totalItems: 0,
    totalPages: 1,
  });
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userPage, setUserPage] = useState(1);
  const [commentSearch, setCommentSearch] = useState('');
  const [commentMangaFilter, setCommentMangaFilter] = useState('all');
  const [commentUserFilter, setCommentUserFilter] = useState('');
  const [commentPage, setCommentPage] = useState(1);
  const [commentReportStatusFilter, setCommentReportStatusFilter] = useState('pending');

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

  function getMangaListPath(page = mangaPage) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(ADMIN_PAGE_SIZE),
      sort: mangaSort,
    });
    if (mangaSearch.trim()) params.set('search', mangaSearch.trim());
    if (mangaStatusFilter !== 'all') params.set('status', mangaStatusFilter);
    if (mangaCategoryFilter !== 'all') params.set('categoryId', mangaCategoryFilter);
    return `/admin/mangas?${params.toString()}`;
  }

  function getChapterListPath(mangaId, page = chapterPage) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(ADMIN_PAGE_SIZE),
      sort: chapterSort,
    });
    if (chapterSearch.trim()) params.set('search', chapterSearch.trim());
    if (chapterTypeFilter !== 'all') params.set('chapterType', chapterTypeFilter);
    return `/admin/mangas/${mangaId}/chapters?${params.toString()}`;
  }

  function normalizePaginatedResponse(data) {
    if (Array.isArray(data)) {
      return {
        items: data,
        pagination: {
          page: 1,
          limit: data.length || ADMIN_PAGE_SIZE,
          totalItems: data.length,
          totalPages: 1,
        },
      };
    }

    return {
      items: Array.isArray(data?.items) ? data.items : [],
      pagination: data?.pagination || {
        page: 1,
        limit: ADMIN_PAGE_SIZE,
        totalItems: 0,
        totalPages: 1,
      },
    };
  }

  async function loadAdminData() {
    setLoading(true);
    setError('');
    try {
      const [dashboardData, mangaData, userData, categoryData, commentData, stickerData, reportData, heroData, heroMangaData] = await Promise.all([
        adminFetch('/admin/dashboard'),
        adminFetch(getMangaListPath()),
        adminFetch('/admin/users'),
        adminFetch('/admin/categories'),
        adminFetch('/admin/comments/latest?limit=200'),
        adminFetch('/admin/comment-stickers'),
        adminFetch('/admin/comment-reports?limit=100'),
        adminFetch('/admin/hero-slides'),
        adminFetch('/admin/mangas?limit=100&sort=title_asc'),
      ]);

      setDashboard(dashboardData);
      const mangaResult = normalizePaginatedResponse(mangaData);
      setMangas(mangaResult.items);
      setMangaPaginationInfo(mangaResult.pagination);
      setUsers(userData);
      setCategories(categoryData);
      setLatestComments(commentData);
      setCommentStickers(stickerData);
      setCommentReports(reportData);
      setHeroSlides(heroData);
      setHeroMangaOptions(normalizePaginatedResponse(heroMangaData).items);
      if (!selectedMangaId && mangaResult.items[0]) {
        setSelectedMangaId(String(mangaResult.items[0].id));
        setChapterForm(form => ({ ...form, manga_id: String(mangaResult.items[0].id) }));
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
      setChapterPaginationInfo({
        page: 1,
        limit: ADMIN_PAGE_SIZE,
        totalItems: 0,
        totalPages: 1,
      });
      return;
    }

    try {
      const data = await adminFetch(getChapterListPath(mangaId));
      const chapterResult = normalizePaginatedResponse(data);
      setChapters(chapterResult.items);
      setChapterPaginationInfo(chapterResult.pagination);
    } catch (err) {
      setError(getMessage(err, 'Không tải được chương'));
    }
  }

  async function loadMangaPage(page = mangaPage) {
    try {
      const data = await adminFetch(getMangaListPath(page));
      const mangaResult = normalizePaginatedResponse(data);
      setMangas(mangaResult.items);
      setMangaPaginationInfo(mangaResult.pagination);
      if (!selectedMangaId && mangaResult.items[0]) {
        setSelectedMangaId(String(mangaResult.items[0].id));
        setChapterForm(form => ({ ...form, manga_id: String(mangaResult.items[0].id) }));
      }
    } catch (err) {
      setError(getMessage(err, 'Không tải được danh sách truyện'));
    }
  }

  async function loadCommentAdminData() {
    setError('');
    try {
      const [commentData, stickerData, reportData] = await Promise.all([
        adminFetch('/admin/comments/latest?limit=200'),
        adminFetch('/admin/comment-stickers'),
        adminFetch(`/admin/comment-reports?limit=100&status=${commentReportStatusFilter}`),
      ]);
      setLatestComments(commentData);
      setCommentStickers(stickerData);
      setCommentReports(reportData);
    } catch (err) {
      setError(getMessage(err, 'Không tải được dữ liệu bình luận'));
    }
  }

  useEffect(() => {
    loadAdminData();
  }, []);

  useEffect(() => {
    loadChapters(selectedMangaId);
  }, [selectedMangaId, chapterPage, chapterSearch, chapterTypeFilter, chapterSort]);

  useEffect(() => {
    if (activeTab === 'mangas') loadMangaPage();
  }, [activeTab, mangaPage, mangaSearch, mangaStatusFilter, mangaCategoryFilter, mangaSort]);

  useEffect(() => {
    if (activeTab === 'comments') loadCommentAdminData();
  }, [commentReportStatusFilter]);

  function resetMangaForm() {
    setEditingMangaId(null);
    setMangaForm(emptyMangaForm);
    setCoverFile(null);
    setCoverInputKey(key => key + 1);
  }

  function resetHeroForm() {
    setEditingHeroSlideId(null);
    setHeroForm(emptyHeroForm);
    setHeroImageFile(null);
    setHeroImageInputKey(key => key + 1);
  }

  function startEditHeroSlide(slide) {
    setEditingHeroSlideId(slide.id);
    setHeroForm({
      manga_id: String(slide.manga_id || slide.Manga?.id || ''),
      title: slide.title || '',
      subtitle: slide.subtitle || '',
      image_url: slide.image_url || '',
      sort_order: Number(slide.sort_order || 0),
      is_active: Boolean(slide.is_active),
    });
    setHeroImageFile(null);
    setHeroImageInputKey(key => key + 1);
    setActiveTab('hero');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startEditManga(manga) {
    setEditingMangaId(manga.id);
    setCoverFile(null);
    setCoverInputKey(key => key + 1);
    setMangaForm({
      title: manga.title || '',
      alternative_names: manga.alternative_names || '',
      author: manga.author || '',
      status: manga.status || 'ongoing',
      description: manga.description || '',
      cover_image: manga.cover_image || '',
      banner_image: manga.banner_image || '',
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
    setChapterTextFile(null);
    setChapterTextInputKey(key => key + 1);
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
      chapter_type: chapter.chapter_type || 'image',
      content: chapter.ChapterContent?.content || '',
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
        alternative_names: mangaForm.alternative_names.trim(),
        author: mangaForm.author.trim(),
        description: mangaForm.description.trim(),
        cover_image: mangaForm.cover_image.trim() || null,
        banner_image: mangaForm.banner_image.trim() || null,
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

  async function saveHeroSlide(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');

    try {
      if (!heroForm.manga_id) throw new Error('Chọn truyện cần đưa lên hero');
      if (!heroImageFile && !heroForm.image_url.trim()) throw new Error('Chọn ảnh ngang hoặc nhập URL ảnh hero');

      const formData = new FormData();
      formData.append('manga_id', heroForm.manga_id);
      formData.append('title', heroForm.title.trim());
      formData.append('subtitle', heroForm.subtitle.trim());
      formData.append('image_url', heroForm.image_url.trim());
      formData.append('sort_order', String(Number(heroForm.sort_order || 0)));
      formData.append('is_active', String(Boolean(heroForm.is_active)));
      if (heroImageFile) formData.append('image', heroImageFile);

      if (editingHeroSlideId) {
        await adminFetch(`/admin/hero-slides/${editingHeroSlideId}`, {
          method: 'PUT',
          data: formData,
        });
        setNotice('Đã cập nhật hero slide');
      } else {
        await adminFetch('/admin/hero-slides', {
          method: 'POST',
          data: formData,
        });
        setNotice('Đã thêm hero slide');
      }

      resetHeroForm();
      setHeroSlides(await adminFetch('/admin/hero-slides'));
    } catch (err) {
      setError(getMessage(err, 'Lưu hero slide thất bại'));
    } finally {
      setSaving(false);
    }
  }

  async function toggleHeroSlideStatus(slide) {
    setError('');
    setNotice('');

    try {
      const updated = await adminFetch(`/admin/hero-slides/${slide.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !slide.is_active }),
      });
      setHeroSlides(current => current.map(item => Number(item.id) === Number(slide.id) ? updated : item));
      setNotice(updated.is_active ? 'Đã bật hero slide' : 'Đã tắt hero slide');
    } catch (err) {
      setError(getMessage(err, 'Cập nhật trạng thái hero thất bại'));
    }
  }

  async function deleteHeroSlide(slideId) {
    const ok = window.confirm('Xóa hero slide này?');
    if (!ok) return;

    setError('');
    setNotice('');
    try {
      await adminFetch(`/admin/hero-slides/${slideId}`, { method: 'DELETE' });
      setHeroSlides(current => current.filter(item => Number(item.id) !== Number(slideId)));
      if (editingHeroSlideId === slideId) resetHeroForm();
      setNotice('Đã xóa hero slide');
    } catch (err) {
      setError(getMessage(err, 'Xóa hero slide thất bại'));
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
        chapter_type: chapterForm.chapter_type,
        content: chapterForm.chapter_type === 'text' ? chapterForm.content : undefined,
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
            chapter_type: payload.chapter_type,
            content: payload.content,
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

  async function uploadChapterText(event) {
    event.preventDefault();
    setUploading(true);
    setNotice('');
    setError('');

    try {
      if (!uploadChapterId) throw new Error('Chọn chapter cần upload file .txt');
      if (!chapterTextFile) throw new Error('Chọn file .txt chứa nội dung chương');

      const formData = new FormData();
      formData.append('content_file', chapterTextFile);

      await adminFetch(`/admin/chapters/${uploadChapterId}/content`, {
        method: 'POST',
        data: formData,
      });

      setNotice('Đã upload nội dung truyện chữ');
      setChapterTextFile(null);
      setChapterTextInputKey(key => key + 1);
      await loadChapters(selectedMangaId);
      await loadAdminData();
    } catch (err) {
      setError(getMessage(err, 'Upload file .txt thất bại'));
    } finally {
      setUploading(false);
    }
  }

  async function uploadSticker(event) {
    event.preventDefault();
    setUploading(true);
    setNotice('');
    setError('');

    try {
      if (!stickerFile) throw new Error('Chọn ảnh sticker cần upload');

      const formData = new FormData();
      formData.append('sticker', stickerFile);
      if (stickerName.trim()) formData.append('name', stickerName.trim());
      formData.append('status', 'active');
      formData.append('type', 'sticker');

      await adminFetch('/admin/comment-stickers', {
        method: 'POST',
        data: formData,
      });

      setNotice('Đã upload sticker');
      setStickerFile(null);
      setStickerName('');
      setStickerInputKey(key => key + 1);
      await loadCommentAdminData();
    } catch (err) {
      setError(getMessage(err, 'Upload sticker thất bại'));
    } finally {
      setUploading(false);
    }
  }

  function startEditComment(comment) {
    updateAdminCommentStatus(comment.id, 'hidden');
  }

  function cancelEditComment() {
    setEditingCommentId(null);
    setEditingCommentContent('');
  }

  async function saveAdminComment(comment) {
    setSaving(true);
    setNotice('');
    setError('');

    try {
      const content = editingCommentContent.trim();
      const stickerId = content ? null : comment.sticker_id || comment.Sticker?.id || null;
      if (!content && !stickerId) throw new Error('Bình luận cần có nội dung hoặc sticker');

      await adminFetch(`/admin/comments/${comment.id}`, {
        method: 'PUT',
        body: JSON.stringify({ content: content || null, stickerId }),
      });

      setNotice('Đã cập nhật bình luận');
      cancelEditComment();
      await loadCommentAdminData();
    } catch (err) {
      setError(getMessage(err, 'Cập nhật bình luận thất bại'));
    } finally {
      setSaving(false);
    }
  }

  async function deleteAdminComment(commentId) {
    const ok = window.confirm('Xóa bình luận này? Các phản hồi liên quan cũng có thể bị xóa theo cấu hình database.');
    if (!ok) return;

    setNotice('');
    setError('');

    try {
      await adminFetch(`/admin/comments/${commentId}`, { method: 'DELETE' });
      setNotice('Đã xóa bình luận');
      if (editingCommentId === commentId) cancelEditComment();
      await loadCommentAdminData();
      await loadAdminData();
    } catch (err) {
      setError(getMessage(err, 'Xóa bình luận thất bại'));
    }
  }

  async function updateAdminCommentStatus(commentId, status) {
    setNotice('');
    setError('');

    try {
      await adminFetch(`/admin/comments/${commentId}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      setNotice(status === 'visible' ? 'Da hien binh luan' : status === 'hidden' ? 'Da an binh luan' : 'Da xoa mem binh luan');
      if (editingCommentId === commentId) cancelEditComment();
      await loadCommentAdminData();
      await loadAdminData();
    } catch (err) {
      setError(getMessage(err, 'Cap nhat trang thai binh luan that bai'));
    }
  }

  async function updateCommentReportStatus(reportId, status) {
    setNotice('');
    setError('');

    try {
      await adminFetch(`/admin/comment-reports/${reportId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setNotice(status === 'resolved' ? 'Da xu ly bao cao' : 'Da cap nhat bao cao');
      await loadCommentAdminData();
    } catch (err) {
      setError(getMessage(err, 'Cap nhat bao cao that bai'));
    }
  }

  async function updateStickerStatus(sticker, status) {
    setNotice('');
    setError('');

    try {
      await adminFetch(`/admin/comment-stickers/${sticker.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: sticker.name, type: sticker.type || 'sticker', status }),
      });
      setNotice(status === 'active' ? 'Đã bật sticker' : 'Đã tắt sticker');
      await loadCommentAdminData();
    } catch (err) {
      setError(getMessage(err, 'Cập nhật sticker thất bại'));
    }
  }

  async function deleteSticker(stickerId) {
    const ok = window.confirm('Xóa sticker này? Sticker sẽ bị gỡ khỏi các bình luận đã dùng.');
    if (!ok) return;

    setNotice('');
    setError('');

    try {
      await adminFetch(`/admin/comment-stickers/${stickerId}`, { method: 'DELETE' });
      setNotice('Đã xóa sticker');
      await loadCommentAdminData();
    } catch (err) {
      setError(getMessage(err, 'Xóa sticker thất bại'));
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

  async function deleteUser(userId) {
    const ok = window.confirm('Xóa người dùng này? Dữ liệu liên quan của user cũng có thể bị xóa theo cấu hình database.');
    if (!ok) return;

    setError('');
    setNotice('');
    try {
      await adminFetch(`/admin/users/${userId}`, { method: 'DELETE' });
      setNotice('Đã xóa người dùng');
      await loadAdminData();
    } catch (err) {
      setError(getMessage(err, 'Xóa người dùng thất bại'));
    }
  }

  function handleLogout() {
    localStorage.removeItem('doctruyen_token');
    localStorage.removeItem('doctruyen_user');
    onLogout?.();
  }

  const stats = dashboard?.stats || {};
  const viewStats = dashboard?.viewStats || [];
  const viewSummary = dashboard?.viewSummary || {};
  const topViewedMangas = dashboard?.topViewedMangas || [];
  const topViewedChapters = dashboard?.topViewedChapters || [];
  const topGrowthMangas = dashboard?.topGrowthMangas || [];
  const maxDailyViews = Math.max(...viewStats.map(item => item.total || 0), 1);
  const filteredMangas = mangas;
  const mangaPagination = {
    items: mangas,
    page: mangaPaginationInfo.page,
    totalPages: mangaPaginationInfo.totalPages,
  };

  const filteredUsers = useMemo(() => {
    const keyword = normalizeSearch(userSearch);
    return users.filter(item => {
      const text = normalizeSearch(`${item.username || ''} ${item.email || ''}`);
      const matchesKeyword = !keyword || text.includes(keyword);
      const matchesRole = userRoleFilter === 'all' || String(item.role_id) === userRoleFilter;
      return matchesKeyword && matchesRole;
    });
  }, [users, userSearch, userRoleFilter]);
  const userPagination = paginate(filteredUsers, userPage);

  const filteredComments = useMemo(() => {
    const keyword = normalizeSearch(commentSearch);
    const userKeyword = normalizeSearch(commentUserFilter);
    return latestComments.filter(comment => {
      const text = normalizeSearch([
        comment.content,
        comment.Sticker?.name,
        comment.User?.username,
        comment.User?.email,
        comment.Manga?.title,
        comment.Chapter?.title,
        comment.Chapter?.chapter_number,
      ].filter(Boolean).join(' '));
      const userText = normalizeSearch(`${comment.User?.username || ''} ${comment.User?.email || ''}`);
      const matchesKeyword = !keyword || text.includes(keyword);
      const matchesUser = !userKeyword || userText.includes(userKeyword);
      const matchesManga = commentMangaFilter === 'all' || String(comment.Manga?.id) === String(commentMangaFilter);
      return matchesKeyword && matchesUser && matchesManga;
    });
  }, [latestComments, commentSearch, commentUserFilter, commentMangaFilter]);
  const commentPagination = paginate(filteredComments, commentPage);
  const pageTitle = {
    overview: 'Tổng quan',
    mangas: 'Quản lý truyện',
    hero: 'Quản lý Hero/Banner',
    categories: 'Quản lý thể loại',
    chapters: 'Quản lý chương',
    comments: 'Quản lý bình luận',
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
          <button className={activeTab === 'hero' ? 'active' : ''} onClick={() => setActiveTab('hero')}>
            <ImageIcon size={18} /> Hero/Banner
          </button>
          <button className={activeTab === 'categories' ? 'active' : ''} onClick={() => setActiveTab('categories')}>
            <Tag size={18} /> Thể loại
          </button>
          <button className={activeTab === 'chapters' ? 'active' : ''} onClick={() => setActiveTab('chapters')}>
            <Layers size={18} /> Chương
          </button>
          <button className={activeTab === 'comments' ? 'active' : ''} onClick={() => setActiveTab('comments')}>
            <MessageCircle size={18} /> Bình luận
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

                <div className="admin-stat-grid admin-view-summary">
                  <StatCard icon={<BarChart3 />} label="Tổng lượt xem" value={formatNumber(stats.totalSystemViews)} />
                  <StatCard icon={<BookOpen />} label="View truyện" value={formatNumber(stats.totalMangaViews)} />
                  <StatCard icon={<Layers />} label="View chapter" value={formatNumber(stats.totalChapterViews)} />
                  <StatCard icon={<BarChart3 />} label="View hôm nay" value={formatNumber(viewSummary.today?.total)} />
                </div>

                <div className="admin-view-metrics">
                  <div>
                    <strong>{formatNumber(viewSummary.last7Days?.total)}</strong>
                    <span>7 ngày gần nhất</span>
                    <small>Truyện {formatNumber(viewSummary.last7Days?.manga)} / Chapter {formatNumber(viewSummary.last7Days?.chapter)}</small>
                  </div>
                  <div>
                    <strong>{formatNumber(viewSummary.last30Days?.total)}</strong>
                    <span>30 ngày gần nhất</span>
                    <small>Truyện {formatNumber(viewSummary.last30Days?.manga)} / Chapter {formatNumber(viewSummary.last30Days?.chapter)}</small>
                  </div>
                  <div>
                    <strong>{viewSummary.ratio?.manga || 0}% / {viewSummary.ratio?.chapter || 0}%</strong>
                    <span>Tỷ lệ view truyện/chapter</span>
                    <div className="admin-view-ratio">
                      <span style={{ width: `${viewSummary.ratio?.manga || 0}%` }} />
                    </div>
                  </div>
                </div>

                <Panel title="Lượt xem 7 ngày gần nhất">
                  <div className="admin-view-chart">
                    {viewStats.map(item => {
                      const height = Math.max(8, Math.round(((item.total || 0) / maxDailyViews) * 140));
                      return (
                        <div className="admin-view-day" key={item.date}>
                          <div className="admin-view-bars" title={`${item.total || 0} lượt xem`}>
                            <span className="admin-view-count">{item.total || 0}</span>
                            <span className="admin-view-bar" style={{ height }} />
                          </div>
                          <strong>{new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(new Date(item.date))}</strong>
                          <small>Truyện {item.manga || 0} / Chương {item.chapter || 0}</small>
                        </div>
                      );
                    })}
                  </div>
                </Panel>

                <div className="admin-three-col">
                  <Panel title="Top truyện nhiều view">
                    <TopViewList
                      items={topViewedMangas}
                      emptyText="Chưa có lượt xem truyện."
                      renderTitle={item => item.title}
                      renderMeta={item => `${item.author || 'Chưa rõ tác giả'} - ${formatNumber(item.view_count)} lượt xem`}
                    />
                  </Panel>
                  <Panel title="Top chapter nhiều view">
                    <TopViewList
                      items={topViewedChapters}
                      emptyText="Chưa có lượt xem chapter."
                      renderTitle={item => `${item.Manga?.title || 'Truyện'} - Chapter ${item.chapter_number}`}
                      renderMeta={item => `${item.title || 'Không tiêu đề'} - ${formatNumber(item.view_count)} lượt xem`}
                    />
                  </Panel>
                  <Panel title="Tăng view nhanh 7 ngày">
                    <TopViewList
                      items={topGrowthMangas}
                      emptyText="Chưa có dữ liệu tăng trưởng."
                      renderTitle={item => item.title}
                      renderMeta={item => `${formatNumber(item.recent_views)} view mới / tổng ${formatNumber(item.view_count)}`}
                    />
                  </Panel>
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
                    <label className="wide">
                      Tên khác
                      <input
                        value={mangaForm.alternative_names}
                        onChange={e => setMangaForm({ ...mangaForm, alternative_names: e.target.value })}
                        placeholder="Nhập các tên khác, cách nhau bằng dấu phẩy"
                      />
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
                      Ảnh ngang mặc định (URL)
                      <input
                        value={mangaForm.banner_image}
                        onChange={e => setMangaForm({ ...mangaForm, banner_image: e.target.value })}
                        placeholder="Dùng cho hero/banner nếu cần"
                      />
                    </label>
                    <FileDropZone
                      label="Upload ảnh bìa"
                      accept="image/*"
                      file={coverFile}
                      inputKey={coverInputKey}
                      onFile={setCoverFile}
                      hint="Kéo ảnh bìa vào đây. Backend sẽ upload lên Cloudinary và lưu URL."
                    />
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
                  <div className="admin-filter-bar">
                    <input
                      value={mangaSearch}
                      onChange={e => { setMangaSearch(e.target.value); setMangaPage(1); }}
                      placeholder="Tìm theo tên truyện hoặc tác giả"
                    />
                    <select value={mangaStatusFilter} onChange={e => { setMangaStatusFilter(e.target.value); setMangaPage(1); }}>
                      <option value="all">Tất cả trạng thái</option>
                      <option value="ongoing">Đang ra</option>
                      <option value="completed">Hoàn thành</option>
                    </select>
                    <select value={mangaCategoryFilter} onChange={e => { setMangaCategoryFilter(e.target.value); setMangaPage(1); }}>
                      <option value="all">Tất cả thể loại</option>
                      {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                    <select value={mangaSort} onChange={e => { setMangaSort(e.target.value); setMangaPage(1); }}>
                      <option value="newest">Mới tạo</option>
                      <option value="updated">Mới cập nhật</option>
                      <option value="views">Nhiều lượt xem</option>
                      <option value="title_asc">Tên A-Z</option>
                      <option value="oldest">Cũ nhất</option>
                    </select>
                    <span>{mangaPaginationInfo.totalItems} truyện</span>
                  </div>
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
                        {mangaPagination.items.map(manga => (
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
                        {!mangaPagination.items.length && (
                          <tr><td colSpan="5">Không có truyện phù hợp.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <Pagination
                    page={mangaPagination.page}
                    totalPages={mangaPagination.totalPages}
                    totalItems={mangaPaginationInfo.totalItems}
                    onPageChange={setMangaPage}
                  />
                </Panel>
              </section>
            )}

            {activeTab === 'hero' && (
              <section className="admin-section admin-grid-main">
                <Panel title={editingHeroSlideId ? 'Sửa hero slide' : 'Thêm hero slide'}>
                  <form className="admin-form" onSubmit={saveHeroSlide}>
                    <label className="wide">
                      Truyện liên kết
                      <select value={heroForm.manga_id} onChange={e => setHeroForm({ ...heroForm, manga_id: e.target.value })}>
                        <option value="">Chọn truyện</option>
                        {heroMangaOptions.map(manga => <option key={manga.id} value={manga.id}>{manga.title}</option>)}
                      </select>
                    </label>
                    <label>
                      Tiêu đề hiển thị
                      <input value={heroForm.title} onChange={e => setHeroForm({ ...heroForm, title: e.target.value })} placeholder="Để trống sẽ dùng tên truyện" />
                    </label>
                    <label>
                      Thứ tự
                      <input type="number" value={heroForm.sort_order} onChange={e => setHeroForm({ ...heroForm, sort_order: e.target.value })} />
                    </label>
                    <label className="wide">
                      Mô tả ngắn
                      <input value={heroForm.subtitle} onChange={e => setHeroForm({ ...heroForm, subtitle: e.target.value })} placeholder="Mô tả ngắn trên banner" />
                    </label>
                    <label className="wide">
                      Ảnh ngang (URL)
                      <input value={heroForm.image_url} onChange={e => setHeroForm({ ...heroForm, image_url: e.target.value })} placeholder="Có thể upload file thay vì nhập URL" />
                    </label>
                    <FileDropZone
                      label="Upload ảnh ngang hero"
                      accept="image/*"
                      file={heroImageFile}
                      inputKey={heroImageInputKey}
                      onFile={setHeroImageFile}
                      hint="Nên dùng ảnh ngang 1600x700 hoặc 1920x800."
                    />
                    <label className="admin-check wide">
                      <input
                        type="checkbox"
                        checked={heroForm.is_active}
                        onChange={e => setHeroForm({ ...heroForm, is_active: e.target.checked })}
                      />
                      Hiển thị trên trang chủ
                    </label>
                    <div className="admin-form-actions wide">
                      <button className="admin-primary" type="submit" disabled={saving}>
                        <Save size={17} /> {saving ? 'Đang lưu...' : editingHeroSlideId ? 'Lưu slide' : 'Thêm slide'}
                      </button>
                      {editingHeroSlideId && (
                        <button className="admin-secondary" type="button" onClick={resetHeroForm}>
                          Hủy sửa
                        </button>
                      )}
                    </div>
                  </form>
                </Panel>

                <Panel title="Danh sách hero slide" action={<button className="admin-icon-text" onClick={async () => setHeroSlides(await adminFetch('/admin/hero-slides'))}><RefreshCcw size={15} /> Tải lại</button>}>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Ảnh</th>
                          <th>Slide</th>
                          <th>Thứ tự</th>
                          <th>Trạng thái</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {heroSlides.map(slide => (
                          <tr key={slide.id}>
                            <td>
                              <img className="admin-hero-thumb" src={slide.image_url} alt={slide.title || slide.Manga?.title || 'Hero'} />
                            </td>
                            <td>
                              <strong>{slide.title || slide.Manga?.title || 'Hero slide'}</strong>
                              <small>{slide.subtitle || slide.Manga?.title || 'Chưa có mô tả'}</small>
                            </td>
                            <td>{slide.sort_order}</td>
                            <td>
                              <Badge tone={slide.is_active ? 'green' : 'gray'}>
                                {slide.is_active ? 'Đang hiển thị' : 'Đã tắt'}
                              </Badge>
                            </td>
                            <td>
                              <div className="admin-row-actions">
                                <button onClick={() => startEditHeroSlide(slide)} type="button"><Edit3 size={16} /></button>
                                <button onClick={() => toggleHeroSlideStatus(slide)} type="button">{slide.is_active ? 'Tắt' : 'Bật'}</button>
                                <button onClick={() => deleteHeroSlide(slide.id)} type="button"><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!heroSlides.length && <div className="admin-empty">Chưa có hero slide.</div>}
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
                          setChapterPage(1);
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
                    <label>
                      Loại chương
                      <select value={chapterForm.chapter_type} onChange={e => setChapterForm({ ...chapterForm, chapter_type: e.target.value })}>
                        <option value="image">Truyện tranh / ảnh</option>
                        <option value="text">Truyện chữ</option>
                      </select>
                    </label>
                    {chapterForm.chapter_type === 'text' && (
                      <label className="wide">
                        Nội dung truyện chữ
                        <textarea
                          rows="8"
                          value={chapterForm.content}
                          onChange={e => setChapterForm({ ...chapterForm, content: e.target.value })}
                          placeholder="Có thể nhập trực tiếp nội dung chương hoặc tạo chương rồi upload file .txt bên dưới."
                        />
                      </label>
                    )}
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
                    <FileDropZone
                      label="Ảnh chapter"
                      accept="image/*"
                      multiple
                      files={chapterImageFiles}
                      onFiles={setChapterImageFiles}
                      hint="Kéo nhiều ảnh chapter vào đây. Thứ tự file chọn sẽ được dùng để lưu trang ảnh."
                    />
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

                <Panel title="Upload file .txt cho truyện chữ">
                  <form className="admin-form" onSubmit={uploadChapterText}>
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
                    <FileDropZone
                      label="File nội dung"
                      accept=".txt,text/plain"
                      file={chapterTextFile}
                      inputKey={chapterTextInputKey}
                      onFile={setChapterTextFile}
                      hint="Kéo file .txt vào đây để import nội dung truyện chữ."
                    />
                    <div className="admin-form-actions wide">
                      <button className="admin-primary" type="submit" disabled={uploading}>
                        <Upload size={17} /> {uploading ? 'Đang upload...' : 'Upload .txt'}
                      </button>
                      <span className="admin-label">
                        {chapterTextFile ? chapterTextFile.name : 'Chưa chọn file .txt'}
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
                        setChapterPage(1);
                      }}
                    >
                      <option value="">Chọn truyện</option>
                      {mangas.map(manga => <option key={manga.id} value={manga.id}>{manga.title}</option>)}
                    </select>
                  </div>
                  <div className="admin-filter-bar">
                    <input
                      value={chapterSearch}
                      onChange={e => { setChapterSearch(e.target.value); setChapterPage(1); }}
                      placeholder="Tìm số chương hoặc tiêu đề"
                    />
                    <select value={chapterTypeFilter} onChange={e => { setChapterTypeFilter(e.target.value); setChapterPage(1); }}>
                      <option value="all">Tất cả loại chương</option>
                      <option value="image">Truyện tranh / ảnh</option>
                      <option value="text">Truyện chữ</option>
                    </select>
                    <select value={chapterSort} onChange={e => { setChapterSort(e.target.value); setChapterPage(1); }}>
                      <option value="number_asc">Số chương tăng</option>
                      <option value="number_desc">Số chương giảm</option>
                      <option value="newest">Mới tạo</option>
                      <option value="views">Nhiều lượt xem</option>
                    </select>
                    <span>{chapterPaginationInfo.totalItems} chương</span>
                  </div>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Chương</th>
                          <th>Tiêu đề</th>
                          <th>Loại</th>
                          <th>Lượt xem</th>
                          <th>Nội dung</th>
                          <th>Ngày tạo</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {chapters.map(chapter => (
                          <tr key={chapter.id}>
                            <td>{chapter.chapter_number}</td>
                            <td><strong>{chapter.title || '-'}</strong></td>
                            <td>{chapter.chapter_type === 'text' ? 'Truyện chữ' : 'Ảnh'}</td>
                            <td>{chapter.view_count || 0}</td>
                            <td>
                              {chapter.chapter_type === 'text'
                                ? `${chapter.ChapterContent?.word_count || 0} từ`
                                : `${chapter.ChapterImages?.length || 0} ảnh`}
                            </td>
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
                  <Pagination
                    page={chapterPaginationInfo.page}
                    totalPages={chapterPaginationInfo.totalPages}
                    totalItems={chapterPaginationInfo.totalItems}
                    onPageChange={setChapterPage}
                  />
                </Panel>
              </section>
            )}

            {activeTab === 'comments' && (
              <section className="admin-section">
                <div className="admin-two-col">
                  <Panel title="Upload sticker">
                    <form className="admin-form" onSubmit={uploadSticker}>
                      <label>
                        Tên sticker
                        <input
                          value={stickerName}
                          onChange={e => setStickerName(e.target.value)}
                          placeholder="cat_haha"
                        />
                      </label>
                      <FileDropZone
                        label="Ảnh sticker"
                        accept="image/*"
                        file={stickerFile}
                        inputKey={stickerInputKey}
                        onFile={setStickerFile}
                        hint="Kéo ảnh sticker vào đây để upload lên Cloudinary."
                      />
                      <div className="admin-cover-note wide">
                        {stickerFile ? (
                          <span><ImageIcon size={15} /> Sẽ upload lên Cloudinary: {stickerFile.name}</span>
                        ) : (
                          <span>Ảnh sticker sẽ lưu trên Cloudinary, database chỉ lưu URL và public_id.</span>
                        )}
                      </div>
                      <div className="admin-form-actions wide">
                        <button className="admin-primary" type="submit" disabled={uploading}>
                          <Upload size={17} /> {uploading ? 'Đang upload...' : 'Upload sticker'}
                        </button>
                      </div>
                    </form>
                  </Panel>

                  <Panel title="Quản lý sticker" action={<button className="admin-icon-text" onClick={loadCommentAdminData}><RefreshCcw size={15} /> Tải lại</button>}>
                    {commentStickers.length ? (
                      <div className="admin-sticker-grid">
                        {commentStickers.map(sticker => (
                          <div className="admin-sticker-card" key={sticker.id}>
                            <img src={sticker.image_url} alt={sticker.name} />
                            <div className="admin-sticker-title">
                              <strong>{sticker.name}</strong>
                              <Badge tone={sticker.status === 'active' ? 'green' : 'gray'}>
                                {sticker.status === 'active' ? 'Đang bật' : 'Đã tắt'}
                              </Badge>
                            </div>
                            <small>{sticker.public_id || 'Không có public_id'}</small>
                            <div className="admin-sticker-actions">
                              {sticker.status === 'active' ? (
                                <button type="button" onClick={() => updateStickerStatus(sticker, 'inactive')}>Tắt</button>
                              ) : (
                                <button type="button" onClick={() => updateStickerStatus(sticker, 'active')}>Bật</button>
                              )}
                              <button type="button" className="danger" onClick={() => deleteSticker(sticker.id)}>Xóa</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="admin-empty compact">Chưa có sticker.</div>
                    )}
                  </Panel>
                </div>

                <Panel title="Bình luận mới nhất" action={<button className="admin-icon-text" onClick={loadCommentAdminData}><RefreshCcw size={15} /> Tải lại</button>}>
                  <div className="admin-filter-bar">
                    <input
                      value={commentSearch}
                      onChange={e => { setCommentSearch(e.target.value); setCommentPage(1); }}
                      placeholder="Tìm nội dung, sticker, chapter"
                    />
                    <select value={commentMangaFilter} onChange={e => { setCommentMangaFilter(e.target.value); setCommentPage(1); }}>
                      <option value="all">Tất cả truyện</option>
                      {mangas.map(manga => <option key={manga.id} value={manga.id}>{manga.title}</option>)}
                    </select>
                    <input
                      value={commentUserFilter}
                      onChange={e => { setCommentUserFilter(e.target.value); setCommentPage(1); }}
                      placeholder="Lọc theo user/email"
                    />
                    <span>{filteredComments.length}/{latestComments.length} bình luận</span>
                  </div>
                  <div className="admin-table-wrap">
                    <table className="admin-table admin-comments-table">
                      <thead>
                        <tr>
                          <th>Người dùng</th>
                          <th>Nội dung</th>
                          <th>Truyện</th>
                          <th>Thời gian</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {commentPagination.items.map(comment => (
                          <tr key={comment.id}>
                            <td>
                              <strong>{comment.User?.username || 'User'}</strong>
                              <small>{comment.User?.email || '-'}</small>
                            </td>
                            <td>
                              {editingCommentId === comment.id ? (
                                <div className="admin-comment-edit">
                                  <textarea
                                    rows="3"
                                    value={editingCommentContent}
                                    onChange={e => setEditingCommentContent(e.target.value)}
                                    placeholder="Nội dung bình luận"
                                  />
                                  {!comment.content && comment.Sticker && (
                                    <small>Để trống sẽ giữ sticker hiện tại.</small>
                                  )}
                                  <div className="admin-comment-edit-actions">
                                    <button className="admin-primary" type="button" disabled={saving} onClick={() => saveAdminComment(comment)}>
                                      <Save size={15} /> Lưu
                                    </button>
                                    <button className="admin-secondary" type="button" onClick={cancelEditComment}>
                                      Hủy
                                    </button>
                                  </div>
                                </div>
                              ) : comment.content ? (
                                <span className="admin-comment-content">{comment.content}</span>
                              ) : comment.Sticker ? (
                                <span className="admin-comment-sticker">
                                  <img src={comment.Sticker.image_url} alt={comment.Sticker.name} />
                                  {comment.Sticker.name}
                                </span>
                              ) : (
                                '-'
                              )}
                              {comment.parent_id && <small>Trả lời bình luận #{comment.parent_id}</small>}
                            </td>
                            <td>
                              <strong>{comment.Manga?.title || '-'}</strong>
                              {comment.Chapter && (
                                <small>Chapter {comment.Chapter.chapter_number} - {comment.Chapter.title || 'Không tiêu đề'}</small>
                              )}
                            </td>
                            <td>{formatDateTime(comment.created_at)}</td>
                            <td>
                              <div className="admin-row-actions">
                                <button onClick={() => updateAdminCommentStatus(comment.id, comment.status === 'hidden' ? 'visible' : 'hidden')} aria-label="An hoac hien binh luan">{comment.status === 'hidden' ? 'Hien' : 'An'}</button>
                                <button onClick={() => deleteAdminComment(comment.id)} aria-label="Xóa bình luận"><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {!commentPagination.items.length && (
                          <tr><td colSpan="5">Chưa có bình luận.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <Pagination
                    page={commentPagination.page}
                    totalPages={commentPagination.totalPages}
                    totalItems={filteredComments.length}
                    onPageChange={setCommentPage}
                  />
                </Panel>

                <Panel title="Bao cao binh luan" action={<button className="admin-icon-text" onClick={loadCommentAdminData}><RefreshCcw size={15} /> Tai lai</button>}>
                  <div className="admin-filter-bar">
                    <select value={commentReportStatusFilter} onChange={e => setCommentReportStatusFilter(e.target.value)}>
                      <option value="pending">Dang cho xu ly</option>
                      <option value="resolved">Da xu ly</option>
                      <option value="rejected">Tu choi</option>
                      <option value="all">Tat ca</option>
                    </select>
                    <span>{commentReports.length} bao cao</span>
                  </div>
                  <div className="admin-table-wrap">
                    <table className="admin-table admin-comments-table">
                      <thead>
                        <tr>
                          <th>Nguoi bao cao</th>
                          <th>Binh luan</th>
                          <th>Ly do</th>
                          <th>Trang thai</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {commentReports.map(report => (
                          <tr key={report.id}>
                            <td>
                              <strong>{report.Reporter?.username || 'User'}</strong>
                              <small>{report.Reporter?.email || '-'}</small>
                            </td>
                            <td>
                              <strong>{report.Comment?.User?.username || 'User'}</strong>
                              {report.Comment?.content ? (
                                <span className="admin-comment-content">{report.Comment.content}</span>
                              ) : report.Comment?.Sticker ? (
                                <span className="admin-comment-sticker">
                                  <img src={report.Comment.Sticker.image_url} alt={report.Comment.Sticker.name} />
                                  {report.Comment.Sticker.name}
                                </span>
                              ) : (
                                <span>-</span>
                              )}
                              <small>{report.Comment?.Manga?.title || '-'}</small>
                            </td>
                            <td>
                              <span>{report.reason}</span>
                              {report.detail && <small>{report.detail}</small>}
                            </td>
                            <td>
                              <Badge tone={report.status === 'pending' ? 'yellow' : report.status === 'resolved' ? 'green' : 'gray'}>
                                {report.status}
                              </Badge>
                            </td>
                            <td>
                              <div className="admin-row-actions">
                                {report.Comment?.id && (
                                  <button onClick={() => updateAdminCommentStatus(report.Comment.id, 'hidden')} aria-label="An binh luan bi bao cao">An</button>
                                )}
                                <button onClick={() => updateCommentReportStatus(report.id, 'resolved')} aria-label="Danh dau da xu ly"><Flag size={16} /></button>
                                <button onClick={() => updateCommentReportStatus(report.id, 'rejected')} aria-label="Tu choi bao cao"><X size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {!commentReports.length && (
                          <tr><td colSpan="5">Chua co bao cao binh luan.</td></tr>
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
                  <div className="admin-filter-bar">
                    <input
                      value={userSearch}
                      onChange={e => { setUserSearch(e.target.value); setUserPage(1); }}
                      placeholder="Tìm username hoặc email"
                    />
                    <select value={userRoleFilter} onChange={e => { setUserRoleFilter(e.target.value); setUserPage(1); }}>
                      <option value="all">Tất cả vai trò</option>
                      <option value="1">Admin</option>
                      <option value="2">User</option>
                    </select>
                    <span>{filteredUsers.length}/{users.length} người dùng</span>
                  </div>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Tài khoản</th>
                          <th>Email</th>
                          <th>Vai trò</th>
                          <th>Ngày tạo</th>
                          <th>Đổi quyền</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {userPagination.items.map(item => (
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
                            <td>
                              <div className="admin-row-actions">
                                <button
                                  disabled={Number(item.id) === Number(user?.id)}
                                  onClick={() => deleteUser(item.id)}
                                  aria-label="Xóa người dùng"
                                  title={Number(item.id) === Number(user?.id) ? 'Không thể xóa tài khoản đang đăng nhập' : 'Xóa người dùng'}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {!userPagination.items.length && (
                          <tr><td colSpan="6">Không có người dùng phù hợp.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <Pagination
                    page={userPagination.page}
                    totalPages={userPagination.totalPages}
                    totalItems={filteredUsers.length}
                    onPageChange={setUserPage}
                  />
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

function Pagination({ page, totalPages, totalItems, onPageChange }) {
  if (totalPages <= 1) {
    return <div className="admin-pagination compact">{totalItems} kết quả</div>;
  }

  return (
    <div className="admin-pagination">
      <span>{totalItems} kết quả</span>
      <div>
        <button disabled={page <= 1} onClick={() => onPageChange(page - 1)} type="button">
          Trước
        </button>
        <strong>{page}/{totalPages}</strong>
        <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} type="button">
          Sau
        </button>
      </div>
    </div>
  );
}

function TopViewList({ items, emptyText, renderTitle, renderMeta }) {
  if (!items.length) return <div className="admin-empty compact">{emptyText}</div>;

  return (
    <div className="admin-top-list">
      {items.map((item, index) => (
        <div className="admin-top-item" key={item.id || `${renderTitle(item)}-${index}`}>
          <span>{index + 1}</span>
          <div>
            <strong>{renderTitle(item)}</strong>
            <small>{renderMeta(item)}</small>
          </div>
        </div>
      ))}
    </div>
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
