import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ProjectProvider } from './context/ProjectContext';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProjectProvider>
      <App />
    </ProjectProvider>
  </StrictMode>,
);
