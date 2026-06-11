import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { User, Shield, Target, Activity, RotateCcw, ShieldAlert, Star } from 'lucide-react';
import SquadPitch from './SquadPitch';
import { getFlagUrl } from '../utils/flags';
import { useLocation, useNavigate } from 'react-router-dom';

const API_URL = 'https://wc8-0.onrender.com/api';

const positionIcons = {
  'GK': <Shield size={14} />,
  'DEF': <Shield size={14} />,
  'MID': <Activity size={14} />,
  'FWD': <Target size={14} />
};

const WILDCARD_MAPPINGS = {
  'DEF': ['CB', 'LB', 'RB', 'LWB', 'RWB', 'SW'],
  'MID': ['CDM', 'CM', 'CAM', 'LM', 'RM'],
  'FWD': ['LW', 'RW', 'SS', 'ST', 'CF', 'LF', 'RF']
};

const LENIENT_MAPPINGS = {
  'RW': ['LW', 'LM', 'RM'],
  'LW': ['RW', 'LM', 'RM'],
  'RM': ['LM', 'LW', 'RW', 'RB'],
  'LM': ['RM', 'LW', 'RW', 'LB'],
  'RB': ['RM', 'LB'],
  'LB': ['LM', 'RB'],
  'CDM': ['CM'],
  'CAM': ['CM'],
  'CM': ['CAM', 'CDM'],
  'CF': ['ST'],
  'LWB': ['LB', 'RB', 'LM', 'RM'],
  'RWB': ['RB', 'LB', 'RM', 'LM']
};

const getEligibleSlots = (advancedPosStr) => {
  if (!advancedPosStr) return [];
  const parts = advancedPosStr.split(',').map(p => p.trim());
  const eligible = new Set();
  parts.forEach(p => {
    eligible.add(p);
    if (WILDCARD_MAPPINGS[p]) {
      WILDCARD_MAPPINGS[p].forEach(wildcardPos => eligible.add(wildcardPos));
    }
    if (LENIENT_MAPPINGS[p]) {
      LENIENT_MAPPINGS[p].forEach(lenientPos => eligible.add(lenientPos));
    }
  });
  return Array.from(eligible);
};

const ADVANCED_TO_GENERIC = {
  'GK': 'GK',
  'CB': 'DEF', 'LB': 'DEF', 'RB': 'DEF', 'LWB': 'DEF', 'RWB': 'DEF', 'SW': 'DEF', 'DEF': 'DEF',
  'CDM': 'MID', 'CM': 'MID', 'CAM': 'MID', 'LM': 'MID', 'RM': 'MID', 'MID': 'MID',
  'LW': 'FWD', 'RW': 'FWD', 'SS': 'FWD', 'ST': 'FWD', 'FWD': 'FWD', 'CF': 'FWD', 'LF': 'FWD', 'RF': 'FWD'
};

const getPrimaryGenericPosition = (advancedPosStr) => {
  const parts = advancedPosStr.split(',').map(p => p.trim());
  if (parts.length > 0 && ADVANCED_TO_GENERIC[parts[0]]) {
     return ADVANCED_TO_GENERIC[parts[0]];
  }
  return 'MID';
};

export default function DraftPhase() {
  const location = useLocation();
  const navigate = useNavigate();
  const { formation, settings } = location.state || {};
  
  useEffect(() => {
    if (!formation) {
      navigate('/');
    }
  }, [formation, navigate]);

  const flatFormation = useMemo(() => formation ? formation.rows.flat() : [], [formation]);
  
  const [squad, setSquad] = useState(Array(11).fill(null));
  const [round, setRound] = useState(1);
  const [currentTeam, setCurrentTeam] = useState(null);
  const [teamPlayers, setTeamPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rerollsLeft, setRerollsLeft] = useState(settings?.rerolls ?? 3);

  // Filters
  const [filterPos, setFilterPos] = useState('ALL');
  const [filterOvr, setFilterOvr] = useState(0);

  const fetchRandomTeam = async () => {
    setLoading(true);
    setSelectedPlayer(null);
    try {
      const { era, country } = settings || {};
      const response = await axios.get(`${API_URL}/draft/team`, {
         params: { era, country }
      });
      setCurrentTeam(response.data.team);
      setTeamPlayers(response.data.players);
    } catch (err) {
      console.error("Error fetching team", err);
      if (err.response?.status === 404) {
          setCurrentTeam("No matching teams found");
          setTeamPlayers([]);
      } else {
          setCurrentTeam("Error loading team");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReroll = () => {
    if (rerollsLeft > 0) {
      setRerollsLeft(prev => prev - 1);
      fetchRandomTeam();
    }
  };

  useEffect(() => {
    fetchRandomTeam();
  }, [round]);

  const isPositionFull = (pos) => {
    const capacity = flatFormation.filter(p => p === pos).length;
    const filled = squad.filter((p, i) => p !== null && flatFormation[i] === pos).length;
    return filled >= capacity;
  };

  const handlePlayerSelect = (player) => {
    const eligible = getEligibleSlots(player.position);
    const hasAvailableSlot = eligible.some(pos => !isPositionFull(pos));
    if (!hasAvailableSlot) return; // Prevent selecting if full
    setSelectedPlayer({ ...player, team_name: currentTeam });
  };

  const handleSlotSelect = (index) => {
    if (!selectedPlayer) return;
    if (squad[index] !== null) return; // Slot filled
    
    const requiredPos = flatFormation[index];
    const eligible = getEligibleSlots(selectedPlayer.position);
    if (!eligible.includes(requiredPos)) return; // Strict position logic
    
    const newSquad = [...squad];
    newSquad[index] = selectedPlayer;
    setSquad(newSquad);
    
    if (round < 11) {
      setRound(round + 1);
    } else {
      navigate('/simulate', { state: { squad: newSquad, formation, settings } });
    }
  };

  const getCardTier = (rating) => {
    if (rating >= 90) return 'tier-icon';
    if (rating >= 85) return 'tier-gold-rare';
    if (rating >= 80) return 'tier-gold';
    if (rating >= 75) return 'tier-silver-rare';
    return 'tier-silver';
  };

  // Filter & Group logic
  const filteredPlayers = useMemo(() => {
    return teamPlayers.filter(p => {
      const primaryGeneric = getPrimaryGenericPosition(p.position);
      if (filterPos !== 'ALL' && primaryGeneric !== filterPos) return false;
      if (p.rating < filterOvr) return false;
      return true;
    });
  }, [teamPlayers, filterPos, filterOvr]);

  const groupedPlayers = useMemo(() => {
    const groups = { FWD: [], MID: [], DEF: [], GK: [] };
    filteredPlayers.forEach(p => {
      const primary = getPrimaryGenericPosition(p.position);
      if (groups[primary]) groups[primary].push(p);
    });
    // Sort each group by rating descending
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => b.rating - a.rating);
    });
    return groups;
  }, [filteredPlayers]);

  return (
    <div className="draft-layout-grid">
      <div className="draft-container">
        <div className="glass-panel">
        <div className="draft-header">
          <h2>Draft Phase</h2>
          <div className="round-indicator">Round {round} / 11</div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>Scouting historical team...</div>
        ) : (
          <>
            <div className="team-display">
              {currentTeam !== "No matching teams found" && currentTeam !== "Error loading team" && (
                <img 
                  src={getFlagUrl(currentTeam)} 
                  alt="Flag" 
                  style={{ width: '40px', borderRadius: '4px', marginBottom: '0.5rem', boxShadow: '0 2px 5px rgba(0,0,0,0.5)' }} 
                />
              )}
              <h3>{currentTeam}</h3>
              <p style={{ color: 'var(--text-muted)' }}>Select ONE player to draft into your squad</p>

              {(settings?.rerolls > 0) && (
                <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                   <button 
                      className={`draft-btn ${rerollsLeft === 0 ? 'disabled' : ''}`}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', backgroundColor: rerollsLeft === 0 ? 'var(--bg-lighter)' : 'var(--accent)' }}
                      onClick={handleReroll}
                      disabled={rerollsLeft === 0 || loading}
                   >
                      <RotateCcw size={14} style={{ display: 'inline', marginRight: '0.3rem', verticalAlign: 'middle' }} />
                      Reroll Team ({rerollsLeft} left)
                   </button>
                </div>
              )}
            </div>

            <div className="filter-bar">
              <div className="filter-group">
                <label>Position:</label>
                <select className="filter-input" value={filterPos} onChange={(e) => setFilterPos(e.target.value)}>
                  <option value="ALL">All</option>
                  <option value="FWD">FWD</option>
                  <option value="MID">MID</option>
                  <option value="DEF">DEF</option>
                  <option value="GK">GK</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Min OVR:</label>
                <select className="filter-input" value={filterOvr} onChange={(e) => setFilterOvr(Number(e.target.value))}>
                  <option value="0">All</option>
                  <option value="75">75+</option>
                  <option value="80">80+</option>
                  <option value="85">85+</option>
                  <option value="90">90+</option>
                </select>
              </div>
            </div>

            {['FWD', 'MID', 'DEF', 'GK'].map(posGroup => {
              if (groupedPlayers[posGroup].length === 0) return null;
              return (
                <div key={posGroup} className="pos-group">
                  <h4>{posGroup}s</h4>
                  <div className="players-list">
                    {groupedPlayers[posGroup].map(player => {
                      const eligible = getEligibleSlots(player.position);
                      const isFull = eligible.every(pos => isPositionFull(pos));
                      const isSelected = selectedPlayer?.id === player.id;
                      return (
                        <div 
                          key={player.id} 
                          className={`player-list-item ${settings?.hardcoreMode ? 'tier-silver' : getCardTier(player.rating)} ${isSelected ? 'selected' : ''} ${isFull ? 'disabled-card' : ''}`}
                          onClick={() => handlePlayerSelect(player)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            <div className="card-rating" style={{ minWidth: '35px', textAlign: 'center' }}>
                              {settings?.hardcoreMode ? '??' : player.rating}
                            </div>
                            <div className="card-name" style={{ fontSize: '1.2rem' }}>
                              {player.name}
                            </div>
                          </div>
                          <div className="card-pos" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {positionIcons[getPrimaryGenericPosition(player.position)]} {player.position}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
      </div>

      <div className="draft-pitch-container">
        <SquadPitch 
          squad={squad} 
          formation={formation} 
          settings={settings} 
          selectedPlayer={selectedPlayer} 
          onSlotSelect={handleSlotSelect} 
        />
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <p>Drag slots coming soon...</p>
        </div>
      </div>
    </div>
  );
}
