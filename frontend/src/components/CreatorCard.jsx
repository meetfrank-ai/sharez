import { Link } from 'react-router-dom';
import FollowButton from './FollowButton';

export default function CreatorCard({ user }) {
  return (
    <div
      className="rounded-xl p-5 mb-3"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)',
      }}
    >
      <div className="flex items-center gap-3">
        <Link to={`/user/${user.id}`} className="no-underline">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
            style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
          >
            {user.display_name?.charAt(0).toUpperCase()}
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <Link to={`/user/${user.id}`} className="no-underline">
            <h3 className="text-sm font-semibold m-0" style={{ color: 'var(--text-primary)' }}>
              {user.display_name}
            </h3>
          </Link>
          {user.bio && (
            <p className="text-xs mt-0.5 m-0 truncate" style={{ color: 'var(--text-secondary)' }}>
              {user.bio}
            </p>
          )}
          <p className="text-xs mt-1 m-0" style={{ color: 'var(--text-muted)' }}>
            {user.follower_count} followers
          </p>
        </div>

        <FollowButton userId={user.id} profile={user} />
      </div>
    </div>
  );
}
