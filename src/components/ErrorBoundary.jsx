import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fatal-screen">
          <p className="eyebrow">Something went wrong</p>
          <h1 className="fatal-headline">{this.state.error?.message || 'Unexpected application error'}</h1>
          <button
            type="button"
            className="refresh-button"
            style={{ marginTop: '20px' }}
            onClick={this.handleReset}
          >
            Dismiss & Return to Dashboard
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
