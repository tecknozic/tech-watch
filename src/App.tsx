import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { Configuration } from './pages/Configuration';
import DailyRecap from './pages/DailyRecap';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="configuration" element={<Configuration />} />
          <Route path="recap" element={<DailyRecap />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
