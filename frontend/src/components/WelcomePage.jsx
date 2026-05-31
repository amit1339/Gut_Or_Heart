import { useState } from 'react';
import { FcGoogle } from 'react-icons/fc';

const AVATARS = ['😎', '🤩', '🥳', '😜', '🤠', '🦁', '🐯', '🦊', '🐸', '🎃', '👻', '🤖', '👑', '⚡', '🔥', '💎'];

export default function WelcomePage({ onRegister }) {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    await onRegister();
    setLoading(false);
  };

  return (
    <div className="welcome-page">
      <img src="/logo.png" alt="GoalFriend Logo" className="welcome-logo" />
      <h1 className="welcome-title">GoalFriend</h1>
      <p className="welcome-subtitle">
        המשחק החברתי של המונדיאל!
        <br />
        בלי מספרים מסובכים, בלי יחסים עשרוניים.
        <br />
        רק אינטואיציה, כיף, וחברים 🎉
      </p>

      <div style={{ width: '100%', maxWidth: 320, marginTop: 40 }} className="animate-slide-in">
        <button 
          onClick={handleGoogleLogin} 
          className="btn btn-primary btn-large" 
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'white', color: '#333' }}
        >
          <FcGoogle style={{ width: 24, height: 24 }} />
          {loading ? 'מתחבר...' : 'התחבר עם Google'}
        </button>
      </div>
    </div>
  );
}
