import { HashRouter, Route, Routes } from 'react-router-dom';
import { App } from './App';

export function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/entity/:type/:id" element={<App />} />
      </Routes>
    </HashRouter>
  );
}
