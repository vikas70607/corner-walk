import { Routes, Route } from 'react-router-dom';
import ClaimPage from './pages/ClaimPage';
import StaffPage from './pages/StaffPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ClaimPage />} />
      <Route path="/staff" element={<StaffPage />} />
    </Routes>
  );
}
