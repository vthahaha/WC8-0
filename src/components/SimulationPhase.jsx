import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trophy, XCircle, RotateCcw, AlertTriangle } from 'lucide-react';
import { getFlagUrl } from '../utils/flags';
import { useLocation, useNavigate } from 'react-router-dom';

const API_URL = 'https://wc8-0.onrender.com/api';

export default function SimulationPhase() {
  const location = useLocation();
  const navigate = useNavigate();
  const { squad } = location.state || {};

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
              <div key={idx} className="match-card" style={{ animationDelay: `${idx * 0.2}s` }}>
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
            <br/><br/>
            <button className="draft-btn" onClick={() => navigate('/')} style={{ padding: '0.8rem 2rem', fontSize: '1.2rem' }}>
              <RotateCcw size={20} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} /> Draft Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
