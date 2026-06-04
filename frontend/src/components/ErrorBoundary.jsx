import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Application error boundary caught an error:", error, errorInfo);
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-error">
          <div className="app-error__card">
            <h2>Something went wrong</h2>
            <p>This screen hit an unexpected error. You can retry or go back to your groups.</p>
            <div className="app-error__actions">
              <button className="btn-primary" onClick={this.handleRetry}>
                Retry
              </button>
              <button
                className="btn-secondary"
                onClick={() => window.location.assign("/groups")}
              >
                Go to Groups
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
