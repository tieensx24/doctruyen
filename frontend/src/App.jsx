import React, { useState } from 'react';
import Auth from './pages/Auth.jsx';
import Home from './pages/Home.jsx';
import Admin from './pages/Admin.jsx';

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('doctruyen_user') || 'null');
  } catch {
    return null;
  }
}

function App() {
  const [page, setPage] = useState('home');
  const [user, setUser] = useState(getStoredUser);

  function handleLoginSuccess(nextUser) {
    setUser(nextUser);
    setPage(nextUser?.role_id === 1 ? 'admin' : 'home');
  }

  function handleLogout() {
    setUser(null);
    setPage('home');
  }

  if (page === 'auth') {
    return <Auth onGoHome={() => setPage('home')} onLoginSuccess={handleLoginSuccess} />;
  }

  if (page === 'admin') {
    return (
      <Admin
        onGoHome={() => setPage('home')}
        onGoAuth={() => setPage('auth')}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <Home
      user={user}
      onGoAuth={() => setPage('auth')}
      onGoAdmin={() => setPage('admin')}
      onLogout={handleLogout}
    />
  );
}

export default App;
