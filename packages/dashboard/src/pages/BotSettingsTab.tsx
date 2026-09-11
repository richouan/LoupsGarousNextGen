import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  Server,
  ShieldAlert,
  Trash2,
  Plus,
  Crown,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Lock,
  UserCheck,
  Settings,
  LayoutList,
  MessageSquare,
  Terminal,
  ShieldCheck,
  FileText,
  Database,
  Wrench
} from 'lucide-react';

interface AllowedGuild {
  id: string;
  name: string;
  icon: string | null;
  addedBy?: string | null;
  createdAt?: string;
}

interface SuperAdmin {
  id: string;
  username: string;
  avatar: string | null;
  addedBy?: string | null;
  createdAt?: string;
}

interface BotSettingsTabProps {
  currentUser: any;
  onAllowedGuildsUpdated?: (guilds: AllowedGuild[]) => void;
}

export const BotSettingsTab: React.FC<BotSettingsTabProps> = ({
  currentUser,
  onAllowedGuildsUpdated
}) => {
  const [allowedGuilds, setAllowedGuilds] = useState<AllowedGuild[]>([]);
  const [superAdmins, setSuperAdmins] = useState<SuperAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('servers');

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

  // 1. Add Allowed Guild
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
        text: `Serveur "${res.data.guild?.name || cleanId}" ajouté avec succès !`
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

  // 2. Delete Allowed Guild
  const handleDeleteGuild = async (guildId: string, guildName: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir retirer l'autorisation pour "${guildName}" (${guildId}) ? Le bot cessera de répondre sur ce serveur.`)) {
      return;
    }

    try {
      await api.delete(`/bot/allowed-guilds/${guildId}`);
      setAllowedGuilds(allowedGuilds.filter((g) => g.id !== guildId));
      fetchAdminSettings();
    } catch (err: any) {
      alert('Impossible de supprimer ce serveur: ' + (err.response?.data?.error || err.message));
    }
  };

  // 3. Add Super Admin
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
        text: `Super Admin "${res.data.superAdmin?.username || cleanId}" ajouté avec succès !`
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

  // 4. Delete Super Admin
  const handleDeleteSuperAdmin = async (userId: string, username: string) => {
    if (!window.confirm(`Révoquer les droits Super Admin pour "${username}" (${userId}) ?`)) {
      return;
    }

    try {
      await api.delete(`/bot/super-admins/${userId}`);
      setSuperAdmins(superAdmins.filter((sa) => sa.id !== userId));
      fetchAdminSettings();
    } catch (err: any) {
      alert('Impossible de révoquer ce Super Admin: ' + (err.response?.data?.error || err.message));
    }
  };

  const sidebarTabs = [
    { id: 'servers', label: 'Serveurs autorisés', sub: 'Gérez la whitelist', icon: Server },
    { id: 'admins', label: 'Super Admins', sub: 'Gérez les administrateurs', icon: Crown },
    { id: 'general', label: 'Paramètres généraux', sub: 'Configuration du bot', icon: Settings },
    { id: 'game', label: 'Paramètres de jeu', sub: 'Rôles et mécaniques', icon: LayoutList },
    { id: 'messages', label: 'Messages & Embeds', sub: 'Personnalisation', icon: MessageSquare },
    { id: 'commands', label: 'Commandes', sub: 'Activation et permissions', icon: Terminal },
    { id: 'security', label: 'Sécurité', sub: 'Restrictions et protection', icon: ShieldCheck },
    { id: 'logs', label: 'Logs & Audit', sub: 'Historique des actions', icon: FileText },
    { id: 'backup', label: 'Backup & Export', sub: 'Sauvegarde', icon: Database },
    { id: 'tools', label: 'Outils développeur', sub: 'Variables avancées', icon: Wrench },
  ];

  return (
    <div style={{ animation: 'fadeIn 0.25s ease' }}>
      {/* Tab Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
            <h1 style={{ margin: 0 }}>Paramètres Bot & Gestion Dev</h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: 'rgba(234, 179, 8, 0.15)',
                border: '1px solid rgba(234, 179, 8, 0.4)',
                color: '#facc15',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.05em'
              }}
            >
              <Crown size={12} /> ROOT DEV
            </span>
          </div>
          <p style={{ color: 'var(--text-dark-secondary)', fontSize: '0.95rem' }}>
            Contrôlez les serveurs autorisés (Whitelist Bêta) et déléguez les privilèges Super Admin en direct depuis le tableau de bord.
          </p>
        </div>

        <button
          onClick={fetchAdminSettings}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.84rem' }}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Actualiser
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Sidebar */}
        <div style={{ width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {sidebarTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.85rem 1rem',
                  background: isActive ? 'var(--bg-dark-surface)' : 'transparent',
                  border: '1px solid',
                  borderColor: isActive ? 'var(--gold)' : 'transparent',
                  borderRadius: 'var(--radius-sm)',
                  color: isActive ? 'var(--gold)' : 'var(--text-cream)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={18} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.92rem', fontWeight: isActive ? 700 : 500 }}>
                    {tab.label}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: isActive ? 'rgba(201, 168, 76, 0.8)' : 'var(--text-muted)' }}>
                    {tab.sub}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {activeSubTab === 'servers' && (
            <>
              {/* ========================================================================= */}
              {/* SECTION 1: SERVEURS AUTORISÉS (WHITELIST) */}
              {/* ========================================================================= */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <Server size={22} color="var(--gold)" />
            <h2 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-gold)', fontFamily: 'var(--font-title)' }}>
              Serveurs Partenaires Autorisés (Whitelist)
            </h2>
          </div>
          <p style={{ color: 'var(--text-light-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
            Seuls les serveurs listés ci-dessous peuvent utiliser le bot Loup-Garou et configurer des salons. Tout autre serveur qui tente d'utiliser le bot verra l'écran de restriction et l'invitation à contacter le développeur.
          </p>

          {/* Add Guild Form */}
          <form
            onSubmit={handleAddGuild}
            style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center',
              marginBottom: '1.5rem',
              background: 'rgba(0, 0, 0, 0.25)',
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ flex: 1, minWidth: '240px' }}>
              <input
                type="text"
                className="input-text"
                placeholder="ID du serveur Discord (ex: 1461119651021979710)"
                value={newGuildId}
                onChange={(e) => setNewGuildId(e.target.value)}
                disabled={isAddingGuild}
                style={{ width: '100%' }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-gold"
              disabled={isAddingGuild || !newGuildId.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.25rem' }}
            >
              <Plus size={16} />
              {isAddingGuild ? 'Recherche Discord...' : 'Ajouter le serveur'}
            </button>
          </form>

          {guildMessage && (
            <div
              style={{
                padding: '0.65rem 1rem',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.88rem',
                background: guildMessage.type === 'success' ? 'rgba(74, 222, 128, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                border: `1px solid ${guildMessage.type === 'success' ? 'rgba(74, 222, 128, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                color: guildMessage.type === 'success' ? '#86efac' : '#fca5a5'
              }}
            >
              {guildMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              <span>{guildMessage.text}</span>
            </div>
          )}

          {/* List of Allowed Guilds */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {allowedGuilds.map((g, index) => (
              <div
                key={g.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(201, 168, 76, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                  position: 'relative'
                }}
              >
                {g.icon ? (
                  <img
                    src={g.icon}
                    alt={g.name}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid var(--gold)'
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'var(--bg-main)',
                      border: '2px solid var(--gold)',
                      color: 'var(--gold)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '1.1rem'
                    }}
                  >
                    {g.name ? g.name.substring(0, 2).toUpperCase() : 'LG'}
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-gold)', fontWeight: 600, textTransform: 'uppercase' }}>
                      Serveur {index + 1}
                    </span>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#4ade80' }} />
                  </div>

                  <div
                    style={{
                      fontWeight: 700,
                      color: '#ffffff',
                      fontSize: '0.96rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {g.name}
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-light-muted)', fontFamily: 'monospace', marginTop: '0.15rem' }}>
                    ID: {g.id}
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteGuild(g.id, g.name)}
                  className="btn"
                  title="Retirer ce serveur"
                  style={{
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    padding: '0.45rem',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            {allowedGuilds.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-light-muted)', gridColumn: '1 / -1' }}>
                Aucun serveur autorisé configuré.
              </div>
            )}
          </div>
        </div>

            </>
          )}

          {activeSubTab === 'admins' && (
            <>
              {/* ========================================================================= */}
              {/* SECTION 2: GESTION DES SUPER ADMINS */}
              {/* ========================================================================= */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <Crown size={22} color="var(--gold)" />
            <h2 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-gold)', fontFamily: 'var(--font-title)' }}>
              Gestion des Super Admins
            </h2>
          </div>
          <p style={{ color: 'var(--text-light-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
            Les Super Admins disposent des droits globaux pour créer, modifier et supprimer les cartes de jeu ainsi que configurer les paramètres généraux. Vous êtes le seul <strong>Root Dev</strong> et pouvez nommer ou révoquer des Super Admins à tout moment sans redémarrer le serveur.
          </p>

          {/* Root Dev Card */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(201, 168, 76, 0.12), rgba(15, 23, 42, 0.7))',
              border: '1.5px solid rgba(201, 168, 76, 0.5)',
              borderRadius: 'var(--radius-md)',
              padding: '1.1rem 1.4rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1.1rem',
              marginBottom: '1.5rem',
              boxShadow: '0 6px 20px rgba(0,0,0,0.3)'
            }}
          >
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.username}
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  border: '2px solid var(--gold)',
                  boxShadow: '0 0 12px rgba(201, 168, 76, 0.4)'
                }}
              />
            ) : (
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'var(--gold)',
                  color: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.3rem'
                }}
              >
                {currentUser?.username?.substring(0, 2).toUpperCase() || 'DV'}
              </div>
            )}

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '1.05rem' }}>
                  {currentUser?.username}
                </div>
                <span
                  style={{
                    background: 'var(--gold)',
                    color: '#000',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    letterSpacing: '0.04em'
                  }}
                >
                  ROOT DEV
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-gold)', fontFamily: 'monospace' }}>
                ID: {currentUser?.id} • Protégé par les variables système
              </div>
            </div>
          </div>

          {/* Add Super Admin Form */}
          <form
            onSubmit={handleAddSuperAdmin}
            style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center',
              marginBottom: '1.5rem',
              background: 'rgba(0, 0, 0, 0.25)',
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ flex: 1, minWidth: '240px' }}>
              <input
                type="text"
                className="input-text"
                placeholder="ID Discord du nouvel admin (ex: 548893712806182932)"
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                disabled={isAddingAdmin}
                style={{ width: '100%' }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-gold"
              disabled={isAddingAdmin || !newUserId.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.25rem' }}
            >
              <UserCheck size={16} />
              {isAddingAdmin ? 'Recherche Discord...' : 'Ajouter Super Admin'}
            </button>
          </form>

          {adminMessage && (
            <div
              style={{
                padding: '0.65rem 1rem',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.88rem',
                background: adminMessage.type === 'success' ? 'rgba(74, 222, 128, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                border: `1px solid ${adminMessage.type === 'success' ? 'rgba(74, 222, 128, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                color: adminMessage.type === 'success' ? '#86efac' : '#fca5a5'
              }}
            >
              {adminMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              <span>{adminMessage.text}</span>
            </div>
          )}

          {/* List of Delegated Super Admins */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {superAdmins.map((sa) => (
              <div
                key={sa.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.25)'
                }}
              >
                {sa.avatar ? (
                  <img
                    src={sa.avatar}
                    alt={sa.username}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '1.5px solid rgba(255, 255, 255, 0.2)'
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: 'var(--bg-main)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '1rem'
                    }}
                  >
                    {sa.username ? sa.username.substring(0, 2).toUpperCase() : 'SA'}
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem' }}>
                    <span style={{ fontSize: '0.72rem', color: '#93c5fd', fontWeight: 600, textTransform: 'uppercase' }}>
                      Super Admin
                    </span>
                  </div>

                  <div
                    style={{
                      fontWeight: 700,
                      color: '#ffffff',
                      fontSize: '0.94rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {sa.username}
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-light-muted)', fontFamily: 'monospace' }}>
                    ID: {sa.id}
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteSuperAdmin(sa.id, sa.username)}
                  className="btn"
                  title="Révoquer les droits Super Admin"
                  style={{
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    padding: '0.45rem',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            {superAdmins.length === 0 && (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-light-muted)', gridColumn: '1 / -1', fontSize: '0.88rem' }}>
                Aucun Super Admin supplémentaire délégué. Vous êtes le seul administrateur actif.
              </div>
            )}
          </div>
        </div>
            </>
          )}

          {/* Placeholders for in-development sections */}
          {['general', 'game', 'messages', 'commands', 'security', 'logs', 'backup', 'tools'].includes(activeSubTab) && (
            <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(234, 179, 8, 0.1)',
                color: 'var(--gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Wrench size={32} />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-cream)' }}>En cours de développement</h2>
              <p style={{ color: 'var(--text-light-muted)', maxWidth: '400px', margin: '0 auto', lineHeight: 1.5 }}>
                Cette section sera bientôt disponible. Elle vous permettra de configurer en détail les options avancées de votre instance Loup-Garou NextGen.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
