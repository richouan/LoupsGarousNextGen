import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  Server,
  Trash2,
  Plus,
  Crown,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Globe,
  Lock,
  ShieldCheck
} from 'lucide-react';

export interface AllowedGuild {
  id: string;
  name: string;
  icon: string | null;
  addedBy?: string | null;
  createdAt?: string;
}

export interface SuperAdmin {
  id: string;
  username: string;
  avatar: string | null;
  addedBy?: string | null;
  createdAt?: string;
}

interface BotSettingsTabProps {
  currentUser: any;
  onAllowedGuildsUpdated?: (guilds: AllowedGuild[]) => void;
  onWhitelistToggle?: (enabled: boolean) => void;
}

export const BotSettingsTab: React.FC<BotSettingsTabProps> = ({
  currentUser,
  onAllowedGuildsUpdated,
  onWhitelistToggle
}) => {
  const [allowedGuilds, setAllowedGuilds] = useState<AllowedGuild[]>([]);
  const [superAdmins, setSuperAdmins] = useState<SuperAdmin[]>([]);
  const [isWhitelistEnabled, setIsWhitelistEnabled] = useState<boolean>(true);
  const [isTogglingWhitelist, setIsTogglingWhitelist] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form inputs
  const [newGuildId, setNewGuildId] = useState('');
  const [isAddingGuild, setIsAddingGuild] = useState(false);
  const [guildMessage, setGuildMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [newUserId, setNewUserId] = useState('');
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [adminMessage, setAdminMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAdminSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/bot/admin-settings');
      setAllowedGuilds(res.data.allowedGuilds || []);
      setSuperAdmins(res.data.superAdmins || []);
      if (res.data.isWhitelistEnabled !== undefined) {
        setIsWhitelistEnabled(res.data.isWhitelistEnabled);
        if (onWhitelistToggle) {
          onWhitelistToggle(res.data.isWhitelistEnabled);
        }
      }
      if (onAllowedGuildsUpdated) {
        onAllowedGuildsUpdated(res.data.allowedGuilds || []);
      }
    } catch (err: any) {
      console.error('Failed to load admin settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminSettings();
  }, []);

  // 1. Toggle Whitelist Mode
  const handleToggleWhitelist = async () => {
    const nextState = !isWhitelistEnabled;
    setIsTogglingWhitelist(true);
    try {
      const res = await api.post('/bot/whitelist-toggle', { enabled: nextState });
      setIsWhitelistEnabled(res.data.isWhitelistEnabled);
      if (onWhitelistToggle) {
        onWhitelistToggle(res.data.isWhitelistEnabled);
      }
    } catch (err: any) {
      alert('Erreur lors du changement de mode: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsTogglingWhitelist(false);
    }
  };

  // 2. Add Allowed Guild
  const handleAddGuild = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newGuildId.trim();
    if (!cleanId) return;

    setIsAddingGuild(true);
    setGuildMessage(null);

    try {
      const res = await api.post('/bot/allowed-guilds', { guildId: cleanId });
      setGuildMessage({
        type: 'success',
        text: `Serveur "${res.data.guild?.name || cleanId}" ajouté !`
      });
      setNewGuildId('');
      fetchAdminSettings();
    } catch (err: any) {
      setGuildMessage({
        type: 'error',
        text: err.response?.data?.error || 'Erreur lors de l\'ajout du serveur.'
      });
    } finally {
      setIsAddingGuild(false);
    }
  };

  // 3. Delete Allowed Guild
  const handleDeleteGuild = async (guildId: string, guildName: string) => {
    if (!window.confirm(`Retirer l'autorisation pour "${guildName}" (${guildId}) ?`)) {
      return;
    }

    try {
      await api.delete(`/bot/allowed-guilds/${guildId}`);
      setAllowedGuilds((prev) => prev.filter((g) => g.id !== guildId));
      fetchAdminSettings();
    } catch (err: any) {
      alert('Impossible de supprimer: ' + (err.response?.data?.error || err.message));
    }
  };

  // 4. Add Super Admin
  const handleAddSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newUserId.trim();
    if (!cleanId) return;

    setIsAddingAdmin(true);
    setAdminMessage(null);

    try {
      const res = await api.post('/bot/super-admins', { userId: cleanId });
      setAdminMessage({
        type: 'success',
        text: `Admin "${res.data.superAdmin?.username || cleanId}" ajouté !`
      });
      setNewUserId('');
      fetchAdminSettings();
    } catch (err: any) {
      setAdminMessage({
        type: 'error',
        text: err.response?.data?.error || 'Erreur lors de l\'ajout du Super Admin.'
      });
    } finally {
      setIsAddingAdmin(false);
    }
  };

  // 5. Delete Super Admin
  const handleDeleteSuperAdmin = async (userId: string, username: string) => {
    if (!window.confirm(`Révoquer les droits Super Admin pour "${username}" (${userId}) ?`)) {
      return;
    }

    try {
      await api.delete(`/bot/super-admins/${userId}`);
      setSuperAdmins((prev) => prev.filter((sa) => sa.id !== userId));
      fetchAdminSettings();
    } catch (err: any) {
      alert('Impossible de révoquer: ' + (err.response?.data?.error || err.message));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div style={{ animation: 'fadeIn 0.2s ease', maxWidth: '1240px', margin: '0 auto' }}>
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ margin: 0, fontSize: '1.35rem', fontFamily: 'var(--font-title)' }}>
                Paramètres Bot & Gestion Dev
              </h1>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  background: 'rgba(168, 85, 247, 0.15)',
                  border: '1px solid rgba(168, 85, 247, 0.4)',
                  color: '#c084fc',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '9999px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em'
                }}
              >
                <Crown size={11} /> ROOT DEV
              </span>
            </div>
            <p style={{ margin: 0, color: 'var(--text-dark-secondary)', fontSize: '0.82rem', marginTop: '0.15rem' }}>
              Contrôlez le mode d'accès du bot (Whitelist / Public) et les permissions des Super Admins.
            </p>
          </div>
        </div>

        <button
          onClick={fetchAdminSettings}
          className="btn btn-secondary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.8rem',
            padding: '0.4rem 0.75rem'
          }}
          disabled={loading}
          title="Rafraîchir les données"
        >
          <RefreshCw size={13} className={loading ? 'spin' : ''} /> Actualiser
        </button>
      </div>

      {/* Main 2-Column High-Density Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
          gap: '1.25rem',
          alignItems: 'start'
        }}
      >
        {/* ========================================================================= */}
        {/* COLUMN 1: SERVEURS AUTORISÉS & MODE WHITELIST TOGGLE                     */}
        {/* ========================================================================= */}
        <div
          className="glass-panel"
          style={{
            padding: '1.2rem',
            borderRadius: 'var(--radius-md)',
            border: isWhitelistEnabled
              ? '1px solid rgba(234, 179, 8, 0.25)'
              : '1px solid rgba(59, 130, 246, 0.25)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)'
          }}
        >
          {/* Card Header with Whitelist Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.85rem',
              gap: '0.5rem',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: isWhitelistEnabled ? 'rgba(234, 179, 8, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: isWhitelistEnabled ? '1px solid rgba(234, 179, 8, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)'
                }}
              >
                {isWhitelistEnabled ? <Server size={17} color="var(--gold)" /> : <Globe size={17} color="#60a5fa" />}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <h2 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-gold)', fontFamily: 'var(--font-title)' }}>
                    Serveurs Autorisés
                  </h2>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      background: 'rgba(255, 255, 255, 0.08)',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '4px',
                      color: 'var(--text-cream)'
                    }}
                  >
                    {allowedGuilds.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Whitelist Toggle Switch */}
            <div
              onClick={!isTogglingWhitelist ? handleToggleWhitelist : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                background: 'rgba(0, 0, 0, 0.35)',
                padding: '0.25rem 0.5rem 0.25rem 0.65rem',
                borderRadius: '9999px',
                border: isWhitelistEnabled
                  ? '1px solid rgba(34, 197, 94, 0.4)'
                  : '1px solid rgba(148, 163, 184, 0.25)',
                cursor: isTogglingWhitelist ? 'wait' : 'pointer',
                userSelect: 'none',
                transition: 'all 0.2s ease'
              }}
              title={isWhitelistEnabled ? "Cliquez pour désactiver la whitelist (mode public)" : "Cliquez pour activer la whitelist"}
            >
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: isWhitelistEnabled ? '#4ade80' : '#94a3b8',
                  letterSpacing: '0.02em'
                }}
              >
                {isWhitelistEnabled ? 'Whitelist Active' : 'Mode Public'}
              </span>

              {/* Pill Switch */}
              <div
                style={{
                  width: '34px',
                  height: '18px',
                  background: isWhitelistEnabled ? '#16a34a' : '#334155',
                  borderRadius: '9999px',
                  position: 'relative',
                  transition: 'background 0.2s ease'
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '2px',
                    left: isWhitelistEnabled ? '18px' : '2px',
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    transition: 'left 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Mode Status Banner (Compact) */}
          <div
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.78rem',
              lineHeight: '1.35',
              marginBottom: '0.85rem',
              background: isWhitelistEnabled ? 'rgba(34, 197, 94, 0.08)' : 'rgba(59, 130, 246, 0.08)',
              border: isWhitelistEnabled ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(59, 130, 246, 0.2)',
              color: isWhitelistEnabled ? '#86efac' : '#93c5fd',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            {isWhitelistEnabled ? (
              <>
                <Lock size={13} style={{ flexShrink: 0 }} />
                <span>
                  <strong>Mode Restreint :</strong> Seuls les serveurs listés ci-dessous peuvent utiliser le bot. Les autres verront l'écran de restriction.
                </span>
              </>
            ) : (
              <>
                <Globe size={13} style={{ flexShrink: 0 }} />
                <span>
                  <strong>Mode Public :</strong> Tous les serveurs Discord peuvent inviter et utiliser le bot sans restriction.
                </span>
              </>
            )}
          </div>

          {/* Compact Inline Add Server Form */}
          <form
            onSubmit={handleAddGuild}
            style={{
              display: 'flex',
              gap: '0.4rem',
              alignItems: 'center',
              marginBottom: '0.85rem'
            }}
          >
            <input
              type="text"
              placeholder="ID Discord du serveur (ex: 1461119651021979710)"
              value={newGuildId}
              onChange={(e) => setNewGuildId(e.target.value)}
              style={{
                flex: 1,
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '6px',
                padding: '0.45rem 0.75rem',
                color: '#ffffff',
                fontSize: '0.82rem',
                outline: 'none',
                transition: 'border-color 0.15s ease'
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--gold)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)')}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isAddingGuild || !newGuildId.trim()}
              style={{
                padding: '0.45rem 0.85rem',
                fontSize: '0.8rem',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                height: '34px'
              }}
            >
              <Plus size={14} /> {isAddingGuild ? 'Ajout...' : 'Ajouter'}
            </button>
          </form>

          {/* Feedback message */}
          {guildMessage && (
            <div
              style={{
                padding: '0.4rem 0.65rem',
                borderRadius: '6px',
                fontSize: '0.76rem',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background:
                  guildMessage.type === 'success'
                    ? 'rgba(34, 197, 94, 0.15)'
                    : 'rgba(239, 68, 68, 0.15)',
                border:
                  guildMessage.type === 'success'
                    ? '1px solid rgba(34, 197, 94, 0.3)'
                    : '1px solid rgba(239, 68, 68, 0.3)',
                color: guildMessage.type === 'success' ? '#86efac' : '#fca5a5'
              }}
            >
              {guildMessage.type === 'success' ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
              <span>{guildMessage.text}</span>
            </div>
          )}

          {/* Compact Scrollable Server List */}
          <div
            style={{
              maxHeight: '320px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              paddingRight: '0.2rem'
            }}
          >
            {allowedGuilds.map((guild, index) => {
              const isCopied = copiedId === guild.id;
              return (
                <div
                  key={guild.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.55rem 0.75rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '6px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.borderColor = 'rgba(234, 179, 8, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                    {guild.icon ? (
                      <img
                        src={guild.icon}
                        alt={guild.name}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          objectFit: 'cover',
                          border: '1px solid rgba(234, 179, 8, 0.3)'
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: 'rgba(234, 179, 8, 0.15)',
                          border: '1px solid rgba(234, 179, 8, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: 'var(--gold)'
                        }}
                      >
                        {guild.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            color: '#eab308',
                            letterSpacing: '0.04em'
                          }}
                        >
                          SERVEUR {index + 1}
                        </span>
                        <span style={{ fontSize: '0.6rem', color: '#22c55e' }}>●</span>
                      </div>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          color: 'var(--text-cream)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                        title={guild.name}
                      >
                        {guild.name}
                      </div>
                      <div
                        onClick={() => copyToClipboard(guild.id)}
                        style={{
                          fontSize: '0.7rem',
                          color: 'var(--text-dark-secondary)',
                          fontFamily: 'monospace',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          cursor: 'pointer'
                        }}
                        title="Cliquer pour copier l'ID"
                      >
                        <span>ID: {guild.id}</span>
                        {isCopied ? <Check size={11} color="#4ade80" /> : <Copy size={11} />}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteGuild(guild.id, guild.name)}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: '#f87171',
                      borderRadius: '6px',
                      padding: '0.35rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease',
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                      e.currentTarget.style.borderColor = '#ef4444';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
                    }}
                    title="Retirer ce serveur de la whitelist"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}

            {allowedGuilds.length === 0 && (
              <div
                style={{
                  padding: '1.25rem',
                  textAlign: 'center',
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '6px',
                  color: 'var(--text-dark-secondary)',
                  fontSize: '0.8rem'
                }}
              >
                Aucun serveur spécifique autorisé.
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 2: GESTION DES SUPER ADMINS                                       */}
        {/* ========================================================================= */}
        <div
          className="glass-panel"
          style={{
            padding: '1.2rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(168, 85, 247, 0.25)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)'
          }}
        >
          {/* Card Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.85rem',
              gap: '0.5rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(168, 85, 247, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(168, 85, 247, 0.3)'
                }}
              >
                <Crown size={17} color="#c084fc" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <h2 style={{ margin: 0, fontSize: '1.05rem', color: '#e9d5ff', fontFamily: 'var(--font-title)' }}>
                    Super Administrateurs
                  </h2>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      background: 'rgba(255, 255, 255, 0.08)',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '4px',
                      color: 'var(--text-cream)'
                    }}
                  >
                    {1 + superAdmins.length}
                  </span>
                </div>
              </div>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dark-secondary)' }}>
              Accès aux cartes & config
            </span>
          </div>

          {/* Root Dev Compact Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.55rem 0.75rem',
              background: 'linear-gradient(90deg, rgba(168, 85, 247, 0.12) 0%, rgba(234, 179, 8, 0.08) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.35)',
              borderRadius: '6px',
              marginBottom: '0.85rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(168, 85, 247, 0.25)',
                  border: '1px solid #c084fc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Crown size={15} color="#e9d5ff" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#ffffff' }}>
                    rachiid
                  </span>
                  <span
                    style={{
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      background: 'rgba(168, 85, 247, 0.25)',
                      color: '#c084fc',
                      border: '1px solid rgba(168, 85, 247, 0.4)',
                      padding: '0.05rem 0.35rem',
                      borderRadius: '4px'
                    }}
                  >
                    ROOT DEV
                  </span>
                </div>
                <div
                  onClick={() => copyToClipboard('548893712806182932')}
                  style={{
                    fontSize: '0.68rem',
                    color: '#cbd5e1',
                    fontFamily: 'monospace',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    cursor: 'pointer'
                  }}
                  title="Cliquer pour copier l'ID"
                >
                  <span>ID: 548893712806182932 • Système</span>
                  {copiedId === '548893712806182932' ? <Check size={11} color="#4ade80" /> : <Copy size={11} />}
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.68rem',
                color: '#a855f7',
                fontWeight: 600,
                background: 'rgba(168, 85, 247, 0.1)',
                padding: '0.2rem 0.45rem',
                borderRadius: '4px'
              }}
            >
              Inamovible
            </span>
          </div>

          {/* Compact Inline Add Super Admin Form */}
          <form
            onSubmit={handleAddSuperAdmin}
            style={{
              display: 'flex',
              gap: '0.4rem',
              alignItems: 'center',
              marginBottom: '0.85rem'
            }}
          >
            <input
              type="text"
              placeholder="ID Discord du nouvel admin (ex: 992802718735401050)"
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
              style={{
                flex: 1,
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '6px',
                padding: '0.45rem 0.75rem',
                color: '#ffffff',
                fontSize: '0.82rem',
                outline: 'none',
                transition: 'border-color 0.15s ease'
              }}
              onFocus={(e) => (e.target.style.borderColor = '#c084fc')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)')}
            />
            <button
              type="submit"
              className="btn btn-secondary"
              disabled={isAddingAdmin || !newUserId.trim()}
              style={{
                padding: '0.45rem 0.85rem',
                fontSize: '0.8rem',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                height: '34px',
                borderColor: 'rgba(168, 85, 247, 0.4)',
                color: '#e9d5ff'
              }}
            >
              <Plus size={14} /> {isAddingAdmin ? 'Ajout...' : 'Ajouter'}
            </button>
          </form>

          {/* Feedback message */}
          {adminMessage && (
            <div
              style={{
                padding: '0.4rem 0.65rem',
                borderRadius: '6px',
                fontSize: '0.76rem',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background:
                  adminMessage.type === 'success'
                    ? 'rgba(34, 197, 94, 0.15)'
                    : 'rgba(239, 68, 68, 0.15)',
                border:
                  adminMessage.type === 'success'
                    ? '1px solid rgba(34, 197, 94, 0.3)'
                    : '1px solid rgba(239, 68, 68, 0.3)',
                color: adminMessage.type === 'success' ? '#86efac' : '#fca5a5'
              }}
            >
              {adminMessage.type === 'success' ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
              <span>{adminMessage.text}</span>
            </div>
          )}

          {/* Compact Scrollable Super Admins List */}
          <div
            style={{
              maxHeight: '320px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              paddingRight: '0.2rem'
            }}
          >
            {superAdmins.map((admin) => {
              const isCopied = copiedId === admin.id;
              return (
                <div
                  key={admin.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.55rem 0.75rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '6px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                    {admin.avatar ? (
                      <img
                        src={admin.avatar}
                        alt={admin.username}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '1px solid rgba(168, 85, 247, 0.3)'
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'rgba(168, 85, 247, 0.15)',
                          border: '1px solid rgba(168, 85, 247, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#c084fc'
                        }}
                      >
                        {admin.username.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            color: 'var(--text-cream)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                          title={admin.username}
                        >
                          {admin.username}
                        </span>
                        <span
                          style={{
                            fontSize: '0.6rem',
                            background: 'rgba(168, 85, 247, 0.15)',
                            color: '#c084fc',
                            padding: '0.05rem 0.3rem',
                            borderRadius: '3px',
                            fontWeight: 600
                          }}
                        >
                          SUPER ADMIN
                        </span>
                      </div>
                      <div
                        onClick={() => copyToClipboard(admin.id)}
                        style={{
                          fontSize: '0.7rem',
                          color: 'var(--text-dark-secondary)',
                          fontFamily: 'monospace',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          cursor: 'pointer'
                        }}
                        title="Cliquer pour copier l'ID"
                      >
                        <span>ID: {admin.id}</span>
                        {isCopied ? <Check size={11} color="#4ade80" /> : <Copy size={11} />}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteSuperAdmin(admin.id, admin.username)}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: '#f87171',
                      borderRadius: '6px',
                      padding: '0.35rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease',
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                      e.currentTarget.style.borderColor = '#ef4444';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
                    }}
                    title="Révoquer ce Super Admin"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}

            {superAdmins.length === 0 && (
              <div
                style={{
                  padding: '1.25rem',
                  textAlign: 'center',
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '6px',
                  color: 'var(--text-dark-secondary)',
                  fontSize: '0.8rem'
                }}
              >
                Aucun Super Admin supplémentaire délégué.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
