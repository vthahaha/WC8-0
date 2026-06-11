import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FORMATIONS } from '../App';

export default function SetupPhase() {
  const navigate = useNavigate();
  const [selectedFormation, setSelectedFormation] = useState(null);
  const [draftSettings, setDraftSettings] = useState({
    era: 'ALL',
    country: 'ALL',
    rerolls: 3,
    hardcoreMode: false
  });

  const startDraft = () => {
    if (!selectedFormation) return;
    navigate('/draft', { state: { formation: selectedFormation, settings: draftSettings } });
  };

  return (
    <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left' }}>
      <h2 style={{ marginBottom: '2rem', textAlign: 'center' }}>Draft Setup</h2>
      
      <div className="setup-grid">
        <div className="filter-group">
          <label>Formation</label>
          <select className="filter-input" value={selectedFormation ? selectedFormation.name : ''} onChange={(e) => setSelectedFormation(FORMATIONS[e.target.value])}>
            <option value="" disabled>Select Formation</option>
            {Object.keys(FORMATIONS).map(key => <option key={key} value={key}>{key}</option>)}
          </select>
        </div>
        
        <div className="filter-group">
          <label>Rerolls</label>
          <select className="filter-input" value={draftSettings.rerolls} onChange={(e) => setDraftSettings({...draftSettings, rerolls: Number(e.target.value)})}>
            <option value={0}>0 (Hard)</option>
            <option value={1}>1</option>
            <option value={3}>3 (Normal)</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Era Filter</label>
          <select 
             className="filter-input" 
             value={draftSettings.era} 
             onChange={(e) => setDraftSettings({...draftSettings, era: e.target.value})}
             disabled={draftSettings.country !== 'ALL'}
          >
            <option value="ALL">Any Era</option>
            <option value="PRE_1970">Classic (Pre-1970)</option>
            <option value="1970_1998">Golden (1970-1998)</option>
            <option value="2000_PLUS">Modern (2000s+)</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Country Filter</label>
          <select 
             className="filter-input" 
             value={draftSettings.country} 
             onChange={(e) => setDraftSettings({...draftSettings, country: e.target.value})}
             disabled={draftSettings.era !== 'ALL'}
          >
            <option value="ALL">Any Country</option>
            <option value="Brazil">Brazil</option>
            <option value="Argentina">Argentina</option>
            <option value="Germany">Germany</option>
            <option value="Italy">Italy</option>
            <option value="France">France</option>
            <option value="Spain">Spain</option>
            <option value="England">England</option>
            <option value="Netherlands">Netherlands</option>
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center' }}>
        <input 
          type="checkbox" 
          id="hardcore" 
          checked={draftSettings.hardcoreMode} 
          onChange={(e) => setDraftSettings({...draftSettings, hardcoreMode: e.target.checked})}
          style={{ width: '20px', height: '20px' }}
        />
        <label htmlFor="hardcore" style={{ fontSize: '1.2rem', color: 'var(--danger)', fontWeight: 'bold' }}>
          Hardcore Mode (Hide Ratings)
        </label>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button 
          className={`draft-btn ${!selectedFormation ? 'disabled' : ''}`} 
          onClick={startDraft}
          disabled={!selectedFormation}
        >
          Start Draft
        </button>
      </div>
    </div>
  );
}
