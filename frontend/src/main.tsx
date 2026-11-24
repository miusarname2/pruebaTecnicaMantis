import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/archivo/500.css';
import '@fontsource/archivo/600.css';
import '@fontsource/archivo/700.css';
import '@fontsource/reddit-sans/400.css';
import '@fontsource/reddit-sans/500.css';
import '@fontsource/reddit-sans/600.css';
import '@fontsource/source-code-pro/400.css';
import '@fontsource/source-code-pro/500.css';
import 'material-symbols/outlined.css';
import App from './App.tsx';
import './styles/app.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
