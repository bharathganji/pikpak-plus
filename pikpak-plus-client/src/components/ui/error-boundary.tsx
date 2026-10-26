"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: readonly unknown[];
  title?: string;
  description?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    } else {
      console.error(
        "ErrorBoundary caught an unhandled component error:",
        error,
        errorInfo,
      );
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (!this.state.hasError) return;

    // Auto-reset when any of resetKeys change
    if (this.props.resetKeys && prevProps.resetKeys) {
      const hasChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index],
      );
      if (hasChanged) {
        this.reset();
      }
    }
  }

  reset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (typeof this.props.fallback === "function") {
        return this.props.fallback(this.state.error, this.reset);
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default resilient fallback card
      return (
        <Card className="border-destructive/30 bg-destructive/5 my-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              {this.props.title || "Failed to load component"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            <p className="mb-2">
              {this.props.description ||
                "An unexpected rendering error occurred in this section."}
            </p>
            <div className="font-mono bg-background/80 p-2.5 rounded border border-border/50 text-[11px] text-destructive break-words">
              {this.state.error.message || "Unknown error"}
            </div>
          </CardContent>
          <CardFooter className="pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={this.reset}
              className="text-xs gap-1.5 h-8 border-destructive/30 hover:bg-destructive/10"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry Component
            </Button>
          </CardFooter>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap any component in an ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">,
): React.FC<P> {
  const ComponentWithErrorBoundary: React.FC<P> = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  const displayName =
    WrappedComponent.displayName || WrappedComponent.name || "Component";
  ComponentWithErrorBoundary.displayName = `WithErrorBoundary(${displayName})`;

  return ComponentWithErrorBoundary;
}
