import React from 'react';
import { ChevronDown, LogOut, Sparkles, Moon, Menu, X, Plus } from 'lucide-react';

interface Guild {
  id: string;
  name: string;
  icon: string | null;
  hasBot: boolean;
  isAdmin: boolean;
  owner?: boolean;
  isAllowed?: boolean;
  inviteUrl?: string;
}

interface User {
  id: string;
  username: string;
  avatar: string | null;
  isSuperAdmin?: boolean;
}

interface NavbarProps {
  user: User | null;
  guilds: Guild[];
  selectedGuild: Guild | null;
  onSelectGuild: (guild: Guild | null) => void;
  onLogout: () => void;
  onLogin: () => void;
  authLoading?: boolean;
  onBrandClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  guilds,
  selectedGuild,
  onSelectGuild,
  onLogout,
  onLogin,
  authLoading = false,
  onBrandClick
}) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const userMenuRef = React.useRef<HTMLDivElement>(null);
  const guildMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (guildMenuRef.current && !guildMenuRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <nav className="navbar">
      <div
        className="brand-logo"
        onClick={() => {
          if (onBrandClick) {
            onBrandClick();
          } else {
            onSelectGuild(null);
          }
        }}
        style={{ cursor: 'pointer' }}
        title="Dashboard Navigation"
      >
        <img src="/logo.png" alt="Loup-Garou NextGen" style={{ height: '48px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: '2px' }}>
          <span className="logo-title">LOUPS-GAROUS</span>
          <span className="logo-title" style={{ fontSize: '0.85rem', letterSpacing: '0.25em', marginTop: '-4px' }}>NEXTGEN</span>
        </div>
      </div>

      <div className="nav-actions">
        {user ? (
          <>
            {/* Guild Selector */}
            <div style={{ position: 'relative' }} ref={guildMenuRef}>
              <button
                className="guild-picker"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{ position: 'relative' }}
              >
                {selectedGuild?.icon ? (
                  <img
                    src={selectedGuild.icon}
                    alt={selectedGuild.name}
                    className="guild-avatar"
                  />
                ) : (
                  <div className="guild-avatar">
                    {selectedGuild?.name ? selectedGuild.name.substring(0, 2).toUpperCase() : 'LG'}
                  </div>
                )}
                {selectedGuild && selectedGuild.isAllowed === false && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-2px',
                      background: '#f59e0b',
                      borderRadius: '50%',
                      width: '16px',
                      height: '16px',
                      fontSize: '9px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #0f172a',
                      boxShadow: '0 0 6px rgba(245, 158, 11, 0.6)'
                    }}
                    title="Serveur en Bêta Privée (Accès Restreint)"
                  >
                    🔒
                  </span>
                )}
              </button>

              {dropdownOpen && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 150 }}
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '110%',
                      right: 0,
                      width: '240px',
                      background: 'var(--bg-dark-surface)',
                      border: '2px solid var(--border-gold-dim)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                      zIndex: 200,
                      padding: '0.4rem'
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.68rem',
                        color: 'var(--text-gold)',
                        padding: '0.35rem 0.5rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        fontFamily: 'var(--font-title)',
                        fontWeight: 600
                      }}
                    >
                      Your Discord Servers
                    </div>
                    {guilds.filter((g) => g.hasBot === true).length === 0 ? (
                      <div style={{ padding: '0.6rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-light-muted)', textAlign: 'center' }}>
                        No active bot servers yet.
                      </div>
                    ) : (
                      guilds
                        .filter((g) => g.hasBot === true)
                        .map((g) => (
                          <div
                            key={g.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.5rem',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              background:
                                selectedGuild?.id === g.id
                                  ? 'rgba(201, 168, 76, 0.15)'
                                  : 'transparent',
                              transition: 'background 0.15s ease'
                            }}
                          >
                            <div
                              onClick={() => {
                                onSelectGuild(g);
                                setDropdownOpen(false);
                              }}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, overflow: 'hidden' }}
                            >
                              {g.icon ? (
                                <img
                                  src={g.icon}
                                  alt=""
                                  className="guild-avatar"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="guild-avatar">
                                  {g.name.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div
                                  style={{
                                    fontSize: '0.82rem',
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                    textOverflow: 'ellipsis',
                                    overflow: 'hidden',
                                    color: 'var(--text-cream)',
                                    fontFamily: 'var(--font-title)'
                                  }}
                                >
                                  {g.name}
                                </div>
                                {g.isAllowed === false ? (
                                  <div style={{ fontSize: '0.65rem', color: '#facc15', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <span>🔒 Bêta Privée</span>
                                  </div>
                                ) : (
                                  <div style={{ fontSize: '0.65rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <span>● Partenaire Officiel</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                    )}

                    {/* Add New Server Button */}
                    <div
                      onClick={() => {
                        onSelectGuild(null);
                        setDropdownOpen(false);
                      }}
                      style={{
                        marginTop: '0.4rem',
                        padding: '0.5rem',
                        borderTop: '1px solid var(--border-dark)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--gold)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        fontFamily: 'var(--font-title)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(201, 168, 76, 0.12)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                      }}
                    >
                      <Plus size={14} />
                      <span>Add New Server</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* User Profile */}
            <div className="user-profile" style={{ position: 'relative' }} ref={userMenuRef}>
              <img
                src={
                  user.avatar ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&q=80'
                }
                alt={user.username}
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                style={{ cursor: 'pointer' }}
              />
              <div className={`user-details ${userMenuOpen ? 'open' : ''}`}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {user.username}
                    {user.isSuperAdmin && (
                      <span style={{
                        fontSize: '0.6rem',
                        background: 'var(--gold)',
                        color: 'black',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Super Admin
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Administrator</span>
                </div>
                <button
                  className="btn btn-secondary logout-btn"
                  style={{ padding: '0.35rem 0.55rem', background: 'var(--bg-dark-surface)', border: '1px solid var(--border-gold-dim)', color: 'var(--text-cream)' }}
                  onClick={onLogout}
                  title="Logout"
                >
                  <LogOut size={15} />
                  <span className="mobile-only-text">Logout</span>
                </button>
              </div>
            </div>
          </>
        ) : authLoading ? null : (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary" onClick={onLogin} style={{ fontSize: '0.82rem' }}>
              <Moon size={15} />
              Discord Login
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};
