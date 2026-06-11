import React from 'react';
import { User } from 'lucide-react';
import { getFlagUrl } from '../utils/flags';

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

export default function SquadPitch({ squad, formation, settings, selectedPlayer, onSlotSelect }) {
  if (!formation) return null;

  const getCardTier = (rating) => {
    if (rating >= 90) return 'tier-icon';
    if (rating >= 85) return 'tier-gold-rare';
    if (rating >= 80) return 'tier-gold';
    if (rating >= 75) return 'tier-silver-rare';
    return 'tier-silver';
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
        style={{ cursor: onSlotSelect && (!player && selectedPlayer && slotStatusClass === 'allowed') ? 'pointer' : 'default' }}
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
