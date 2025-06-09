import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthPage } from './auth/AuthPage';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    console.log('🔄 Login page effect:', { isAuthenticated, isLoading, pathname: location.pathname });
    if (isAuthenticated && !isLoading) {
      // Redirect to the page they tried to visit or dashboard
      const from = (location.state as any)?.from?.pathname || '/';
      console.log('🚀 Navigating from login to:', from);
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location.state]);

  // Don't render anything while we're checking auth status
  if (isAuthenticated && !isLoading) {
    return null;
  }

  return <AuthPage />;
};

export default Login;