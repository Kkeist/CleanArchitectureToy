import { StrictMode, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { buildCaEngine } from './frameworks/main/buildCaEngine';
import { AssemblyView } from './frameworks/ui/AssemblyView';
import './index.css';

function Root() {
  const engine = useMemo(() => buildCaEngine(), []);
  return <AssemblyView viewModel={engine.viewModel} controller={engine.controller} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
