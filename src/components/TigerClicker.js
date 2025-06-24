import React, { useState, useCallback, useRef } from 'react';
import './TigerClicker.css';

import catIdleImage from '../assets/images/derpy.png';
import catClickedImage from '../assets/images/derpyAhh.png';
import bird from '../assets/images/birdKpop.png';

const TigerClicker = () => {
  const [score, setScore] = useState(0);
  const [isClicked, setIsClicked] = useState(false);
  const [effects, setEffects] = useState([]);
  const [isPetting, setIsPetting] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  
  const pettingIntervalRef = useRef(null);
  const lastPetTimeRef = useRef(0);
  const mousePositionRef = useRef({ x: 0, y: 0 });

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
    }
    
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
  }, [createSparkles, createClickEffect, hasInteracted]);

  const handleCatClick = useCallback((e) => {
    if (isClicked) return;

    const clickX = e.clientX;
    const clickY = e.clientY;
    
    handleScore(clickX, clickY, e.currentTarget);
  }, [isClicked, handleScore]);

  const handleMouseDown = useCallback((e) => {
    if (!hasInteracted) {
      setHasInteracted(true);
    }
    
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
  }, [handleScore, hasInteracted]);

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

  React.useEffect(() => {
    return () => {
      if (pettingIntervalRef.current) {
        clearInterval(pettingIntervalRef.current);
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
      <div className="title">The Tiger</div>
      
      <div className="score-counter">
        Pats: <span className="score">{score}</span>
      </div>

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

      {/* Render effects */}
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
    </div>
  );
};

export default TigerClicker;