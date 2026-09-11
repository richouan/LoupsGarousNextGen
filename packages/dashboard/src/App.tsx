import React, { useState, useEffect } from 'react';
import { api, getSavedToken, saveSavedToken, clearSavedToken } from './api';
import { Navbar } from './components/Navbar';
import { CardsTab } from './pages/CardsTab';
import { SettingsTab } from './pages/SettingsTab';
import { SecurityTab } from './pages/SecurityTab';
import { RestrictedServerView } from './components/RestrictedServerView';
import { BookOpen, Sliders, ShieldCheck } from 'lucide-react';

export function App() {
  const [user, setUser] = useState<any | null>(null);
  const [guilds, setGuilds] = useState<any[]>([]);
  const [selectedGuild, setSelectedGuild] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'cards' | 'settings' | 'security'>('cards');

  const [cards, setCards] = useState<any[]>([]);
  const [settings, setSettings] = useState<any | null>(null);
  const [channels, setChannels] = useState<any[]>([]);
  const [allowedGuilds, setAllowedGuilds] = useState<any[]>([]);
  const [contactUser, setContactUser] = useState<string>('ezreal');
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(() => {
    const hasToken = Boolean(getSavedToken());
    const urlParams = new URLSearchParams(window.location.search);
    const hasCode = Boolean(urlParams.get('code') || urlParams.get('token'));
    return hasToken || hasCode;
  });

  const authInitRef = React.useRef(false);

  // Fetch allowed official partner guilds
  useEffect(() => {
    api
      .get('/bot/allowed-guilds')
      .then((res) => {
        if (res.data.allowedGuilds) setAllowedGuilds(res.data.allowedGuilds);
        if (res.data.contactUser) setContactUser(res.data.contactUser);
      })
      .catch(() => {});
  }, []);

  // Initialize auth and restore last server
  useEffect(() => {
    if (authInitRef.current) return;
    authInitRef.current = true;
    
    const initAuth = async () => {
      const token = getSavedToken();
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');
      const code = urlParams.get('code');

      const finalizeUserSession = (
        userData: any,
        guildsData: any[],
        allowedGuildsData?: any[],
        contactUserData?: string
      ) => {
        setUser(userData);
        setGuilds(guildsData || []);
        if (allowedGuildsData && allowedGuildsData.length > 0) {
          setAllowedGuilds(allowedGuildsData);
        }
        if (contactUserData) {
          setContactUser(contactUserData);
        }

        // Restore last server if valid, or default to first server with bot
        const lastGuildId = localStorage.getItem('lg_last_guild_id');
        const ownedGuilds = (guildsData || []).filter((g: any) => g.owner === true);
        const matched = ownedGuilds.find((g: any) => g.id === lastGuildId && g.hasBot);
        if (matched) {
          setSelectedGuild(matched);
        } else {
          // Prefer an allowed server with bot first!
          const firstAllowedWithBot = ownedGuilds.find((g: any) => g.hasBot && g.isAllowed !== false);
          const firstWithBot = firstAllowedWithBot || ownedGuilds.find((g: any) => g.hasBot);
          if (firstWithBot) {
            setSelectedGuild(firstWithBot);
            localStorage.setItem('lg_last_guild_id', firstWithBot.id);
          }
        }
      };

      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.data.user.id === '999999999999999999') {
            console.warn('Old demo token detected, clearing session...');
            clearSavedToken();
            window.location.href = '/api/auth/discord';
            return;
          }

          finalizeUserSession(res.data.user, res.data.guilds, res.data.allowedGuilds, res.data.contactUser);
        } catch (err: any) {
          console.error('Session validation check failed:', err);
          // Only clear session if token is explicitly expired or unauthorized (401 / 403)
          if (err?.response?.status === 401 || err?.response?.status === 403) {
            clearSavedToken();
          }
        } finally {
          setAuthLoading(false);
        }
      } else if (urlToken) {
        saveSavedToken(urlToken);
        window.history.replaceState({}, document.title, '/');
        try {
          const res = await api.get('/auth/me');
          finalizeUserSession(res.data.user, res.data.guilds, res.data.allowedGuilds, res.data.contactUser);
        } catch (err: any) {
          console.error('Failed to validate url token:', err);
          if (err?.response?.status === 401 || err?.response?.status === 403) {
            clearSavedToken();
          }
        } finally {
          setAuthLoading(false);
        }
      } else if (code) {
        try {
          const callbackRes = await api.post('/auth/callback', { code });
          const { token: receivedToken, user: receivedUser, guilds: receivedGuilds, allowedGuilds: receivedAllowed, contactUser: receivedContact } = callbackRes.data;
          if (receivedToken) {
            saveSavedToken(receivedToken);
            finalizeUserSession(receivedUser, receivedGuilds, receivedAllowed, receivedContact);
          }
        } catch (err) {
          console.error('Failed to exchange code:', err);
        } finally {
          window.history.replaceState({}, document.title, '/');
          setAuthLoading(false);
        }
      } else {
        setAuthLoading(false);
      }
    };
    initAuth();
  }, []);

  // Save selected guild to localStorage whenever it changes
  const handleSelectGuild = (guild: any | null) => {
    setSelectedGuild(guild);
    if (guild?.id && guild.id !== 'global') {
      localStorage.setItem('lg_last_guild_id', guild.id);
    }
  };

  // Fetch guild data when selectedGuild changes
  useEffect(() => {
    if (!selectedGuild) return;

    const fetchGuildData = async () => {
      // If server is not whitelisted, skip fetching guild data and show RestrictedServerView
      if (selectedGuild.id !== 'global' && selectedGuild.isAllowed === false) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [cardsRes, settingsRes, channelsRes] = await Promise.all([
          api.get('/cards'),
          api.get(`/guilds/${selectedGuild.id}/settings`),
          api.get(`/guilds/${selectedGuild.id}/channels`)
        ]);

        setCards(cardsRes.data);
        setSettings(settingsRes.data);
        setChannels(channelsRes.data);
      } catch (err) {
        console.error('Failed to load guild data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGuildData();
  }, [selectedGuild]);


  const handleLogout = () => {
    clearSavedToken();
    setUser(null);
    setGuilds([]);
    setSelectedGuild(null);
  };

  const handleSaveCard = async (cardData: any) => {
    if (cardData.id) {
      // Edit
      const res = await api.put(`/cards/${cardData.id}`, cardData);
      setCards(cards.map((c) => (c.id === cardData.id ? res.data : c)));
      return res.data;
    } else {
      // Create
      const res = await api.post(`/cards`, cardData);
      setCards([res.data, ...cards]);
      return res.data;
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    await api.delete(`/cards/${cardId}`);
    setCards(cards.filter((c) => c.id !== cardId));
  };

  const handleSaveSettings = async (updatedSettings: any) => {
    if (!selectedGuild) return;
    const res = await api.put(`/guilds/${selectedGuild.id}/settings`, updatedSettings);
    setSettings(res.data);
  };

  const handleBrandClick = () => {
    // If on a server, return to server select. If on server select, return to last server (or first bot server)
    if (selectedGuild) {
      handleSelectGuild(null);
    } else {
      const lastGuildId = localStorage.getItem('lg_last_guild_id');
      const owned = guilds.filter((g) => g.owner === true);
      const target = owned.find((g) => g.id === lastGuildId && g.hasBot) || owned.find((g) => g.hasBot);
      if (target) {
        handleSelectGuild(target);
      }
    }
  };

  return (
    <div className="app-container">
      {/* Navbar */}
      <Navbar
        user={user}
        guilds={guilds}
        selectedGuild={selectedGuild}
        onSelectGuild={handleSelectGuild}
        onLogout={handleLogout}
        onLogin={() => window.location.href = '/api/auth/discord'}
        authLoading={authLoading}
        onBrandClick={handleBrandClick}
      />

      {/* Tabs Bar */}
      {selectedGuild && (
        <div className="tabs-header">
          <button
            className={`tab-btn ${activeTab === 'cards' ? 'active' : ''}`}
            onClick={() => setActiveTab('cards')}
          >
            <BookOpen size={16} />
            <span>Roles</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Sliders size={16} />
            <span>Channels</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <ShieldCheck size={16} />
            <span>Security</span>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="main-content">
        {authLoading ? (
          <div style={{ textAlign: 'center', padding: '6rem 1rem' }}>
            <div className="spinner-ring" />
            <p style={{ marginTop: '1.25rem', color: 'var(--text-light-muted)', fontSize: '0.9rem', letterSpacing: '0.04em' }}>
              Loading session...
            </p>
          </div>
        ) : !user ? (
          <div
            className="glass-panel"
            style={{
              textAlign: 'center',
              padding: '3rem 1.5rem',
              maxWidth: '540px',
              margin: '2rem auto'
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🐺</div>
            <h2 className="fantasy-font" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
              Welcome to Loup-Garou Engine
            </h2>
            <p style={{ color: 'var(--text-light-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              Sign in with your Discord account to manage your server game settings or global role cards.
            </p>
            <button className="btn btn-gold" onClick={() => window.location.href = '/api/auth/discord'}>
              Connect with Discord
            </button>
          </div>
        ) : !selectedGuild ? (
          <div style={{ maxWidth: '960px', margin: '1rem auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <h1 className="fantasy-font" style={{ fontSize: '2.2rem', marginBottom: '0.5rem', color: 'var(--text-cream)' }}>
                Select a Server
              </h1>
              <p style={{ color: 'var(--text-light-muted)', fontSize: '0.95rem' }}>
                Pick one of your Discord servers below to manage channels, narrator permissions, and game rules.
              </p>
              {user?.isSuperAdmin && (
                <div style={{ marginTop: '1.2rem' }}>
                  <button
                    className="btn btn-gold"
                    style={{ fontSize: '0.88rem', padding: '0.6rem 1.4rem' }}
                    onClick={() => {
                      setSelectedGuild({ id: 'global', name: 'Global Role Management' });
                      setActiveTab('cards');
                    }}
                  >
                    👑 Super Admin: Global Role Library
                  </button>
                </div>
              )}
            </div>

            {guilds.filter((g) => g.owner === true).length === 0 ? (
              <div
                className="glass-panel"
                style={{ textAlign: 'center', padding: '3rem 1.5rem', maxWidth: '500px', margin: '0 auto' }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>👑</div>
                <h3 className="fantasy-font" style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                  No Owned Servers Found
                </h3>
                <p style={{ color: 'var(--text-light-muted)', fontSize: '0.85rem' }}>
                  You need to be the creator / owner of a Discord server to configure it here.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                {/* 1. TOP LINE: Servers with Bot Active */}
                {guilds.filter((g) => g.owner === true && g.hasBot === true).length > 0 && (
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '1.2rem',
                      paddingBottom: '0.5rem',
                      borderBottom: '1px solid var(--border-gold-dim)'
                    }}>
                      <span style={{ fontSize: '1.1rem' }}>🟢</span>
                      <h2 className="fantasy-font" style={{ fontSize: '1.15rem', color: 'var(--text-cream)', letterSpacing: '0.04em' }}>
                        Active Bot Servers
                      </h2>
                      <span style={{
                        fontSize: '0.7rem',
                        background: 'rgba(34, 197, 94, 0.15)',
                        color: '#4ade80',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        borderRadius: '12px',
                        padding: '2px 8px',
                        fontWeight: 600
                      }}>
                        Ready to Manage
                      </span>
                    </div>

                    <div className="carlbot-servers-grid">
                      {guilds
                        .filter((g) => g.owner === true && g.hasBot === true)
                        .map((g) => (
                          <div
                            key={g.id}
                            className="carlbot-server-item"
                            onClick={() => {
                              handleSelectGuild(g);
                              setActiveTab('cards');
                            }}
                          >
                            <div className="carlbot-circle-wrapper has-bot">
                              {g.icon ? (
                                <img
                                  src={g.icon}
                                  alt={g.name}
                                  className="carlbot-server-avatar"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="carlbot-server-avatar">
                                  {g.name.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              <span className="carlbot-bot-badge active">✓</span>
                            </div>

                            <span className="carlbot-server-name" title={g.name}>
                              {g.name}
                            </span>

                            <span className="carlbot-server-action active">
                              Manage
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* 2. BOTTOM LINE: Other Owned Servers (Bot Not Added Yet) */}
                {guilds.filter((g) => g.owner === true && !g.hasBot).length > 0 && (
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '1.2rem',
                      paddingBottom: '0.5rem',
                      borderBottom: '1px solid var(--border-dark)'
                    }}>
                      <span style={{ fontSize: '1.1rem' }}>⚡</span>
                      <h2 className="fantasy-font" style={{ fontSize: '1.15rem', color: 'var(--text-light-muted)', letterSpacing: '0.04em' }}>
                        Invite Bot to More Servers
                      </h2>
                      <span style={{
                        fontSize: '0.7rem',
                        background: 'rgba(212, 175, 55, 0.12)',
                        color: 'var(--gold)',
                        border: '1px solid var(--border-gold-dim)',
                        borderRadius: '12px',
                        padding: '2px 8px',
                        fontWeight: 600
                      }}>
                        Needs Bot Invite
                      </span>
                    </div>

                    <div className="carlbot-servers-grid">
                      {guilds
                        .filter((g) => g.owner === true && !g.hasBot)
                        .map((g) => (
                          <div
                            key={g.id}
                            className="carlbot-server-item"
                            onClick={() => {
                              const url = g.inviteUrl || `https://discord.com/oauth2/authorize?client_id=1547209385166766090&permissions=8&scope=bot&guild_id=${g.id}&disable_guild_select=true`;
                              window.open(url, '_blank');
                            }}
                          >
                            <div className="carlbot-circle-wrapper no-bot">
                              {g.icon ? (
                                <img
                                  src={g.icon}
                                  alt={g.name}
                                  className="carlbot-server-avatar"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="carlbot-server-avatar">
                                  {g.name.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              <span className="carlbot-bot-badge invite">+</span>
                            </div>

                            <span className="carlbot-server-name" title={g.name}>
                              {g.name}
                            </span>

                            <span className="carlbot-server-action invite">
                              + Invite
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : loading && !settings ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '2rem', animation: 'spin 1s infinite' }}>🌙</div>
            <p style={{ marginTop: '0.75rem', color: 'var(--text-dark-secondary)', fontStyle: 'italic' }}>Loading server data...</p>
          </div>
        ) : selectedGuild.id !== 'global' && selectedGuild.isAllowed === false ? (
          <RestrictedServerView
            selectedGuild={selectedGuild}
            allowedGuilds={allowedGuilds}
            contactUser={contactUser}
            userGuilds={guilds}
            onSelectGuild={handleSelectGuild}
          />
        ) : (
          <>
            {selectedGuild.id !== 'global' && !selectedGuild.hasBot && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem 1.5rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                  <div>
                    <div style={{ fontWeight: 600, color: '#fca5a5', fontSize: '0.92rem' }}>
                      Bot not present on {selectedGuild.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-light-muted)' }}>
                      To activate role auto-replies and channel listener features, you must invite the Loup-Garou bot first.
                    </div>
                  </div>
                </div>

                <a
                  href={selectedGuild.inviteUrl || `https://discord.com/oauth2/authorize?client_id=1547209385166766090&permissions=8&scope=bot&guild_id=${selectedGuild.id}&disable_guild_select=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-gold"
                  onClick={(e) => {
                    e.stopPropagation();
                    const url = selectedGuild.inviteUrl || `https://discord.com/oauth2/authorize?client_id=1547209385166766090&permissions=8&scope=bot&guild_id=${selectedGuild.id}&disable_guild_select=true`;
                    window.open(url, '_blank');
                  }}
                  style={{ fontSize: '0.82rem', padding: '0.5rem 1rem', cursor: 'pointer' }}
                >
                  + Invite Bot to {selectedGuild.name}
                </a>
              </div>
            )}
            {activeTab === 'cards' && (
              <CardsTab
                cards={cards}
                onSaveCard={handleSaveCard}
                onDeleteCard={handleDeleteCard}
                selectedGuildName={selectedGuild.name}
                isSuperAdmin={user?.isSuperAdmin}
              />
            )}
            {activeTab === 'settings' && (
              <SettingsTab
                settings={settings}
                channels={channels}
                onSaveSettings={handleSaveSettings}
                selectedGuildName={selectedGuild.name}
              />
            )}

            {activeTab === 'security' && (
              <SecurityTab
                settings={settings}
                selectedGuildName={selectedGuild.name}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
export default App;
