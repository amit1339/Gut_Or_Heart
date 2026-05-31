import { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, 
  query, where, addDoc, arrayUnion, arrayRemove
} from 'firebase/firestore';

import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { auth, firestore } from './firebase';

// Helper to handle Firebase errors gracefully
const tryFirebase = async (firebaseFunc, fallbackFunc) => {
  try {
    return await firebaseFunc();
  } catch (err) {
    console.warn("Firebase Error:", err.message, "Using local fallback.");
    return fallbackFunc();
  }
};

// Helper: ensure user doc exists in Firestore after Google auth
const ensureUserInFirestore = async (user) => {
  const userRef = doc(firestore, 'users', user.uid);
  const snap = await getDoc(userRef);
  let userData;
  if (!snap.exists()) {
    userData = { id: user.uid, name: user.displayName, avatar: user.photoURL || '😎', score: 0, streak: 0, bestStreak: 0, correct: 0, total: 0, groups: [], createdAt: new Date().toISOString() };
    await setDoc(userRef, userData);
  } else {
    userData = { id: user.uid, ...snap.data() };
    if (userData.bestStreak === undefined) {
      userData.bestStreak = userData.streak || 0;
      await updateDoc(userRef, { bestStreak: userData.bestStreak });
    }
  }
  return userData;
};

export const api = {
  loginWithGoogle: async () => {
    const provider = new GoogleAuthProvider();
    try {
      // Try popup first (works on most browsers)
      const result = await signInWithPopup(auth, provider);
      return await ensureUserInFirestore(result.user);
    } catch (popupErr) {
      if (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/popup-closed-by-user' || popupErr.message?.includes('Cross-Origin')) {
        // Fallback to redirect
        await signInWithRedirect(auth, provider);
        return null; // Page will reload, handled by checkRedirectResult
      }
      console.warn('Google login error:', popupErr.message);
      // Local fallback
      const userId = 'u_' + Math.random().toString(36).substr(2, 9);
      const userData = { id: userId, name: 'משתמש (טסט)', avatar: '😎', score: 0, streak: 0, bestStreak: 0, correct: 0, total: 0, groups: [], createdAt: new Date().toISOString() };
      localStorage.setItem('gut_or_heart_user', JSON.stringify(userData));
      return userData;
    }
  },

  checkRedirectResult: async () => {
    try {
      const result = await getRedirectResult(auth);
      if (result?.user) {
        return await ensureUserInFirestore(result.user);
      }
    } catch (err) {
      console.warn('Redirect result error:', err.message);
    }
    return null;
  },

  getUser: async (id) => {
    return tryFirebase(
      async () => {
        const docSnap = await getDoc(doc(firestore, 'users', id));
        if (docSnap.exists()) return docSnap.data();
        throw new Error('Not found');
      },
      () => {
        const user = localStorage.getItem('gut_or_heart_user');
        if (user) return JSON.parse(user);
        throw new Error('Not found');
      }
    );
  },

  getMatches: async () => {
    const F = (code) => `https://flagcdn.com/w40/${code}.png`;

    // Full World Cup 2026 Group Stage schedule
    const ALL_MATCHES = [
      { id: 'wc01', teamA: 'מקסיקו', teamB: 'דרום אפריקה', teamAFlag: F('mx'), teamBFlag: F('za'), date: '2026-06-11T22:00', group: 'A' },
      { id: 'wc02', teamA: 'קוריאה הדרומית', teamB: 'צ\'כיה', teamAFlag: F('kr'), teamBFlag: F('cz'), date: '2026-06-12T05:00', group: 'A' },
      { id: 'wc03', teamA: 'קנדה', teamB: 'בוסניה', teamAFlag: F('ca'), teamBFlag: F('ba'), date: '2026-06-12T22:00', group: 'B' },
      { id: 'wc04', teamA: 'ארה"ב', teamB: 'פרגוואי', teamAFlag: F('us'), teamBFlag: F('py'), date: '2026-06-13T04:00', group: 'D' },
      { id: 'wc05', teamA: 'קטאר', teamB: 'שוויץ', teamAFlag: F('qa'), teamBFlag: F('ch'), date: '2026-06-13T22:00', group: 'B' },
      { id: 'wc06', teamA: 'ברזיל', teamB: 'מרוקו', teamAFlag: F('br'), teamBFlag: F('ma'), date: '2026-06-14T01:00', group: 'C' },
      { id: 'wc07', teamA: 'האיטי', teamB: 'סקוטלנד', teamAFlag: F('ht'), teamBFlag: F('gb-sct'), date: '2026-06-14T04:00', group: 'C' },
      { id: 'wc08', teamA: 'ארגנטינה', teamB: 'אורוגוואי', teamAFlag: F('ar'), teamBFlag: F('uy'), date: '2026-06-14T19:00', group: 'E' },
      { id: 'wc09', teamA: 'צרפת', teamB: 'קולומביה', teamAFlag: F('fr'), teamBFlag: F('co'), date: '2026-06-14T22:00', group: 'D' },
      { id: 'wc10', teamA: 'ספרד', teamB: 'אקוודור', teamAFlag: F('es'), teamBFlag: F('ec'), date: '2026-06-15T01:00', group: 'E' },
      { id: 'wc11', teamA: 'גרמניה', teamB: 'יפן', teamAFlag: F('de'), teamBFlag: F('jp'), date: '2026-06-15T19:00', group: 'F' },
      { id: 'wc12', teamA: 'פורטוגל', teamB: 'סנגל', teamAFlag: F('pt'), teamBFlag: F('sn'), date: '2026-06-15T22:00', group: 'F' },
      { id: 'wc13', teamA: 'אנגליה', teamB: 'ניגריה', teamAFlag: F('gb-eng'), teamBFlag: F('ng'), date: '2026-06-16T01:00', group: 'G' },
      { id: 'wc14', teamA: 'הולנד', teamB: 'קרואטיה', teamAFlag: F('nl'), teamBFlag: F('hr'), date: '2026-06-16T19:00', group: 'G' },
      { id: 'wc15', teamA: 'בלגיה', teamB: 'דנמרק', teamAFlag: F('be'), teamBFlag: F('dk'), date: '2026-06-16T22:00', group: 'H' },
      { id: 'wc16', teamA: 'איטליה', teamB: 'איראן', teamAFlag: F('it'), teamBFlag: F('ir'), date: '2026-06-17T01:00', group: 'H' },
      { id: 'wc17', teamA: 'מקסיקו', teamB: 'צ\'כיה', teamAFlag: F('mx'), teamBFlag: F('cz'), date: '2026-06-17T19:00', group: 'A' },
      { id: 'wc18', teamA: 'דרום אפריקה', teamB: 'קוריאה הדרומית', teamAFlag: F('za'), teamBFlag: F('kr'), date: '2026-06-17T22:00', group: 'A' },
      { id: 'wc19', teamA: 'קנדה', teamB: 'שוויץ', teamAFlag: F('ca'), teamBFlag: F('ch'), date: '2026-06-18T01:00', group: 'B' },
      { id: 'wc20', teamA: 'בוסניה', teamB: 'קטאר', teamAFlag: F('ba'), teamBFlag: F('qa'), date: '2026-06-18T19:00', group: 'B' },
      { id: 'wc21', teamA: 'ברזיל', teamB: 'סקוטלנד', teamAFlag: F('br'), teamBFlag: F('gb-sct'), date: '2026-06-18T22:00', group: 'C' },
      { id: 'wc22', teamA: 'מרוקו', teamB: 'האיטי', teamAFlag: F('ma'), teamBFlag: F('ht'), date: '2026-06-19T01:00', group: 'C' },
      { id: 'wc23', teamA: 'ארה"ב', teamB: 'קולומביה', teamAFlag: F('us'), teamBFlag: F('co'), date: '2026-06-19T19:00', group: 'D' },
      { id: 'wc24', teamA: 'פרגוואי', teamB: 'צרפת', teamAFlag: F('py'), teamBFlag: F('fr'), date: '2026-06-19T22:00', group: 'D' },
    ];

    const getNext6Matches = (sourceMatches) => {
      const now = new Date();
      const upcoming = sourceMatches.filter(m => !m.date || new Date(m.date) > now || m.status === 'upcoming');
      const toShow = upcoming.length >= 6 ? upcoming.slice(0, 6) : sourceMatches.slice(0, 6);

      const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
      const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
      
      return toShow.map(m => {
        if (!m.date) return m;
        const d = new Date(m.date);
        const dayDiff = Math.floor((d - now) / (1000 * 60 * 60 * 24));
        let timeLabel;
        if (dayDiff <= 0) timeLabel = `היום, ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
        else if (dayDiff === 1) timeLabel = `מחר, ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
        else timeLabel = `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]}, ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
        return { ...m, time: timeLabel, status: 'upcoming' };
      });
    };

    return tryFirebase(
      async () => {
        const snap = await getDocs(collection(firestore, 'matches'));
        if (snap.empty) {
          return getNext6Matches(ALL_MATCHES);
        }
        const matches = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return getNext6Matches(matches);
      },
      () => {
        return getNext6Matches(ALL_MATCHES);
      }
    );
  },

  getQuestions: async (matchId) => {
    const generateQuestions = () => {
      const ALL_MATCHES = [
        { id: 'wc01', teamA: 'מקסיקו', teamB: 'דרום אפריקה' },
        { id: 'wc02', teamA: 'קוריאה הדרומית', teamB: 'צ\'כיה' },
        { id: 'wc03', teamA: 'קנדה', teamB: 'בוסניה' },
        { id: 'wc04', teamA: 'ארה"ב', teamB: 'פרגוואי' },
        { id: 'wc05', teamA: 'קטאר', teamB: 'שוויץ' },
        { id: 'wc06', teamA: 'ברזיל', teamB: 'מרוקו' },
        { id: 'wc07', teamA: 'האיטי', teamB: 'סקוטלנד' },
        { id: 'wc08', teamA: 'ארגנטינה', teamB: 'אורוגוואי' },
        { id: 'wc09', teamA: 'צרפת', teamB: 'קולומביה' },
        { id: 'wc10', teamA: 'ספרד', teamB: 'אקוודור' },
        { id: 'wc11', teamA: 'גרמניה', teamB: 'יפן' },
        { id: 'wc12', teamA: 'פורטוגל', teamB: 'סנגל' },
        { id: 'wc13', teamA: 'אנגליה', teamB: 'ניגריה' },
        { id: 'wc14', teamA: 'הולנד', teamB: 'קרואטיה' },
        { id: 'wc15', teamA: 'בלגיה', teamB: 'דנמרק' },
        { id: 'wc16', teamA: 'איטליה', teamB: 'איראן' },
        { id: 'wc17', teamA: 'מקסיקו', teamB: 'צ\'כיה' },
        { id: 'wc18', teamA: 'דרום אפריקה', teamB: 'קוריאה הדרומית' },
        { id: 'wc19', teamA: 'קנדה', teamB: 'שוויץ' },
        { id: 'wc20', teamA: 'בוסניה', teamB: 'קטאר' },
        { id: 'wc21', teamA: 'ברזיל', teamB: 'סקוטלנד' },
        { id: 'wc22', teamA: 'מרוקו', teamB: 'האיטי' },
        { id: 'wc23', teamA: 'ארה"ב', teamB: 'קולומביה' },
        { id: 'wc24', teamA: 'פרגוואי', teamB: 'צרפת' },
      ];
      const m = ALL_MATCHES.find(x => x.id === matchId) || ALL_MATCHES[0];
      const ta = m.teamA;
      const tb = m.teamB;

      const winnerQ = { id: `${matchId}_q1`, text: 'מי תנצח את המשחק בסוף?', category: 'winner', points: 20, emoji: '🏆', optionA: ta, optionB: tb };

      const pool = [
        { text: 'מי תכבוש ראשונה?', category: 'goals', points: 10, emoji: '⚽', optionA: ta, optionB: tb },
        { text: 'האם יהיו מעל 2.5 שערים במשחק?', category: 'goals', points: 10, emoji: '🔥', optionA: 'ברור!', optionB: 'ממש לא' },
        { text: 'האם שופט ה-VAR יפסול שער?', category: 'drama', points: 15, emoji: '📺', optionA: 'כן, בדוק', optionB: 'המשחק יזרום' },
        { text: 'איזה קהל יעשה יותר רעש?', category: 'fans', points: 5, emoji: '🏟️', optionA: `האוהדים של ${ta}`, optionB: `האוהדים של ${tb}` },
        { text: 'מי תספוג יותר כרטיסים צהובים?', category: 'cards', points: 10, emoji: '🟨', optionA: ta, optionB: tb },
        { text: 'האם נראה כרטיס אדום במשחק?', category: 'cards', points: 20, emoji: '🟥', optionA: 'כן, משחק אגרסיבי', optionB: 'לא יהיה אדום' },
        { text: 'מי תרוץ יותר קילומטרים?', category: 'stats', points: 10, emoji: '🏃', optionA: ta, optionB: tb },
        { text: 'האם יובקע שער ב-15 הדקות הראשונות?', category: 'time', points: 15, emoji: '⏱️', optionA: 'כן, פתיחה סוערת', optionB: 'לא, יתחילו רגוע' },
        { text: 'האם נראה פנדל מוחמץ?', category: 'drama', points: 25, emoji: '🥅', optionA: 'כן!', optionB: 'אין סיכוי' },
        { text: 'איזו קבוצה תיראה יותר לחוצה במחצית הראשונה?', category: 'gut', points: 10, emoji: '🧠', optionA: ta, optionB: tb },
        { text: 'מי המאמן שיתעצבן ראשון על השופט?', category: 'gut', points: 10, emoji: '😤', optionA: `המאמן של ${ta}`, optionB: `המאמן של ${tb}` },
        { text: 'האם שחקן מחליף יכבוש שער?', category: 'players', points: 15, emoji: '🔄', optionA: 'כן, חילוף מנצח', optionB: 'לא' },
        { text: 'האם יובקע שער בתוספת הזמן (דקה 90+)?', category: 'drama', points: 20, emoji: '⏳', optionA: 'דרמה בסיום!', optionB: 'לא' },
        { text: 'מי תחזיק יותר בכדור (פוזשן)?', category: 'stats', points: 10, emoji: '📊', optionA: ta, optionB: tb },
        { text: 'האם נראה שער בבעיטה חופשית ישירה?', category: 'magic', points: 20, emoji: '✨', optionA: 'שער לחיבורים!', optionB: 'לא' },
        { text: 'מי תבצע יותר עבירות?', category: 'cards', points: 10, emoji: '⚔️', optionA: ta, optionB: tb },
        { text: 'האם המשחק יסתיים בתיקו?', category: 'winner', points: 15, emoji: '🤝', optionA: 'כן, יגמר שוויון', optionB: 'תהיה הכרעה' }
      ];

      // Seed random choice based on matchId to keep questions stable on reload
      const hash = parseInt(matchId.replace(/\D/g, '') || '1');
      const selected = [];
      for (let i = 0; i < 5; i++) {
        const index = (hash * 7 + i * 5) % pool.length;
        const qItem = pool[index];
        selected.push({
          ...qItem,
          id: `${matchId}_q${i + 2}`
        });
      }

      return [winnerQ, ...selected];
    };

    return tryFirebase(
      async () => {
        const q = query(collection(firestore, 'predictions'), where('matchId', '==', matchId));
        const snap = await getDocs(q);
        if (snap.empty) {
          const generated = generateQuestions();
          const uploaded = [];
          for (const item of generated) {
            const questionData = {
              id: item.id,
              matchId,
              text: item.text,
              category: item.category,
              points: item.points,
              emoji: item.emoji,
              optionA: item.optionA,
              optionB: item.optionB,
              usersA: [],
              usersB: [],
              correctAnswer: ""
            };
            await setDoc(doc(firestore, 'predictions', item.id), questionData);
            uploaded.push(questionData);
          }
          return uploaded;
        }
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      },
      () => {
        const allPreds = JSON.parse(localStorage.getItem('gut_preds_v2') || '[]');
        const filtered = allPreds.filter(q => q.matchId === matchId);
        if (filtered.length === 0) {
          const generated = generateQuestions();
          const initial = generated.map(item => ({
            id: item.id,
            matchId,
            text: item.text,
            category: item.category,
            points: item.points,
            emoji: item.emoji,
            optionA: item.optionA,
            optionB: item.optionB,
            usersA: [],
            usersB: [],
            correctAnswer: ""
          }));
          const newAllPreds = [...allPreds, ...initial];
          localStorage.setItem('gut_preds_v2', JSON.stringify(newAllPreds));
          return initial;
        }
        return filtered;
      }
    );
  },

  getPredictions: async (userId) => {
    return tryFirebase(
      async () => {
        const qA = query(collection(firestore, 'predictions'), where('usersA', 'array-contains', userId));
        const qB = query(collection(firestore, 'predictions'), where('usersB', 'array-contains', userId));
        const [snapA, snapB] = await Promise.all([getDocs(qA), getDocs(qB)]);
        
        const preds = [];
        snapA.docs.forEach(docSnap => {
          const q = { id: docSnap.id, ...docSnap.data() };
          preds.push({
            id: `${userId}_${q.id}`,
            userId,
            questionId: q.id,
            answer: 'A',
            isCorrect: q.correctAnswer ? (q.correctAnswer === 'A') : null,
            question: q
          });
        });
        snapB.docs.forEach(docSnap => {
          const q = { id: docSnap.id, ...docSnap.data() };
          preds.push({
            id: `${userId}_${q.id}`,
            userId,
            questionId: q.id,
            answer: 'B',
            isCorrect: q.correctAnswer ? (q.correctAnswer === 'B') : null,
            question: q
          });
        });
        return preds;
      },
      () => {
        const allPreds = JSON.parse(localStorage.getItem('gut_preds_v2') || '[]');
        const preds = [];
        allPreds.forEach(q => {
          const uA = q.usersA || [];
          const uB = q.usersB || [];
          if (uA.includes(userId)) {
            preds.push({
              id: `${userId}_${q.id}`,
              userId,
              questionId: q.id,
              answer: 'A',
              isCorrect: q.correctAnswer ? (q.correctAnswer === 'A') : null,
              question: q
            });
          } else if (uB.includes(userId)) {
            preds.push({
              id: `${userId}_${q.id}`,
              userId,
              questionId: q.id,
              answer: 'B',
              isCorrect: q.correctAnswer ? (q.correctAnswer === 'B') : null,
              question: q
            });
          }
        });
        return preds;
      }
    );
  },

  getUnanswered: async (userId, matchId) => {
    const questions = await api.getQuestions(matchId);
    return questions.filter(q => {
      const uA = q.usersA || [];
      const uB = q.usersB || [];
      return !uA.includes(userId) && !uB.includes(userId);
    });
  },

  getAllQuestions: async (userId) => {
    const matches = await api.getMatches();
    const predictions = await api.getPredictions(userId);
    const predMap = {};
    predictions.forEach(p => predMap[p.questionId] = p.answer);

    // For simplicity, just return the mock questions for each match
    return matches.map(match => {
      // Get the questions for this match synchronously (in mock) or we can just fetch
      // But since getAllQuestions is just for display, let's keep it simple
      return {
        ...match,
        questions: [] 
      };
    });
  },

  submitPrediction: async (userId, questionId, answer) => {
    return tryFirebase(
      async () => {
        const qRef = doc(firestore, 'predictions', questionId);
        if (answer === 'A') {
          await updateDoc(qRef, {
            usersA: arrayUnion(userId),
            usersB: arrayRemove(userId)
          });
        } else {
          await updateDoc(qRef, {
            usersB: arrayUnion(userId),
            usersA: arrayRemove(userId)
          });
        }
        return { success: true };
      },
      () => {
        const allPreds = JSON.parse(localStorage.getItem('gut_preds_v2') || '[]');
        const qIndex = allPreds.findIndex(q => q.id === questionId);
        if (qIndex > -1) {
          const q = allPreds[qIndex];
          const uA = q.usersA || [];
          const uB = q.usersB || [];
          if (answer === 'A') {
            if (!uA.includes(userId)) uA.push(userId);
            const bIdx = uB.indexOf(userId);
            if (bIdx > -1) uB.splice(bIdx, 1);
          } else {
            if (!uB.includes(userId)) uB.push(userId);
            const aIdx = uA.indexOf(userId);
            if (aIdx > -1) uA.splice(aIdx, 1);
          }
          q.usersA = uA;
          q.usersB = uB;
          allPreds[qIndex] = q;
          localStorage.setItem('gut_preds_v2', JSON.stringify(allPreds));
        }
        return { success: true };
      }
    );
  },

  createGroup: async (name, creatorId, poolAmount, emoji) => {
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const groupData = { name, creatorId, poolAmount, emoji, inviteCode, members: [creatorId] };
    
    // Ensure user doc exists first, then save group
    const userRef = doc(firestore, 'users', creatorId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      // Create user doc in Firestore from localStorage data
      const localUser = JSON.parse(localStorage.getItem('gut_or_heart_user') || localStorage.getItem('gut_heart_user') || '{}');
      await setDoc(userRef, { id: creatorId, name: localUser.name || 'משתמש', avatar: localUser.avatar || '😎', score: 0, streak: 0, bestStreak: 0, correct: 0, total: 0, groups: [] });
    }
    
    const groupRef = await addDoc(collection(firestore, 'groups'), groupData);
    await setDoc(userRef, { groups: arrayUnion(groupRef.id) }, { merge: true });
    return { id: groupRef.id, inviteCode };
  },

  getUserGroups: async (userId) => {
    return tryFirebase(
      async () => {
        const userSnap = await getDoc(doc(firestore, 'users', userId));
        const groupIds = userSnap.data()?.groups || [];
        const groups = [];
        for (const gid of groupIds) {
          const gSnap = await getDoc(doc(firestore, 'groups', gid));
          if (gSnap.exists()) {
            const gData = gSnap.data();
            const members = [];
            if (gData.members) {
              for (const uid of gData.members) {
                const uSnap = await getDoc(doc(firestore, 'users', uid));
                if (uSnap.exists()) members.push(uSnap.data());
              }
            }
            members.sort((a, b) => {
              if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
              return (b.bestStreak || 0) - (a.bestStreak || 0);
            });
            const userRank = members.findIndex(m => m.id === userId) + 1;
            groups.push({
              id: gSnap.id,
              ...gData,
              memberCount: members.length,
              totalPool: members.length * (gData.poolAmount || 0),
              userRank: userRank > 0 ? userRank : 1,
              leaderboard: members.slice(0, 3).map(m => ({ userId: m.id, name: m.name, score: m.score, avatar: m.avatar, bestStreak: m.bestStreak || 0 }))
            });
          }
        }
        return groups;
      },
      () => {
        return JSON.parse(localStorage.getItem('gut_groups') || '[]');
      }
    );
  },

  joinGroup: async (userId, inviteCode) => {
    return tryFirebase(
      async () => {
        const q = query(collection(firestore, 'groups'), where('inviteCode', '==', inviteCode.toUpperCase()));
        const snap = await getDocs(q);
        if (snap.empty) throw new Error('הקוד לא נמצא. נסה שוב.');
        const groupDoc = snap.docs[0];
        // Add user to group members
        await setDoc(groupDoc.ref, { members: arrayUnion(userId) }, { merge: true });
        // Add group to user's groups list
        await setDoc(doc(firestore, 'users', userId), { groups: arrayUnion(groupDoc.id) }, { merge: true });
        return { id: groupDoc.id, success: true };
      },
      () => {
        const groups = JSON.parse(localStorage.getItem('gut_groups') || '[]');
        const g = groups.find(g => g.inviteCode === inviteCode.toUpperCase());
        if (!g) throw new Error('הקוד לא נמצא. נסה שוב.');
        return { id: g.id, success: true };
      }
    );
  },

  getGroup: async (id) => {
    return tryFirebase(
      async () => {
        const docSnap = await getDoc(doc(firestore, 'groups', id));
        if (!docSnap.exists()) throw new Error('Group not found');
        const gData = docSnap.data();
        const members = [];
        if (gData.members) {
          for (const uid of gData.members) {
            const uSnap = await getDoc(doc(firestore, 'users', uid));
            if (uSnap.exists()) members.push(uSnap.data());
          }
        }
        members.sort((a, b) => {
          if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
          return (b.bestStreak || 0) - (a.bestStreak || 0);
        });
        return {
          id: docSnap.id,
          ...gData,
          memberCount: members.length,
          totalPool: members.length * (gData.poolAmount || 0),
          leaderboard: members.slice(0, 3).map(m => ({ userId: m.id, name: m.name, score: m.score, avatar: m.avatar, bestStreak: m.bestStreak || 0 }))
        };
      },
      () => {
        const groups = JSON.parse(localStorage.getItem('gut_groups') || '[]');
        return groups.find(g => g.id === id) || { id, name: 'קבוצה לדוגמה', emoji: '⚽', poolAmount: 100, inviteCode: 'ABCDEF', members: [] };
      }
    );
  },

  getLeaderboard: async (groupId) => {
    return tryFirebase(
      async () => {
        const group = await api.getGroup(groupId);
        if (!group.members) return [];
        const users = [];
        for (const uid of group.members) {
          const uSnap = await getDoc(doc(firestore, 'users', uid));
          if (uSnap.exists()) users.push(uSnap.data());
        }
        return users.sort((a, b) => {
          if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
          return (b.bestStreak || 0) - (a.bestStreak || 0);
        });
      },
      () => {
        const localUser = JSON.parse(localStorage.getItem('gut_or_heart_user') || '{}');
        return [localUser];
      }
    );
  },

  getGlobalLeaderboard: async () => {
    return tryFirebase(
      async () => {
        const snap = await getDocs(collection(firestore, 'users'));
        const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return users.sort((a, b) => {
          if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
          return (b.bestStreak || 0) - (a.bestStreak || 0);
        });
      },
      () => {
        const localUser = JSON.parse(localStorage.getItem('gut_or_heart_user') || localStorage.getItem('gut_heart_user') || '{}');
        return [localUser];
      }
    );
  },

  getStats: async (userId) => {
    return tryFirebase(
      async () => {
        const user = await api.getUser(userId);
        const allUsers = await api.getGlobalLeaderboard();
        const rank = allUsers.findIndex(u => u.id === userId) + 1;
        const totalPredictions = user.total || 0;
        const correctPredictions = user.correct || 0;
        const accuracy = totalPredictions > 0 ? Math.round((correctPredictions / totalPredictions) * 100) : 0;
        return { rank, totalScore: user.score || 0, accuracy, streak: user.streak || 0, totalPredictions };
      },
      () => ({ rank: 1, totalScore: 0, accuracy: 0, streak: 0, totalPredictions: 0 })
    );
  },

  recalculateUserStats: async (userId) => {
    const qA = query(collection(firestore, 'predictions'), where('usersA', 'array-contains', userId));
    const qB = query(collection(firestore, 'predictions'), where('usersB', 'array-contains', userId));
    const [snapA, snapB] = await Promise.all([getDocs(qA), getDocs(qB)]);

    const userPreds = [];
    snapA.docs.forEach(d => {
      userPreds.push({ ...d.data(), userAns: 'A' });
    });
    snapB.docs.forEach(d => {
      userPreds.push({ ...d.data(), userAns: 'B' });
    });

    userPreds.sort((a, b) => a.id.localeCompare(b.id));

    let score = 0;
    let correct = 0;
    let total = 0;
    let streak = 0;
    let bestStreak = 0;

    for (const pred of userPreds) {
      if (pred.correctAnswer && pred.correctAnswer !== "") {
        total += 1;
        const isCorrect = (pred.userAns === pred.correctAnswer);
        if (isCorrect) {
          score += (pred.points || 0);
          correct += 1;
          streak += 1;
          bestStreak = Math.max(bestStreak, streak);
        } else {
          streak = 0;
        }
      }
    }

    const uRef = doc(firestore, 'users', userId);
    await updateDoc(uRef, {
      score,
      correct,
      total,
      streak,
      bestStreak
    });

    return { score, correct, total, streak, bestStreak };
  },

  recalculateUserStatsLocal: (userId) => {
    const allPreds = JSON.parse(localStorage.getItem('gut_preds_v2') || '[]');
    const userPreds = [];
    allPreds.forEach(q => {
      const uA = q.usersA || [];
      const uB = q.usersB || [];
      if (uA.includes(userId)) {
        userPreds.push({ ...q, userAns: 'A' });
      } else if (uB.includes(userId)) {
        userPreds.push({ ...q, userAns: 'B' });
      }
    });

    userPreds.sort((a, b) => a.id.localeCompare(b.id));

    let score = 0;
    let correct = 0;
    let total = 0;
    let streak = 0;
    let bestStreak = 0;

    for (const pred of userPreds) {
      if (pred.correctAnswer && pred.correctAnswer !== "") {
        total += 1;
        const isCorrect = (pred.userAns === pred.correctAnswer);
        if (isCorrect) {
          score += (pred.points || 0);
          correct += 1;
          streak += 1;
          bestStreak = Math.max(bestStreak, streak);
        } else {
          streak = 0;
        }
      }
    }

    const localUser = JSON.parse(localStorage.getItem('gut_or_heart_user') || localStorage.getItem('gut_heart_user') || '{}');
    if (localUser.id === userId) {
      localUser.score = score;
      localUser.correct = correct;
      localUser.total = total;
      localUser.streak = streak;
      localUser.bestStreak = bestStreak;
      localStorage.setItem('gut_or_heart_user', JSON.stringify(localUser));
      localStorage.setItem('gut_heart_user', JSON.stringify(localUser));
    }

    return { score, correct, total, streak, bestStreak };
  },

  resolveQuestion: async (questionId, correctAnswer) => {
    return tryFirebase(
      async () => {
        const qRef = doc(firestore, 'predictions', questionId);
        const qSnap = await getDoc(qRef);
        if (!qSnap.exists()) throw new Error('Question not found');
        const qData = qSnap.data();
        const prevAnswer = qData.correctAnswer || "";

        if (prevAnswer === correctAnswer) return { success: true, message: 'No change' };

        // 1. Update correct answer
        await updateDoc(qRef, { correctAnswer });

        // 2. Gather all users who answered this question
        const usersA = qData.usersA || [];
        const usersB = qData.usersB || [];
        const allUsers = [...new Set([...usersA, ...usersB])];

        // 3. Recalculate stats for everyone chronologically
        for (const uid of allUsers) {
          await api.recalculateUserStats(uid);
        }

        return { success: true };
      },
      () => {
        const allPreds = JSON.parse(localStorage.getItem('gut_preds_v2') || '[]');
        const qIndex = allPreds.findIndex(x => x.id === questionId);
        if (qIndex === -1) throw new Error('Question not found');
        const qData = allPreds[qIndex];
        const prevAnswer = qData.correctAnswer || "";

        if (prevAnswer === correctAnswer) return { success: true, message: 'No change' };

        qData.correctAnswer = correctAnswer;
        allPreds[qIndex] = qData;
        localStorage.setItem('gut_preds_v2', JSON.stringify(allPreds));

        const usersA = qData.usersA || [];
        const usersB = qData.usersB || [];
        const allUsers = [...new Set([...usersA, ...usersB])];

        for (const uid of allUsers) {
          api.recalculateUserStatsLocal(uid);
        }

        return { success: true };
      }
    );
  }
};
