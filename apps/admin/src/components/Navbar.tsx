import React from 'react';
import { AdminTab } from '../types.js';

interface NavbarProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  companyName?: string;
  totalEmployees: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  companyName = 'Acme Technologies',
  totalEmployees
}) => {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="brand-wrapper">
          <div className="brand-icon">W</div>
          <div>
            <div className="brand-title">WorkforcePro</div>
            <div className="tenant-badge">
              <span style={{ color: '#10b981' }}>●</span>
              <span>{companyName}</span>
            </div>
          </div>
        </div>

        <nav className="nav-tabs" aria-label="Admin Navigation">
          <button
            type="button"
            className={`nav-tab-btn ${currentTab === 'employees' ? 'active' : ''}`}
            onClick={() => onSelectTab('employees')}
          >
            <span>👥</span>
            <span>Employees ({totalEmployees})</span>
          </button>

          <button
            type="button"
            className={`nav-tab-btn ${currentTab === 'organization' ? 'active' : ''}`}
            onClick={() => onSelectTab('organization')}
          >
            <span>🏢</span>
            <span>Departments & Shifts</span>
          </button>

          <button
            type="button"
            className={`nav-tab-btn ${currentTab === 'import' ? 'active' : ''}`}
            onClick={() => onSelectTab('import')}
          >
            <span>📤</span>
            <span>Bulk Import</span>
          </button>
        </nav>

        <div className="user-pill">
          <div className="user-avatar">HR</div>
          <div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Sarah Jenkins</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>HR Administrator</div>
          </div>
        </div>
      </div>
    </header>
  );
};
