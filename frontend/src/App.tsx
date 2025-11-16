import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ControlUI from './pages/ControlUI';
import OverlayUI from './pages/OverlayUI';
import AdminUI from './pages/AdminUI';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/control" element={<ControlUI />} />
        <Route path="/court/:courtId" element={<OverlayUI />} />
        <Route path="/admin" element={<AdminUI />} />
        <Route path="/" element={<ControlUI />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

