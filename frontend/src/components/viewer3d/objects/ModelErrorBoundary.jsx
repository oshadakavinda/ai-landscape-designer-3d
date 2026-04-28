import { Component } from 'react';

/**
 * ModelErrorBoundary
 * Catches errors thrown during 3D model loading (e.g. invalid .glb, network failure)
 * and renders a fallback component instead of crashing the entire scene.
 *
 * Usage:
 *   <ModelErrorBoundary fallback={<BoxFallback obj={obj} />}>
 *     <Suspense fallback={<BoxFallback obj={obj} />}>
 *       <GLBModel ... />
 *     </Suspense>
 *   </ModelErrorBoundary>
 */
export default class ModelErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err) {
    console.warn('[ModelErrorBoundary] Model failed to load, using fallback:', err.message);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
