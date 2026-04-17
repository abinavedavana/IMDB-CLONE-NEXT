"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error("[ErrorBoundary]", error);
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <span className="text-4xl mb-4">⚠️</span>
          <p className="text-lg mb-4">Something went wrong.</p>
          <button
            onClick={this.reset}
            className="bg-yellow-400 text-black px-6 py-2 rounded-md font-semibold"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function MovieGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[2/3] bg-gray-800 rounded-xl mb-2" />
          <div className="h-4 bg-gray-800 rounded w-3/4 mb-1" />
          <div className="h-3 bg-gray-800 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function MovieCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[2/3] bg-gray-800 rounded-xl mb-2" />
      <div className="h-4 bg-gray-800 rounded w-3/4 mb-1" />
      <div className="h-3 bg-gray-800 rounded w-1/2" />
    </div>
  );
}