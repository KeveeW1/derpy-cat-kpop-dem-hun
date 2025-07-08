import React, { useState, useCallback, useRef, useEffect } from 'react';
import './TigerClicker.css';
import { collection, addDoc, getDocs, orderBy, limit, query, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

import catIdleImage from '../assets/images/derpy.png';
import catClickedImage from '../assets/images/derpyAhh.png';
import bird from '../assets/images/birdKpop.png';

const TigerClicker = () => {
  const [score, setScore] = useState(0);
  const [isClicked, setIsClicked] = useState(false);
  const [effects, setEffects] = useState([]);
  const [isPetting, setIsPetting] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameActive, setGameActive] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false); 
  const [loading, setLoading] = useState(false);
  
  const pettingIntervalRef = useRef(null);
  const lastPetTimeRef = useRef(0);
  const mousePositionRef = useRef({ x: 0, y: 0 });
  const timerRef = useRef(null);

  // firebase
  useEffect(() => {
    console.log('Leaderboard listener mounted');
    let isMounted = true;
  
    const q = query(
      collection(db, 'leaderboard'),
      orderBy('score', 'desc'),
      limit(10)
    );
  
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!isMounted) return;  // avoid state update after unmount
      console.log('Leaderboard snapshot update received');
  
      const scores = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date ? new Date(doc.data().date.seconds * 1000).toLocaleDateString() : new Date().toLocaleDateString()
      }));
      setLeaderboard(scores);
    });
  
    return () => {
      console.log('Leaderboard listener unsubscribed');
      isMounted = false;
      unsubscribe();
    };
  }, []);
  

  const createSparkles = useCallback((x, y) => {
    const newSparkles = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const distance = 20 + Math.random() * 30;
      const sparkleX = x + Math.cos(angle) * distance;
      const sparkleY = y + Math.sin(angle) * distance;
      
      newSparkles.push({
        id: Date.now() + i + Math.random(),
        x: sparkleX,
        y: sparkleY,
        delay: Math.random() * 0.3
      });
    }

    setEffects(prev => [...prev, ...newSparkles]);

    setTimeout(() => {
      setEffects(prev => prev.filter(effect => !newSparkles.find(sparkle => sparkle.id === effect.id)));
    }, 800);
  }, []);

  const createClickEffect = useCallback((x, y, points = 1, isBonus = false) => {
    const clickEffect = {
      id: Date.now() + 'click' + Math.random(),
      x: x - 10,
      y: y - 10,
      type: 'click',
      points: points,
      isBonus: isBonus
    };

    setEffects(prev => [...prev, clickEffect]);

    setTimeout(() => {
      setEffects(prev => prev.filter(effect => effect.id !== clickEffect.id));
    }, 1000);
  }, []);

  const handleScore = useCallback((x, y, clickedElement) => {
    if (!hasInteracted) {
      setHasInteracted(true);
      setGameActive(true);
    }
    
    // don't score if game is not active
    if (!gameActive && hasInteracted) return;
    
    let points = 1;
    let isBonus = false;
    
    if (clickedElement) {
      const rect = clickedElement.getBoundingClientRect();
      const relativeX = x - rect.left;
      const relativeY = y - rect.top;
      
      const xPercent = (relativeX / rect.width) * 100;
      const yPercent = (relativeY / rect.height) * 100;
      
      // tongue area detection
      if (xPercent >= 45 && xPercent <= 55 && yPercent >= 65 && yPercent <= 85) {
        points = 2;
        isBonus = true;
      }
    }
    
    setScore(prev => prev + points);
    setIsClicked(true);
    
    if (isBonus) {
      createSparkles(x, y);
      createSparkles(x + 15, y - 15);
      createSparkles(x - 15, y + 15);
    } else {
      createSparkles(x, y);
    }
    
    createClickEffect(x, y, points, isBonus);

    setTimeout(() => {
      setIsClicked(false);
    }, 150);
  }, [createSparkles, createClickEffect, hasInteracted, gameActive]);

  const handleCatClick = useCallback((e) => {
    if (isClicked) return;

    const clickX = e.clientX;
    const clickY = e.clientY;
    
    handleScore(clickX, clickY, e.currentTarget);
  }, [isClicked, handleScore]);

  const handleMouseDown = useCallback((e) => {
    if (!hasInteracted) {
      setHasInteracted(true);
      setGameActive(true);
    }
    
    if (!gameActive && hasInteracted) return;
    
    setIsPetting(true);
    lastPetTimeRef.current = Date.now();
    mousePositionRef.current = { x: e.clientX, y: e.clientY };

    pettingIntervalRef.current = setInterval(() => {
      const now = Date.now();
      if (now - lastPetTimeRef.current >= 500) {
        handleScore(mousePositionRef.current.x, mousePositionRef.current.y, e.currentTarget);
        lastPetTimeRef.current = now;
      }
    }, 100);
  }, [handleScore, hasInteracted, gameActive]);

  const handleMouseMove = useCallback((e) => {
    if (isPetting) {
      mousePositionRef.current = { x: e.clientX, y: e.clientY };
      
      // sparkles during drag
      if (Math.random() < 0.3) {
        createSparkles(e.clientX, e.clientY);
      }
    }
  }, [isPetting, createSparkles]);

  const handleMouseUp = useCallback(() => {
    setIsPetting(false);
    if (pettingIntervalRef.current) {
      clearInterval(pettingIntervalRef.current);
      pettingIntervalRef.current = null;
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (isPetting) {
      setIsPetting(false);
      if (pettingIntervalRef.current) {
        clearInterval(pettingIntervalRef.current);
        pettingIntervalRef.current = null;
      }
    }
  }, [isPetting]);

  //timer
  React.useEffect(() => {
    if (gameActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameActive(false);
            setShowNameInput(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameActive, timeLeft]);

  // name submission - NOW SAVES TO FIREBASE
  const handleNameSubmit = useCallback(async () => {
    if (playerName.trim()) {
      setLoading(true);
      const newEntry = {
        name: playerName.trim(),
        score: score,
        date: new Date()
      };
      
      try {
        // Save to Firebase
        await addDoc(collection(db, 'leaderboard'), newEntry);
        console.log('Score saved to Firebase!');
      } catch (error) {
        console.log('Error saving to Firebase:', error);
        // Fallback to local storage
        const localScores = JSON.parse(localStorage.getItem('tigerClickerLeaderboard') || '[]');
        const updatedScores = [...localScores, { ...newEntry, date: newEntry.date.toLocaleDateString() }]
          .sort((a, b) => b.score - a.score)
          .slice(0, 10);
        localStorage.setItem('tigerClickerLeaderboard', JSON.stringify(updatedScores));
        setLeaderboard(updatedScores);
      }
      
      setLoading(false);
    }
    
    setShowNameInput(false);
    setShowLeaderboard(true);
  }, [playerName, score]);

  const handleCancel = useCallback(() => {
    setShowNameInput(false);
    setTimeLeft(60);
    setScore(0);
    setGameActive(false);
    setHasInteracted(false);
  }, []);

  // new game
  const startNewGame = useCallback(() => {
    setShowLeaderboard(false);
    setTimeLeft(60);
    setScore(0);
    setGameActive(false);
    setHasInteracted(false);
    setPlayerName('');
  }, []);

  React.useEffect(() => {
    return () => {
      if (pettingIntervalRef.current) {
        clearInterval(pettingIntervalRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (isPetting) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isPetting, handleMouseMove, handleMouseUp]);

  // random sparkles on idle
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (!isClicked && !isPetting && Math.random() < 0.1) {
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * window.innerHeight;
        createSparkles(x, y);
      }
    }, 300);

    return () => clearInterval(interval);
  }, [isClicked, isPetting, createSparkles]);

  return (
    <div className="game-container">
      <div className="title">Jinu's Tiger</div>
      
      <div className="score-counter">
        Pats: <span className="score">{score}</span>
      </div>

      <div className="timer">
        Time: <span className="time">{timeLeft}s</span>
      </div>
      
      <button 
        className="leaderboard-btn"
        onClick={() => setShowLeaderboard(true)}
      >
        🏆
      </button>

      <div 
        className={`cat-container ${isClicked ? 'clicked' : ''} ${isPetting ? 'petting' : ''}`}
        onClick={handleCatClick}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onContextMenu={(e) => e.preventDefault()}>
        <img 
          src={isClicked ? catClickedImage : catIdleImage}
          className="cat-image"
          alt="Blue Tiger"
          draggable={false}
        />
      </div>

      {/* instructions - only show if user hasn't interacted yet */}
      {!hasInteracted && (
        <div className="instructions">
          click or hold and drag to pet the tiger!<br />
          click the tongue for +2 bonus points!
        </div>
      )}

      <div className="bird">
        <img 
          src={bird}
          alt="bird"
          className="bird-image"
          draggable={false}
        />
      </div>

      <footer className="footer">
        <p>from the netflix movie: kpop demon hunters!</p>
        <p>made by @tech.kei</p>
      </footer>

      {effects.map(effect => (
        effect.type === 'click' ? (
          <div
            key={effect.id}
            className={`click-effect ${effect.isBonus ? 'bonus-effect' : ''}`}
            style={{
              left: `${effect.x}px`,
              top: `${effect.y}px`
            }}>
            +{effect.points}
          </div>
        ) : (
          <div
            key={effect.id}
            className="sparkle"
            style={{
              left: `${effect.x}px`,
              top: `${effect.y}px`,
              animationDelay: `${effect.delay}s`
            }}/>
        )
      ))}

      {/* leaderboard popup */}
      {showNameInput && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>time's up! 🎉</h2>
            <p>you scored <strong>{score} pats</strong>!</p>
            <p>enter your name for the leaderboard:</p>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Your name"
              maxLength={20}
              onKeyPress={(e) => e.key === 'Enter' && handleNameSubmit()}
              autoFocus
              disabled={loading}
            />
            <div className="modal-buttons">
              <button onClick={handleNameSubmit} className="submit-btn" disabled={loading}>
                {loading ? 'Saving...' : 'submit score 🏆'}
              </button>
              <button onClick={handleCancel} className="cancel-btn" disabled={loading}>
                🔄 continue playing
              </button>
            </div>
          </div>
        </div>
      )}

      {showLeaderboard && (
        <div className="modal-overlay" onClick={() => setShowLeaderboard(false)}>
          <div className="modal leaderboard-modal" onClick={(e) => e.stopPropagation()}>
            <h2>LEADERBOARD 🏆</h2>
            <div className="leaderboard-list">
              {leaderboard.length === 0 ? (
                <div className="leaderboard-empty">
                  <p>Loading scores...</p>
                  <p>Be the first to play and set a record! 🐅</p>
                </div>
              ) : (
                leaderboard.map((entry, index) => (
                  <div key={entry.id || index} className={`leaderboard-entry ${index < 3 ? 'top-three' : ''}`}>
                    <span className="rank">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </span>
                    <span className="name">{entry.name}</span>
                    <span className="score">{entry.score} pats</span>
                    <span className="date">{entry.date}</span>
                  </div>
                ))
              )}
            </div>
            <div className="modal-buttons">
              <button onClick={startNewGame} className="new-game-btn">
                🐯 New Game
              </button>
              <button onClick={() => setShowLeaderboard(false)} className="close-btn">
                ✕ Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TigerClicker;