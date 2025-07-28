import React from 'react';

const Header = ({ systemTitle, systemSubtitle, onLanguageChange }) => (
  <header className="main-header">
    <div className="header-content">
      <div className="header-left">
        <h1 className="header-title" data-i18n="system_title">
          <i className="fas fa-calendar-alt"></i> {systemTitle}
        </h1>
        <p className="header-subtitle" data-i18n="system_subtitle">
          {systemSubtitle}
        </p>
      </div>
      <div className="header-right">
        <div id="languageSwitcher" className="language-switcher">
          {/* Language switcher will be implemented here */}
          <button onClick={onLanguageChange}>🌐</button>
        </div>
      </div>
    </div>
  </header>
);

export default Header; 