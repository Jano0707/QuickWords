import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import HomePage from 'home-page';
import CreateGame from 'create-game';
import GamePage from 'game-page';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create-game" element={<CreateGame />} />
        <Route path="/game" element={<GamePage />} />
      </Routes>
    </Router>
  );
}

export default App;
