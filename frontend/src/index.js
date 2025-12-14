import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const theme = createTheme();

const container = document.getElementById('root');
if (!container) {
	// root element missing — log and avoid calling createRoot on null
	console.error('Root container with id "root" not found. Aborting React mount.');
} else {
	const root = createRoot(container);
	root.render(
		<React.StrictMode>
			<ThemeProvider theme={theme}>
				<App />
			</ThemeProvider>
		</React.StrictMode>
	);
}

// Global error & promise rejection logging (helps capture issues for diagnostics)
window.addEventListener('error', (e) => {
	const filename = e.filename || e.fileName || '<unknown>';
	const lineno = e.lineno || e.lineno === 0 ? e.lineno : e.lineNumber || '?';
	const colno = e.colno || e.colNumber || '?';
	console.warn('Global JS Error:', e.message, 'at', `${filename} ${lineno}:${colno}`);
});
window.addEventListener('unhandledrejection', (e) => {
	console.warn('Unhandled Promise Rejection:', e && e.reason ? e.reason : e);
});

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
