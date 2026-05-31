import { useState, useEffect } from 'react';
import './index.css';
import { api } from './api';
import WelcomePage from './components/WelcomePage';
import SwipePage from './components/SwipePage';
import GroupsPage from './components/GroupsPage';
import GroupDetail from './components/GroupDetail';
import ProfilePage from './components/ProfilePage';
import BottomNav from './components/BottomNav';

function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('swipe');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      // Check if returning from Google redirect login
      const redirectUser = await api.checkRedirectResult();
      if (redirectUser) {
        setUser(redirectUser);
        localStorage.setItem('gut_heart_user', JSON.stringify(redirectUser));
        setLoading(false);
        return;
      }
      
      const savedUser = localStorage.getItem('gut_heart_user');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (e) { localStorage.removeItem('gut_heart_user'); }
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleLogin = async () => {
    try {
      const newUser = await api.loginWithGoogle();
      if (newUser) {
        setUser(newUser);
        localStorage.setItem('gut_heart_user', JSON.stringify(newUser));
      }
      // If null, redirect is happening — page will reload
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('gut_heart_user');
    setUser(null);
    setCurrentPage('swipe');
    setSelectedGroup(null);
  };

  const openGroup = (groupId) => {
    setSelectedGroup(groupId);
    setCurrentPage('group-detail');
  };

  const backToGroups = () => {
    setSelectedGroup(null);
    setCurrentPage('groups');
  };

  if (loading) return null;
  if (!user) return <WelcomePage onRegister={handleLogin} />;

  const renderPage = () => {
    switch (currentPage) {
      case 'swipe': return <SwipePage user={user} />;
      case 'groups': return <GroupsPage user={user} onOpenGroup={openGroup} />;
      case 'group-detail': return <GroupDetail user={user} groupId={selectedGroup} onBack={backToGroups} />;
      case 'profile': return <ProfilePage user={user} onLogout={handleLogout} />;
      default: return <SwipePage user={user} />;
    }
  };

  const renderAvatar = (avatar) => {
    if (!avatar) return '😎';
    if (avatar.startsWith('http')) {
      return <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />;
    }
    return avatar;
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-logo">
          <img src="/logo.png" alt="GoalFriend Logo" className="app-logo-img" />
          <span className="app-logo-text">GoalFriend</span>
        </div>
        <button className="header-avatar" onClick={() => setCurrentPage('profile')} style={{ padding: user.avatar?.startsWith('http') ? 0 : undefined, overflow: 'hidden' }}>
          {renderAvatar(user.avatar)}
        </button>
      </header>
      <main className="page-content page-active">
        {renderPage()}
      </main>
      <BottomNav
        active={currentPage === 'group-detail' ? 'groups' : currentPage}
        onChange={(page) => { setSelectedGroup(null); setCurrentPage(page); }}
      />
    </div>
  );
}

export default App;
