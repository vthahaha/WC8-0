import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SetupPhase from './components/SetupPhase';
import DraftPhase from './components/DraftPhase';
import SimulationPhase from './components/SimulationPhase';

export const FORMATIONS = {
  '4-4-2 Flat': { name: '4-4-2 Flat', rows: [['ST', 'ST'], ['LM', 'CM', 'CM', 'RM'], ['LB', 'CB', 'CB', 'RB'], ['GK']] },
  '4-4-2 Diamond': { name: '4-4-2 Diamond', rows: [['ST', 'ST'], ['CAM'], ['CM', 'CM'], ['CDM'], ['LB', 'CB', 'CB', 'RB'], ['GK']] },
  '4-3-3 Attack': { name: '4-3-3 Attack', rows: [['LW', 'ST', 'RW'], ['CAM'], ['CM', 'CM'], ['LB', 'CB', 'CB', 'RB'], ['GK']] },
  '4-3-3 Defend': { name: '4-3-3 Defend', rows: [['LW', 'ST', 'RW'], ['CM', 'CM'], ['CDM'], ['LB', 'CB', 'CB', 'RB'], ['GK']] },
  '4-2-3-1 Wide': { name: '4-2-3-1 Wide', rows: [['ST'], ['LM', 'CAM', 'RM'], ['CDM', 'CDM'], ['LB', 'CB', 'CB', 'RB'], ['GK']] },
  '4-1-4-1': { name: '4-1-4-1', rows: [['ST'], ['LM', 'CM', 'CM', 'RM'], ['CDM'], ['LB', 'CB', 'CB', 'RB'], ['GK']] },
  '4-2-2-2': { name: '4-2-2-2', rows: [['ST', 'ST'], ['CAM', 'CAM'], ['CDM', 'CDM'], ['LB', 'CB', 'CB', 'RB'], ['GK']] },
  '4-3-2-1': { name: '4-3-2-1', rows: [['ST'], ['CAM', 'CAM'], ['CM', 'CM', 'CM'], ['LB', 'CB', 'CB', 'RB'], ['GK']] },
  '4-1-2-1-2': { name: '4-1-2-1-2', rows: [['ST', 'ST'], ['CAM'], ['CM', 'CM'], ['CDM'], ['LB', 'CB', 'CB', 'RB'], ['GK']] },
  '3-5-2': { name: '3-5-2', rows: [['ST', 'ST'], ['LM', 'CDM', 'CM', 'CM', 'RM'], ['CB', 'CB', 'CB'], ['GK']] },
  '3-4-3': { name: '3-4-3', rows: [['LW', 'ST', 'RW'], ['LM', 'CM', 'CM', 'RM'], ['CB', 'CB', 'CB'], ['GK']] },
  '3-4-2-1': { name: '3-4-2-1', rows: [['ST'], ['CAM', 'CAM'], ['LM', 'CM', 'CM', 'RM'], ['CB', 'CB', 'CB'], ['GK']] },
  '5-3-2': { name: '5-3-2', rows: [['ST', 'ST'], ['CM', 'CM', 'CM'], ['LWB', 'CB', 'CB', 'CB', 'RWB'], ['GK']] },
  '5-4-1': { name: '5-4-1', rows: [['ST'], ['LM', 'CM', 'CM', 'RM'], ['LWB', 'CB', 'CB', 'CB', 'RWB'], ['GK']] }
};

function App() {
  return (
    <Router>
      <div className="app-container">
        <header className="header">
          <h1>World Cup 8-0</h1>
          <p>Draft your ultimate historic XI and conquer the tournament</p>
        </header>

        <Routes>
          <Route path="/" element={<SetupPhase />} />
          <Route path="/draft" element={<DraftPhase />} />
          <Route path="/simulate" element={<SimulationPhase />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
