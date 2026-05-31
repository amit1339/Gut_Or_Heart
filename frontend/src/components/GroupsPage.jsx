import { useState, useEffect } from 'react';
import { api } from '../api';

const EMOJIS = ['🏆', '⚽', '🚀', '🔥', '👑', '🥳', '🍕', '🍻', '🥇', '🎯', '🎬', '🎭'];

export default function GroupsPage({ user, onOpenGroup }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [globalLeaderboard, setGlobalLeaderboard] = useState([]);

  // Form states
  const [createName, setCreateName] = useState('');
  const [createPool, setCreatePool] = useState(50);
  const [createEmoji, setCreateEmoji] = useState('🏆');
  const [createError, setCreateError] = useState(null);

  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState(null);

  const fetchGroups = () => {
    setLoading(true);
    Promise.all([
      api.getUserGroups(user.id),
      api.getGlobalLeaderboard()
    ])
      .then(([groupsRes, leaderboardRes]) => {
        setGroups(groupsRes);
        setGlobalLeaderboard(leaderboardRes);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch groups:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchGroups();
  }, [user.id]);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!createName.trim()) {
      setCreateError('יש להזין שם לקבוצה');
      return;
    }
    setCreateError(null);

    try {
      const newGroup = await api.createGroup(
        createName.trim(),
        user.id,
        Number(createPool),
        createEmoji
      );
      setShowCreateModal(false);
      // Reset form
      setCreateName('');
      setCreatePool(50);
      setCreateEmoji('🏆');
      // Directly open the created group
      onOpenGroup(newGroup.id);
    } catch (err) {
      setCreateError(err.message || 'יצירת הקבוצה נכשלה');
    }
  };

  const handleJoinGroup = async (e) => {
    e.preventDefault();
    const formattedCode = joinCode.trim().toUpperCase();
    if (!formattedCode) {
      setJoinError('יש להזין קוד הזמנה');
      return;
    }
    setJoinError(null);

    try {
      const joinedGroup = await api.joinGroup(user.id, formattedCode);
      setShowJoinModal(false);
      setJoinCode('');
      // Directly open the joined group
      onOpenGroup(joinedGroup.id);
    } catch (err) {
      setJoinError(err.message || 'הצטרפות לקבוצה נכשלה. בדוק את הקוד.');
    }
  };

  const renderAvatar = (avatar) => {
    if (!avatar) return '😎';
    if (typeof avatar === 'string' && avatar.startsWith('http')) {
      return <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />;
    }
    return avatar;
  };

  return (
    <div className="groups-page animate-slide-in">
      {/* GLOBAL LEADERBOARD */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 12px', background: 'linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)', color: 'white', borderRadius: 16 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800, textAlign: 'center' }}>
          🌍 טבלת המובילים הגלובלית
        </h3>
        {globalLeaderboard.length === 0 ? (
          <p style={{ textAlign: 'center', opacity: 0.8, fontSize: 14 }}>אין משתמשים עדיין</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {globalLeaderboard.slice(0, 10).map((member, index) => {
              const memberId = member.id || `g_${index}`;
              const isMe = memberId === user.id;
              return (
                <div key={memberId} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: isMe ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                  borderRadius: 10, padding: '8px 12px',
                  border: isMe ? '2px solid rgba(255,255,255,0.5)' : 'none',
                }}>
                  <span style={{ fontWeight: 800, fontSize: 14, minWidth: 28 }}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </span>
                  <span style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, background: 'rgba(255,255,255,0.2)', overflow: 'hidden', flexShrink: 0 }}>
                    {renderAvatar(member.avatar)}
                  </span>
                  <span style={{ flex: 1, fontWeight: isMe ? 800 : 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {member.name || 'משתמש'} {isMe && '(אתה)'}
                    <span style={{ 
                      background: 'rgba(255,255,255,0.2)', 
                      padding: '2px 8px', 
                      borderRadius: 12, 
                      fontSize: 11, 
                      fontWeight: 700 
                    }} title={`שיא רצף: ${member.bestStreak || 0}`}>
                      🔥 {member.bestStreak || 0}
                    </span>
                  </span>
                  <span style={{ fontWeight: 800, fontSize: 14 }}>{member.score || 0} נק׳</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 className="section-title" style={{ margin: 0 }}>הקבוצות שלי 👥</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }} onClick={() => setShowJoinModal(true)}>
            הצטרף 👥
          </button>
          <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 13 }} onClick={() => setShowCreateModal(true)}>
            צור קבוצה 🏆
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <span style={{ fontSize: 32, display: 'inline-block', animation: 'spin 1s linear infinite' }}>🔄</span>
          <p style={{ marginTop: 8, color: 'var(--text-secondary)' }}>טוען קבוצות...</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="card empty-state">
          <div className="emoji">👥</div>
          <h3>אין עדיין קבוצות!</h3>
          <p>
            כדורגל זה משחק חברתי! צור קבוצה לחבר'ה מהמשרד או למשפחה, או הצטרף לקבוצה קיימת עם קוד הזמנה.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button className="btn btn-secondary" onClick={() => setShowJoinModal(true)}>
              הצטרף עם קוד 🔑
            </button>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              צור קבוצה חדשה 🏆
            </button>
          </div>
        </div>
      ) : (
        <div className="groups-list">
          {groups.map(group => (
            <div
              key={group.id}
              className="group-card"
              onClick={() => onOpenGroup(group.id)}
            >
              <div className="group-header">
                <div className="group-name">
                  <span className="emoji">{group.emoji}</span>
                  <h3>{group.name}</h3>
                </div>
                <div className="streak-badge" style={{ background: 'var(--primary)' }}>
                  מקום #{group.userRank}
                </div>
              </div>

              <div className="group-meta">
                <div className="group-meta-item">
                  <span className="icon">👤</span>
                  <span>{group.memberCount} חברים</span>
                </div>
                <div className="group-meta-item">
                  <span className="icon">💰</span>
                  <span>קופה: {group.totalPool} ₪</span>
                </div>
              </div>

              {group.leaderboard && group.leaderboard.length > 0 && (
                <div className="mini-leaderboard">
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    מובילי הקבוצה:
                  </div>
                  {group.leaderboard.map((leader, index) => (
                    <div key={leader.userId} className="mini-leader">
                      <span className={`rank r${index + 1}`}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </span>
                      <span style={{ 
                        width: 24, height: 24, 
                        borderRadius: '50%', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: 14, 
                        marginLeft: 6, 
                        background: 'rgba(0,0,0,0.05)', 
                        overflow: 'hidden', 
                        flexShrink: 0 
                      }}>
                        {renderAvatar(leader.avatar)}
                      </span>
                      <span className="name">{leader.name}</span>
                      <span className="score" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {leader.score} נק׳
                        <span style={{ 
                          fontSize: 12, 
                          color: 'var(--secondary)', 
                          fontWeight: 700 
                        }} title={`שיא רצף: ${leader.bestStreak || 0}`}>
                          🔥{leader.bestStreak || 0}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* CREATE GROUP MODAL */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            <h2 className="modal-title">צור קבוצה חדשה 🏆</h2>

            <form onSubmit={handleCreateGroup}>
              {createError && (
                <div style={{ color: 'var(--secondary)', background: 'rgba(255,107,107,0.1)', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 14, fontWeight: 600 }}>
                  ⚠️ {createError}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">שם הקבוצה</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder='למשל: הבנות מהמשרד, המשפחה המורחבת...'
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  maxLength={30}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">סכום השתתפות לקופה (₪)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="50"
                  value={createPool}
                  onChange={(e) => setCreatePool(Math.max(0, e.target.value))}
                  min={0}
                  required
                />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>
                  כל חבר שיצטרף לקבוצה יוסיף סכום זה לקופה המשותפת.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ marginBottom: 12 }}>בחר סמל לקבוצה</label>
                <div className="emoji-picker">
                  {EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      className={`emoji-option ${createEmoji === emoji ? 'selected' : ''}`}
                      onClick={() => setCreateEmoji(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-large" style={{ marginTop: 8 }}>
                להקים את הקבוצה! 🚀
              </button>
            </form>
          </div>
        </div>
      )}

      {/* JOIN GROUP MODAL */}
      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowJoinModal(false)}>×</button>
            <h2 className="modal-title">הצטרף לקבוצה קיימת 👥</h2>

            <form onSubmit={handleJoinGroup}>
              {joinError && (
                <div style={{ color: 'var(--secondary)', background: 'rgba(255,107,107,0.1)', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 14, fontWeight: 600 }}>
                  ⚠️ {joinError}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">קוד הזמנה (6 תווים)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="למשל: X8Y3ZA"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  style={{ textTransform: 'uppercase', letterSpacing: 4, textAlign: 'center', fontSize: 22, fontWeight: 800 }}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-large" style={{ marginTop: 8 }}>
                כנס לקבוצה 🔑
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
