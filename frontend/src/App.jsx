import { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import SetupPage from './pages/SetupPage';
import DesignPage from './pages/DesignPage';
import { generateLandscapeDesign, modifyLandscapeDesign } from './api/landscapeApi';
import exampleLayout from './data/exampleLayout.json';

export default function App() {
  const [layout, setLayout] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFormData, setLastFormData] = useState(null);
  const navigate = useNavigate();

  const handleGenerate = async (formData) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await generateLandscapeDesign(formData);
      setLayout(result);
      setLastFormData(formData);
      navigate('/design');
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to connect to the backend. Is the server running?'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseExample = () => {
    setLayout(exampleLayout);
    setLastFormData(null);
    setError(null);
    navigate('/design');
  };

  const handleModify = async (prompt) => {
    if (!layout) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await modifyLandscapeDesign(layout, prompt, lastFormData);
      setLayout(result);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to modify the design. Is the server running?'
      );
      throw err; // re-throw so ChatPrompt can show error status
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartOver = () => {
    setLayout(null);
    setLastFormData(null);
    setError(null);
    navigate('/');
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          layout
            ? <Navigate to="/design" replace />
            : <SetupPage
                onGenerate={handleGenerate}
                onUseExample={handleUseExample}
                isLoading={isLoading}
                error={error}
                onDismissError={() => setError(null)}
              />
        }
      />
      <Route
        path="/design"
        element={
          layout
            ? <DesignPage
                layout={layout}
                setLayout={setLayout}
                isLoading={isLoading}
                error={error}
                onModify={handleModify}
                onStartOver={handleStartOver}
                onDismissError={() => setError(null)}
              />
            : <Navigate to="/" replace />
        }
      />
    </Routes>
  );
}
