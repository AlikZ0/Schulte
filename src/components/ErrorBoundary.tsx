import { Component, type ErrorInfo, type ReactNode } from "react";
import { getTelemetryAdapter } from "../hooks/useTelemetry";

interface Props {
  children: ReactNode;
  fallback?: (reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    try {
      getTelemetryAdapter().track({
        name: "error_boundary",
        ts: Date.now(),
        data: {
          message: error.message,
          stack: (error.stack ?? "").slice(0, 800),
          component: info.componentStack?.slice(0, 500) ?? null,
        },
      });
    } catch {
      /* never throw inside the boundary */
    }
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error("ErrorBoundary caught:", error, info);
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.reset);
    return (
      <div className="min-h-dvh w-full grid place-items-center p-6 text-center">
        <div className="glass rounded-3xl p-6 max-w-md">
          <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
          <p className="text-sm text-white/60 mb-4">
            We caught an error and stopped the crash. Your progress is safe.
          </p>
          <button onClick={this.reset} className="btn-primary">
            Try again
          </button>
        </div>
      </div>
    );
  }
}
