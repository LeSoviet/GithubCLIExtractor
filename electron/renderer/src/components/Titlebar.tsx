import { useTheme } from '../context/ThemeContext';
import { useState } from 'react';
import './Titlebar.css';

export default function Titlebar() {
  const { theme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleMinimize = () => {
    window.electronAPI.send('window-minimize');
  };

  const handleMaximize = () => {
    window.electronAPI.send('window-maximize');
  };

  const handleClose = () => {
    window.electronAPI.send('window-close');
  };

  const handleReload = () => {
    window.electronAPI.send('reload-app');
    setMenuOpen(false);
  };

  const handleDevTools = () => {
    window.electronAPI.send('toggle-dev-tools');
    setMenuOpen(false);
  };

  return (
    <div className={`titlebar titlebar-${theme}`}>
      <div className="titlebar-content">
        <div className="menu-button-wrapper">
          <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} title="Menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          {menuOpen && (
            <div className={`dropdown-menu dropdown-menu-${theme}`}>
              <button className="menu-item" onClick={handleReload}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0114.85-3.36M20.49 15a9 9 0 01-14.85 3.36"></path>
                </svg>
                Reload
              </button>
              <button className="menu-item" onClick={handleDevTools}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="12 3 20 7.5 20 16.5 12 21 4 16.5 4 7.5 12 3"></polyline>
                  <line x1="12" y1="12" x2="20" y2="7.5"></line>
                  <line x1="12" y1="12" x2="12" y2="21"></line>
                  <line x1="12" y1="12" x2="4" y2="7.5"></line>
                </svg>
                Dev Tools
              </button>
            </div>
          )}
        </div>
        <span className="titlebar-title">GitHub Extractor</span>
      </div>
      <div className="titlebar-controls">
        <button className="titlebar-button minimize" onClick={handleMinimize} title="Minimize">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
        <button className="titlebar-button maximize" onClick={handleMaximize} title="Maximize">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          </svg>
        </button>
        <button className="titlebar-button close" onClick={handleClose} title="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
  );
}
