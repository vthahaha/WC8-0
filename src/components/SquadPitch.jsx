import React from 'react';
import { User } from 'lucide-react';
import { getFlagUrl } from '../utils/flags';

export default function SquadPitch({ squad, formation, settings, selectedPlayer, onSlotSelect }) {
  if (!formation) return null;

  const getCardTier = (rating) => {
    if (rating >= 90) return 'tier-icon';
    if (rating >= 85) return 'tier-gold-rare';
    if (rating >= 80) return 'tier-gold';
    if (rating >= 75) return 'tier-silver-rare';
    return 'tier-silver';
  };

  const getEligibleSlots = (pos) => {
    const mainPos = pos.split(',')[0].trim();
    if (['ST', 'CF', 'RW', 'LW'].includes(mainPos)) return ['ST', 'LW', 'RW', 'CF'];
    if (['CM', 'CDM', 'CAM', 'RM', 'LM'].includes(mainPos)) return ['CM', 'CDM', 'CAM', 'RM', 'LM'];
    if (['CB', 'RB', 'LB', 'RWB', 'LWB'].includes(mainPos)) return ['CB', 'RB', 'LB', 'RWB', 'LWB'];
    if (mainPos === 'GK') return ['GK'];
    return [];
  };

  const renderSlot = (idx, posLabel) => {
    const player = squad[idx];
    
    let slotStatusClass = '';
    if (player) {
      slotStatusClass = 'filled ' + getCardTier(player.rating);
    } else if (selectedPlayer) {
      const eligible = getEligibleSlots(selectedPlayer.position);
      if (eligible.includes(posLabel)) {
        slotStatusClass = 'allowed';
      } else {
        slotStatusClass = 'disallowed';
      }
    }

    const handleClick = () => {
      if (onSlotSelect) {
        onSlotSelect(idx);
      }
    };

    return (
      <div 
        key={idx} 
        className={`slot ${slotStatusClass}`}
        onClick={handleClick}
        style={{ cursor: onSlotSelect && (!player && selectedPlayer && selectedPlayer.position === posLabel) ? 'pointer' : 'default' }}
      >
        {player ? (
          <>
            <div className="slot-rating">{settings?.hardcoreMode ? '??' : player.rating}</div>
            <img 
               src={getFlagUrl(player.team_name)} 
               alt="Flag" 
               className="slot-flag"
            />
            <div className="slot-name">{player.name}</div>
            <div className="slot-team">{player.team_name}</div>
          </>
        ) : (
          <>
            <div className="slot-pos-label">{posLabel}</div>
            <User size={24} color={slotStatusClass === 'allowed' ? 'var(--primary)' : 'rgba(255,255,255,0.2)'} />
          </>
        )}
      </div>
    );
  };

  let globalSlotIndex = 0;
  
  return (
    <div className="squad-builder pitch-bg">
      <h3 style={{ textAlign: 'center', marginBottom: '1rem', position: 'relative', zIndex: 2 }}>
        Your Starting XI ({formation.name})
      </h3>
      
      {selectedPlayer && (
         <p style={{ textAlign: 'center', color: 'var(--primary)', marginBottom: '1rem', position: 'relative', zIndex: 2 }}>
           Now click an empty slot for {selectedPlayer.name} ({selectedPlayer.position})
         </p>
      )}
      
      {formation.rows.map((row, rowIdx) => {
        const currentGlobalIndexStart = globalSlotIndex;
        globalSlotIndex += row.length;
        
        return (
          <div key={rowIdx} className="formation-slots">
            {row.map((posLabel, idx) => {
              const actualSlotIndex = currentGlobalIndexStart + idx;
              return renderSlot(actualSlotIndex, posLabel);
            })}
          </div>
        );
      })}
    </div>
  );
}
