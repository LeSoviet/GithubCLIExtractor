import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './src/App';
import './src/styles.css';
import './src/types.d';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
