import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import '@fontsource-variable/newsreader';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import './index.css';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext.jsx';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red', backgroundColor: '#fff', minHeight: '100vh' }}>
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo?.componentStack}
          </details>
        </div>
      );
    }

    return this.props.children; 
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
      <App />
      <Toaster position="top-right" toastOptions={{
        duration: 3500,
        style: { background: 'rgb(var(--surface))', color: 'rgb(var(--ink))', border: '1px solid rgb(var(--rule))', borderRadius: '14px', boxShadow: '0 8px 24px rgb(0 0 0 / 0.10)', fontSize: '14px', padding: '12px 16px' },
        success: { iconTheme: { primary: 'rgb(var(--positive))', secondary: 'rgb(var(--surface))' } },
        error: { iconTheme: { primary: 'rgb(var(--negative))', secondary: 'rgb(var(--surface))' } },
      }} />
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
