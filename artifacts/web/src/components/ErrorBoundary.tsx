import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-background">
          <div className="glass rounded-3xl p-8 max-w-sm w-full text-center space-y-5 border border-border">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertTriangle size={28} className="text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-foreground">Something went wrong</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                An unexpected error occurred. Your progress is safe.
              </p>
              {this.state.error && (
                <p className="text-[11px] text-muted-foreground font-mono bg-muted rounded-lg px-3 py-2 text-left break-all">
                  {this.state.error.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={this.handleReset}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-95 transition-all"
              >
                <RefreshCw size={15} />
                Try Again
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="w-full py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
