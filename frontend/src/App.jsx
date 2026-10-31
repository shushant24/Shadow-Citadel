import React, { useState } from 'react';
import LoadoutTab from './tabs/LoadoutTab';

export default function App() {
  const [activeTab, setActiveTab] = useState('loadout');
  const [tourTime, setTourTime] = useState(70);

  return (
    <div style={styles.appContainer}>
      {/* Top Navbar */}
      <nav style={styles.nav}>
        <div style={styles.logoGroup}>
          <span style={styles.logoIcon}>⚔️</span>
          <div>
            <h1 style={styles.appHeading}>SHADOW CITADEL</h1>
            <span style={styles.appSub}>Raid Score Optimizer · CS2105 Option 2</span>
          </div>
        </div>

        <div style={styles.tabsNav}>
          <button
            style={activeTab === 'map' ? styles.tabBtnActive : styles.tabBtn}
            onClick={() => setActiveTab('map')}
          >
            1. Map (Hull & TSP)
          </button>
          <button
            style={activeTab === 'matchups' ? styles.tabBtnActive : styles.tabBtn}
            onClick={() => setActiveTab('matchups')}
          >
            2. Matchups (Hungarian)
          </button>
          <button
            style={activeTab === 'loadout' ? styles.tabBtnActive : styles.tabBtn}
            onClick={() => setActiveTab('loadout')}
          >
            3. Loadout (Crafting LP)
          </button>
          <button
            style={activeTab === 'summary' ? styles.tabBtnActive : styles.tabBtn}
            onClick={() => setActiveTab('summary')}
          >
            4. Summary & Baselines
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main style={styles.main}>
        {activeTab === 'loadout' && (
          <LoadoutTab
            tourTime={tourTime}
            forceFixtureMode={false}
          />
        )}
        {activeTab !== 'loadout' && (
          <div style={styles.placeholderTab}>
            <h3>Tab: {activeTab.toUpperCase()}</h3>
            <p>Switch back to <strong>Loadout</strong> tab to inspect Part 9.</p>
            <button
              style={styles.switchBackBtn}
              onClick={() => setActiveTab('loadout')}
            >
              Go to Loadout Tab
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  appContainer: {
    minHeight: '100vh',
    backgroundColor: '#0b1120',
    color: '#f8fafc',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
  },
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 24px',
    backgroundColor: '#0f172a',
    borderBottom: '1px solid #1e293b',
    flexWrap: 'wrap',
    gap: '12px'
  },
  logoGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  logoIcon: {
    fontSize: '1.8rem'
  },
  appHeading: {
    fontSize: '1.15rem',
    fontWeight: 900,
    letterSpacing: '0.05em',
    margin: 0,
    color: '#f8fafc'
  },
  appSub: {
    fontSize: '0.75rem',
    color: '#64748b'
  },
  tabsNav: {
    display: 'flex',
    gap: '6px'
  },
  tabBtn: {
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid transparent',
    padding: '8px 14px',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer'
  },
  tabBtnActive: {
    backgroundColor: '#1e293b',
    color: '#38bdf8',
    border: '1px solid #0284c7',
    padding: '8px 14px',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: 700,
    cursor: 'pointer'
  },
  main: {
    maxWidth: '1400px',
    margin: '0 auto'
  },
  placeholderTab: {
    padding: '60px 20px',
    textAlign: 'center',
    color: '#94a3b8'
  },
  switchBackBtn: {
    backgroundColor: '#0284c7',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '12px'
  }
};
