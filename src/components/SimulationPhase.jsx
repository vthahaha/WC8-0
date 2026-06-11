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
            <SquadPitch squad={squad} formation={formation} settings={settings} />
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
            {matches.map((match, idx) => (
              <div key={idx} className="match-card" style={{ animationDelay: `${idx * 0.2}s`, flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '0.2rem' }}>{match.stage}</div>
                    <div className="match-team" style={{ color: 'var(--primary)' }}>
                      Your Squad <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({match.userRating})</span>
                    </div>
                  </div>

                  <div className="match-score" style={{ flexDirection: 'column' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <span>{match.userGoals}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>-</span>
                      <span>{match.oppGoals}</span>
                    </div>
                    {match.penalties && (
                      <div style={{ fontSize: '0.9rem', color: 'var(--tier-icon)', fontWeight: '600' }}>
                        ({match.penalties.user} - {match.penalties.opp} Pens)
                      </div>
                    )}
                  </div>

                  <div className="match-team right" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({match.oppRating})</span>
                    {match.opponent}
                    <img src={getFlagUrl(match.opponent)} alt="Flag" style={{ width: '20px', borderRadius: '2px' }} />
                  </div>

                  <div style={{ marginLeft: '2rem', width: '50px', textAlign: 'center' }}>
                    <span className={`match-result result-${match.result}`}>{match.result}</span>
                  </div>
                </div>

                {/* Scorers Details */}
                {(match.userScorers?.length > 0 || match.oppScorers?.length > 0) && (
                  <div className="match-scorers-details" style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    marginTop: '1rem', 
                    paddingTop: '0.8rem', 
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)'
                  }}>
                    <div style={{ textAlign: 'left', flex: 1, paddingRight: '1rem' }}>
                      {match.userScorers?.map((scorer, sIdx) => (
                        <div key={sIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                          <span>⚽</span>
                          <span>{scorer.name} ({scorer.minute}')</span>
                          {scorer.assist && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.3rem' }}>
                              (assist: {scorer.assist})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    <div style={{ textAlign: 'right', flex: 1, paddingLeft: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      {match.oppScorers?.map((scorer, sIdx) => (
                        <div key={sIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          {scorer.assist && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '0.3rem' }}>
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
          </div>
        )}

        {!isSimulating && simResult && (
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
