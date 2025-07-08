import React from 'react';
import TigerClicker from './components/TigerClicker';
import './App.css';
import { Analytics } from '@vercel/analytics/react';


function App() {
  return (
    <div className="App">
      <TigerClicker />
      <Analytics />
    </div>
  );
}

export default App;