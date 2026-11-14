import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Icon } from './Icon';
import { Button } from './Button';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  title?: string;
  message?: string;
  onReset?: () => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(this.state.error || new Error('Unknown error'), this.handleReset);
      }
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isWebGLError =
        this.state.error?.message?.toLowerCase().includes('webgl') ||
        this.state.error?.message?.toLowerCase().includes('context') ||
        this.state.error?.message?.toLowerCase().includes('three');

      return (
        <div className="flex h-full w-full min-h-[300px] flex-col items-center justify-center rounded-2xl border border-panel-border bg-panel p-6 text-center select-none">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-warning/15 text-warning mb-3">
            <Icon icon={AlertTriangle} size={20} />
          </div>

          <h3 className="font-sans text-sm font-bold text-ink">
            {this.props.title || (isWebGLError ? '3D Graphics Acceleration Alert' : 'Component Render Alert')}
          </h3>

          <p className="mt-1.5 max-w-md font-sans text-xs text-muted leading-relaxed">
            {this.props.message ||
              (isWebGLError
                ? 'Hardware acceleration or WebGL appears disabled in your browser. Verify chrome://settings/system ("Use graphics acceleration when available") or switch to Horizon Panorama.'
                : (this.state.error?.message || 'An unexpected telemetry rendering error occurred.'))}
          </p>

          <div className="mt-4 flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={this.handleReset}
              className="flex items-center gap-1.5 text-xs"
            >
              <Icon icon={RotateCcw} size={16} />
              <span>Retry / Reset</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="text-xs text-muted hover:text-ink"
            >
              Reload App
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
