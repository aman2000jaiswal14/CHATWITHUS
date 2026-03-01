import React from 'react'
import ReactDOM from 'react-dom/client'
import ShadowWrapper from './ShadowWrapper.jsx'

// Auto-mount: Find the #root div or create one
function mount() {
  let rootEl = document.getElementById('root');
  if (!rootEl) {
    rootEl = document.createElement('div');
    rootEl.id = 'root';
    document.body.appendChild(rootEl);
  }

  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <ShadowWrapper />
    </React.StrictMode>,
  );
}

// Execute immediately if DOM is ready, otherwise wait
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
