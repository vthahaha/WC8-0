import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trophy, XCircle, RotateCcw, AlertTriangle } from 'lucide-react';
import { getFlagUrl } from '../utils/flags';
import { useLocation, useNavigate } from 'react-router-dom';
import SquadPitch from './SquadPitch';

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : 'https://wc8-0.onrender.com/api';

export default function SimulationPhase() {
  const location = useLocation();
  const navigate = useNavigate();
  const { squad, formation, settings } = location.state || {};

  const [matches, setMatches] = useState([]);
  const [isSimulating, setIsSimulating] = useState(true);
  const [simResult, setSimResult] = useState(null);
  const [error, setError] = useState(null);

  const [revealedCount, setRevealedCount] = useState(0);
  const [isMatchSimulating, setIsMatchSimulating] = useState(false);

  const handleSimulateNext = () => {
    if (isMatchSimulating) return;
    setIsMatchSimulating(true);
    setTimeout(() => {
      setIsMatchSimulating(false);
      setRevealedCount(prev => prev + 1);
    }, 1200);
  };

  useEffect(() => {
    if (!squad) {
      navigate('/');
      return;
    }

    const runSimulation = async () => {
      try {
        setIsSimulating(true);
        const response = await axios.post(`${API_URL}/simulate`, { draftedSquad: squad });
        setMatches(response.data.matches);
        setSimResult(response.data);
        setRevealedCount(0);
      } catch (err) {
        console.error(err);
        setError("Simulation failed. Make sure backend is running.");
      } finally {
        setIsSimulating(false);
      }
    };

    runSimulation();
  }, [squad, navigate]);

  if (!squad) return null;

  const userRating = Math.floor(squad.reduce((sum, p) => sum + p.rating, 0) / 11);

  const stats = (() => {
    const goals = {};
    const assists = {};

    matches.forEach(m => {
      m.userScorers?.forEach(s => {
        goals[s.name] = (goals[s.name] || 0) + 1;
        if (s.assist) {
          assists[s.assist] = (assists[s.assist] || 0) + 1;
        }
      });
    });

    let maxGoals = 0;
    let topScorersList = [];
    Object.entries(goals).forEach(([name, count]) => {
      if (count > maxGoals) {
        maxGoals = count;
        topScorersList = [name];
      } else if (count === maxGoals) {
        topScorersList.push(name);
      }
    });

    let maxAssists = 0;
    let topAssistorsList = [];
    Object.entries(assists).forEach(([name, count]) => {
      if (count > maxAssists) {
        maxAssists = count;
        topAssistorsList = [name];
      } else if (count === maxAssists) {
        topAssistorsList.push(name);
      }
    });

    return {
      topScorers: maxGoals > 0 ? `${topScorersList.join(', ')} (${maxGoals} goal${maxGoals > 1 ? 's' : ''})` : 'None',
      topAssistors: maxAssists > 0 ? `${topAssistorsList.join(', ')} (${maxAssists} assist${maxAssists > 1 ? 's' : ''})` : 'None'
    };
  })();

  if (error) {
    return <div className="glass-panel" style={{ color: 'red', textAlign: 'center' }}>{error}</div>;
  }

  return (
    <div className="simulation-container">
      <div className="glass-panel" style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--primary)' }}>Your Ultimate Squad</h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem' }}>
          <div>
            <div style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>Overall Rating</div>
            <div style={{ fontSize: '3rem', fontWeight: 'bold' }}>{userRating}</div>
          </div>
        </div>

        <div style={{ marginTop: '2rem' }}>
          {formation && (
            <SquadPitch squad={squad} formation={formation} settings={{ ...settings, hardcoreMode: false }} />
          )}
        </div>
      </div>

      <div className="glass-panel">
        <h3 style={{ marginBottom: '2rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '1rem' }}>
          World Cup Campaign
        </h3>
        
        {isSimulating ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Simulating matches...</div>
        ) : (
          <div className="matches-list">
            {matches.slice(0, revealedCount).map((match, idx) => (
              <div key={idx} className="match-card simulated animate-fade-in">
                <div className="match-stage">{match.stage}</div>
                <div className="match-result-col">
                  <span className={`match-result result-${match.result}`}>{match.result}</span>
                </div>
                
                <div className="match-main-row">
                  <div className="match-team-col left">
                    <div className="match-team user">
                      Your Squad <span className="match-rating">({match.userRating})</span>
                    </div>
                  </div>

                  <div className="match-score-col">
                    <div className="match-score-display">
                      <span>{match.userGoals}</span>
                      <span className="match-score-dash">-</span>
                      <span>{match.oppGoals}</span>
                    </div>
                    {match.penalties && (
                      <div className="match-penalties">
                        ({match.penalties.user} - {match.penalties.opp} Pens)
                      </div>
                    )}
                  </div>

                  <div className="match-team-col right">
                    <div className="match-team opp">
                      <span className="match-rating">({match.oppRating})</span>
                      <span className="match-team-name">{match.opponent}</span>
                      <img src={getFlagUrl(match.opponent)} alt="Flag" className="match-flag" />
                    </div>
                  </div>
                </div>

                {/* Scorers Details */}
                {(match.userScorers?.length > 0 || match.oppScorers?.length > 0) && (
                  <div className="match-scorers-details">
                    <div className="scorers-left">
                      {match.userScorers?.map((scorer, sIdx) => (
                        <div key={sIdx} className="scorer-item">
                          <span>⚽</span>
                          <span>{scorer.name} ({scorer.minute}')</span>
                          {scorer.assist && (
                            <span className="assist-info">
                              (assist: {scorer.assist})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="scorers-right">
                      {match.oppScorers?.map((scorer, sIdx) => (
                        <div key={sIdx} className="scorer-item">
                          {scorer.assist && (
                            <span className="assist-info">
                              (assist: {scorer.assist})
                            </span>
                          )}
                          <span>{scorer.name} ({scorer.minute}')</span>
                          <span>⚽</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {revealedCount < matches.length && (
              (() => {
                const upcomingMatch = matches[revealedCount];
                return (
                  <div className="match-card upcoming animate-fade-in">
                    <div className="match-stage">{upcomingMatch.stage}</div>
                    <div className="match-result-col">
                      <span className="match-result vs-badge">VS</span>
                    </div>
                    
                    <div className="match-main-row">
                      <div className="match-team-col left">
                        <div className="match-team user">
                          Your Squad <span className="match-rating">({upcomingMatch.userRating})</span>
                        </div>
                      </div>
                      
                      <div className="match-action-col">
                        {isMatchSimulating ? (
                          <div className="animate-pulse match-playing">
                            <span className="bouncing-ball">⚽</span> Playing Match...
                          </div>
                        ) : (
                          <button 
                            className="draft-btn kick-off-btn" 
                            onClick={handleSimulateNext}
                          >
                            Kick Off
                          </button>
                        )}
                      </div>
                      
                      <div className="match-team-col right">
                        <div className="match-team opp">
                          <span className="match-rating">({upcomingMatch.oppRating})</span>
                          <span className="match-team-name">{upcomingMatch.opponent}</span>
                          <img src={getFlagUrl(upcomingMatch.opponent)} alt="Flag" className="match-flag" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        )}

        {!isSimulating && simResult && revealedCount >= matches.length && (
          <div className={`result-banner ${simResult.isPerfect ? 'banner-success' : (simResult.wonCup ? 'banner-warning' : 'banner-failure')}`}>
            {simResult.isPerfect ? (
              <>
                <Trophy size={64} color="#00ff88" className="banner-icon" />
                <h2>PERFECT 8-0!</h2>
                <p>You have conquered the World Cup flawlessly. A legendary squad!</p>
              </>
            ) : simResult.wonCup ? (
              <>
                <AlertTriangle size={64} color="#f2cc60" className="banner-icon" />
                <h2 style={{ color: '#f2cc60' }}>WORLD CHAMPIONS!</h2>
                <p>You lifted the cup, but dropped points or relied on penalties. The ultimate 8-0 challenge remains unbeaten.</p>
              </>
            ) : (
              <>
                <XCircle size={64} color="#ff3232" className="banner-icon" />
                <h2 style={{ color: '#ff3232' }}>DREAM OVER</h2>
                <p>You were eliminated in the {simResult.eliminatedAt}.</p>
                {simResult.eliminatedAt === 'Group Stage' && (
                   <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>You finished with {simResult.groupPoints} points.</p>
                )}
              </>
            )}

            <div className="stats-summary" style={{ 
              marginTop: '2rem', 
              marginBottom: '1rem',
              padding: '1rem', 
              background: 'rgba(0,0,0,0.3)', 
              border: '1px solid var(--panel-border)', 
              borderRadius: '8px',
              textAlign: 'left'
            }}>
              <h4 style={{ color: 'var(--primary)', marginBottom: '0.8rem', borderBottom: '1px solid rgba(88,166,255,0.1)', paddingBottom: '0.4rem', fontSize: '1rem' }}>
                Squad Tournament Stats Summary
              </h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '2rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Top Scorer:</span>
                  <div style={{ fontSize: '1rem', fontWeight: 'bold', marginTop: '0.2rem', color: '#fff' }}>
                    ⚽ {stats.topScorers}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Top Assistor:</span>
                  <div style={{ fontSize: '1rem', fontWeight: 'bold', marginTop: '0.2rem', color: '#fff' }}>
                    👟 {stats.topAssistors}
                  </div>
                </div>
              </div>
            </div>

            <br/>
            <button 
              className="draft-btn" 
              onClick={() => navigate('/')} 
              style={{ padding: '0.8rem 2rem', fontSize: '1.2rem' }}
            >
              <RotateCcw size={20} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} /> Draft Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
