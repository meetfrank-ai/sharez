import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Portfolio page — redirects to your own UserProfile page.
 * The UserProfile component handles both own + other profiles
 * with the full STAK design (donut, cross-highlighting, etc).
 */
export default function Portfolio() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.id) {
      navigate(`/user/${user.id}`, { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#E5E7EB', borderTopColor: 'transparent' }} />
    </div>
  );
}
