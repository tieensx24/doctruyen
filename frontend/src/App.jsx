import React, { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import Auth from './pages/Auth.jsx';
import Home from './pages/Home.jsx';
import Admin from './pages/Admin.jsx';
import Categories from './pages/Categories.jsx';
import MangaDetail from './pages/MangaDetail.jsx';
import Following from './pages/Following.jsx';
import Search from './pages/Search.jsx';
import ChapterReader from './pages/ChapterReader.jsx';
import ReadingHistory from './pages/ReadingHistory.jsx';
import api, { isOk } from './api/client.js';
import { getChapterPath, getMangaPath, getMangaSlug } from './utils/paths.js';

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('doctruyen_user') || 'null');
  } catch {
    return null;
  }
}

function MangaDetailRoute(props) {
  const { mangaSlug } = useParams();
  return <MangaDetail {...props} mangaId={mangaSlug} />;
}

function ChapterReaderRoute(props) {
  const { chapterId, mangaSlug, chapterSlug } = useParams();
  return <ChapterReader {...props} chapterId={chapterId || chapterSlug} mangaSlug={mangaSlug} />;
}

function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getStoredUser);

  useEffect(() => {
    async function verifyStoredToken() {
      const token = localStorage.getItem('doctruyen_token');

      if (!token) {
        localStorage.removeItem('doctruyen_user');
        setUser(null);
        return;
      }

      try {
        const response = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!isOk(response)) throw new Error('Invalid token');

        setUser(response.data);
        localStorage.setItem('doctruyen_user', JSON.stringify(response.data));
      } catch {
        localStorage.removeItem('doctruyen_token');
        localStorage.removeItem('doctruyen_user');
        setUser(null);
      }
    }

    verifyStoredToken();
  }, []);

  const goHome = () => navigate('/');
  const goAuth = () => navigate('/dang-nhap');
  const goAdmin = () => navigate('/admin');
  const goMangaList = () => navigate('/truyen');
  const goCategories = () => navigate('/the-loai');
  const goReadingHistory = () => navigate('/lich-su-doc');
  const goFollowing = () => navigate('/theo-doi');
  const goDetail = manga => navigate(getMangaPath(manga));
  const goMangaInfo = manga => {
    const slug = getMangaSlug(manga);
    navigate(slug ? `/truyen/${slug}/thong-tin` : '/truyen');
  };
  const goChapter = (chapter, manga) => navigate(getChapterPath(chapter, manga));
  const goSearch = keyword => {
    const query = keyword.trim();
    navigate(query ? `/search?q=${encodeURIComponent(query)}` : '/search');
  };

  function handleLoginSuccess(nextUser) {
    setUser(nextUser);
    navigate(nextUser?.role_id === 1 ? '/admin' : '/');
  }

  function handleLogout() {
    setUser(null);
    navigate('/');
  }

  const commonProps = {
    user,
    onGoHome: goHome,
    onGoAuth: goAuth,
    onGoAdmin: goAdmin,
    onGoMangaList: goMangaList,
    onGoCategories: goCategories,
    onGoReadingHistory: goReadingHistory,
    onGoFollowing: goFollowing,
    onGoDetail: goDetail,
    onGoMangaInfo: goMangaInfo,
    onGoChapter: goChapter,
    onSearchSubmit: goSearch,
    onLogout: handleLogout,
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Home
            user={user}
            onGoHome={goHome}
            onGoAuth={goAuth}
            onGoAdmin={goAdmin}
            onGoMangaList={goMangaList}
            onGoCategories={goCategories}
            onGoReadingHistory={goReadingHistory}
            onGoFollowing={goFollowing}
            onGoDetail={goDetail}
            onGoMangaInfo={goMangaInfo}
            onGoChapter={goChapter}
            onSearchSubmit={goSearch}
            onLogout={handleLogout}
          />
        }
      />
      <Route
        path="/dang-nhap"
        element={<Auth onGoHome={goHome} onLoginSuccess={handleLoginSuccess} />}
      />
      <Route
        path="/admin"
        element={<Admin onGoHome={goHome} onGoAuth={goAuth} onLogout={handleLogout} />}
      />
      <Route path="/truyen" element={<Categories {...commonProps} variant="list" />} />
      <Route path="/the-loai" element={<Categories {...commonProps} variant="categories" />} />
      <Route path="/search" element={<Search {...commonProps} />} />
      <Route path="/truyen/:mangaSlug" element={<MangaDetailRoute {...commonProps} />} />
      <Route path="/truyen/:mangaSlug/thong-tin" element={<MangaDetailRoute {...commonProps} />} />
      <Route path="/truyen/:mangaSlug/:chapterSlug" element={<ChapterReaderRoute {...commonProps} />} />
      <Route path="/chapter/:chapterId" element={<ChapterReaderRoute {...commonProps} />} />
      <Route path="/lich-su-doc" element={<ReadingHistory {...commonProps} />} />
      <Route path="/theo-doi" element={<Following {...commonProps} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
