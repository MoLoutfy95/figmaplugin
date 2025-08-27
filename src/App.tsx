import React, { useState } from 'react';
import './App.css';

function App() {
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const toggleFormat = (format: string) => {
    setSelectedFormats(prev => 
      prev.includes(format) 
        ? prev.filter(f => f !== format)
        : [...prev, format]
    );
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div className={`app ${isDarkMode ? 'dark' : 'light'}`}>
      <div className="container">
        <div className="header">
          <div className="logo-section">
            <div className="logo">DT</div>
            <div className="title-section">
              <div className="h-title">Design Token Converter</div>
              <div className="h-sub">Convert Figma tokens to CSS, Dart, Kotlin, SwiftUI</div>
            </div>
          </div>
          <div className="header-actions">
            <button onClick={toggleTheme} className="theme-toggle">
              {isDarkMode ? '🌙' : '☀️'}
            </button>
            <button className="close-btn">✖</button>
          </div>
        </div>

        <div className="drop-zone">
          <h3>Drop a JSON file</h3>
          <p>or click to choose — single file only</p>
          <button className="choose-btn">Choose file</button>
        </div>

        <div className="format-grid">
          {['CSS', 'Dart', 'Kotlin', 'SwiftUI'].map(format => (
            <div 
              key={format}
              className={`format-chip ${selectedFormats.includes(format.toLowerCase()) ? 'selected' : ''}`}
              onClick={() => toggleFormat(format.toLowerCase())}
            >
              <span>{format}</span>
            </div>
          ))}
        </div>

        <button className="convert-btn">Convert</button>

        <button className="sample-btn">
          📋 Load Sample JSON
        </button>

        <div className="action-row">
          <button className="export-btn">Export ZIP</button>
          <button className="push-btn">Push to GitHub</button>
        </div>

        <div className="input-group">
          <label className="input-label">GitHub Personal Access Token</label>
          <input className="input-field" placeholder="ghp_xxxxxxxxxxxxxxxxx" />
        </div>

        <div className="input-group">
          <label className="input-label">Repository URL</label>
          <input className="input-field" placeholder="https://github.com/username/repo" />
        </div>

        <button className="push-final-btn">Push to GitHub</button>
      </div>
    </div>
  );
}

export default App;