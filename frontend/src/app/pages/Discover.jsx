import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import api from '../utils/api';
import CreatorCard from '../components/CreatorCard';

export default function Discover() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = (q = '') => {
    setLoading(true);
    api.get(`/discover/?q=${encodeURIComponent(q)}`)
      .then((res) => setUsers(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(search);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
      <h1 className="text-2xl font-semibold mb-5 m-0" style={{ color: 'var(--text-primary)' }}>Discover</h1>

      <form onSubmit={handleSearch} className="mb-5 relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
      </form>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }} />
        </div>
      ) : users.length === 0 ? (
        <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>No users found</p>
      ) : (
        users.map((u) => <CreatorCard key={u.id} user={u} />)
      )}
    </div>
  );
}
