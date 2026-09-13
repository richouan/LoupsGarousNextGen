import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import {
  Volume2,
  RefreshCw,
  Sparkles,
  Shuffle,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  Trash2,
  Mic,
  MicOff,
  Headphones,
  Crown,
  Swords,
  Eye,
  Check,
  Copy,
  Radio,
  Clock
} from 'lucide-react';

interface LiveParticipant {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  role: 'PLAYER' | 'NARRATOR' | 'SPECTATOR';
  number: number | null;
  targetNick: string;
  originalNick: string;
  isInVoice: boolean;
  isMute: boolean;
  isDeaf: boolean;
  isAfterJoiner: boolean;
  renameStatus: 'IDLE' | 'PENDING' | 'SUCCESS' | 'SKIPPED_HIERARCHY' | 'ERROR';
  renameError?: string;
}

interface LiveSession {
  guildId: string;
  voiceChannelId: string | null;
  voiceChannelName: string | null;
  participants: LiveParticipant[];
  lastUpdated: number;
  isRenamingInProgress: boolean;
  renameProgress?: { current: number; total: number };
}

interface LivePartieTabProps {
  selectedGuild: any;
  channels: any[];
}

export const LivePartieTab: React.FC<LivePartieTabProps> = ({ selectedGuild, channels }) => {
  const [session, setSession] = useState<LiveSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [afterJoinerId, setAfterJoinerId] = useState('');
  const [afterJoinerRole, setAfterJoinerRole] = useState<'PLAYER' | 'NARRATOR'>('PLAYER');
  const [showAddJoiner, setShowAddJoiner] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const isPollingRef = useRef(true);

  // Filter voice channels (Discord channel type 2)
  const voiceChannels = channels.filter((c) => c.type === 2);

  const fetchSession = async (showLoading = false) => {
    if (!selectedGuild?.id || selectedGuild.id === 'global') return;
    try {
      if (showLoading) setLoading(true);
      const res = await api.get(`/guilds/${selectedGuild.id}/live-partie/session`);
      setSession(res.data);
    } catch (err: any) {
      console.warn('[LivePartie] Failed to fetch session:', err.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    isPollingRef.current = true;
    fetchSession(true);

    // Poll live session every 3 seconds for seamless real-time voice sync
    const interval = setInterval(() => {
      if (isPollingRef.current) {
        fetchSession(false);
      }
    }, 3000);

    return () => {
      isPollingRef.current = false;
      clearInterval(interval);
    };
  }, [selectedGuild?.id]);

  const handleSelectVoiceChannel = async (channelId: string) => {
    const selectedChan = voiceChannels.find((c) => c.id === channelId);
    setActionLoading(true);
    try {
      const res = await api.post(`/guilds/${selectedGuild.id}/live-partie/select-channel`, {
        channelId: channelId || null,
        channelName: selectedChan ? selectedChan.name : null
      });
      setSession(res.data);
      setBannerMessage({
        type: 'info',
        text: selectedChan
          ? `Écoute active sur le salon vocal : 🔊 ${selectedChan.name}`
          : 'Aucun salon vocal sélectionné.'
      });
    } catch (err: any) {
      setBannerMessage({ type: 'error', text: err.response?.data?.error || err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddAfterJoiner = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = afterJoinerId.trim();
    if (!cleanId || !/^\d{17,20}$/.test(cleanId)) {
      setBannerMessage({ type: 'error', text: "L'identifiant Discord doit être un nombre de 17 à 20 chiffres." });
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.post(`/guilds/${selectedGuild.id}/live-partie/add-after-joiner`, {
        userId: cleanId,
        role: afterJoinerRole
      });
      setSession(res.data);
      setAfterJoinerId('');
      setBannerMessage({
        type: 'success',
        text: `Joueur pré-inscrit (After-Joiner) ! Une place lui est réservée dès sa connexion vocale.`
      });
    } catch (err: any) {
      setBannerMessage({ type: 'error', text: err.response?.data?.error || err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateParticipantRole = async (userId: string, newRole: 'PLAYER' | 'NARRATOR' | 'SPECTATOR') => {
    try {
      const res = await api.post(`/guilds/${selectedGuild.id}/live-partie/update-participant`, {
        userId,
        role: newRole
      });
      setSession(res.data);
    } catch (err: any) {
      setBannerMessage({ type: 'error', text: err.response?.data?.error || err.message });
    }
  };

  const handleUpdateParticipantNumber = async (userId: string, newNumber: number | null) => {
    try {
      const res = await api.post(`/guilds/${selectedGuild.id}/live-partie/update-participant`, {
        userId,
        number: newNumber
      });
      setSession(res.data);
    } catch (err: any) {
      setBannerMessage({ type: 'error', text: err.response?.data?.error || err.message });
    }
  };

  const handleRemoveParticipant = async (userId: string) => {
    try {
      const res = await api.post(`/guilds/${selectedGuild.id}/live-partie/remove-participant`, {
        userId
      });
      setSession(res.data);
    } catch (err: any) {
      setBannerMessage({ type: 'error', text: err.response?.data?.error || err.message });
    }
  };

  const handleAutoNumber = async () => {
    setActionLoading(true);
    try {
      const res = await api.post(`/guilds/${selectedGuild.id}/live-partie/auto-number`);
      setSession(res.data);
      setBannerMessage({
        type: 'success',
        text: 'Numéros attribués automatiquement : 0000 (MJ) et 01, 02... pour les joueurs !'
      });
    } catch (err: any) {
      setBannerMessage({ type: 'error', text: err.response?.data?.error || err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRandomizeNumbers = async () => {
    setActionLoading(true);
    try {
      const res = await api.post(`/guilds/${selectedGuild.id}/live-partie/randomize-numbers`);
      setSession(res.data);
      setBannerMessage({ type: 'success', text: 'Ordre et numéros des joueurs mélangés aléatoirement !' });
    } catch (err: any) {
      setBannerMessage({ type: 'error', text: err.response?.data?.error || err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleApplyRenames = async () => {
    if (!session || session.participants.length === 0) return;
    const confirmText = "Voulez-vous renommer tous les joueurs sur Discord selon leurs numéros attribués ?";
    if (!window.confirm(confirmText)) return;

    setActionLoading(true);
    setBannerMessage({
      type: 'info',
      text: 'Renommage sur Discord en cours... Veuillez patienter quelques secondes.'
    });

    try {
      const res = await api.post(`/guilds/${selectedGuild.id}/live-partie/apply-renames`);
      setSession(res.data.session);
      setBannerMessage({
        type: 'success',
        text: '🪄 Renommage terminé sur Discord ! Les pseudos sont à jour.'
      });
    } catch (err: any) {
      setBannerMessage({ type: 'error', text: err.response?.data?.error || err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetRenames = async () => {
    if (!window.confirm("Restaurer les pseudos d'origine pour tous les participants sur Discord ?")) return;

    setActionLoading(true);
    setBannerMessage({
      type: 'info',
      text: 'Restauration des pseudos en cours sur Discord...'
    });

    try {
      const res = await api.post(`/guilds/${selectedGuild.id}/live-partie/reset-renames`);
      setSession(res.data.session);
      setBannerMessage({
        type: 'success',
        text: '↩️ Pseudos originaux restaurés sur Discord !'
      });
    } catch (err: any) {
      setBannerMessage({ type: 'error', text: err.response?.data?.error || err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const participants = session?.participants || [];
  const narrators = participants.filter((p) => p.role === 'NARRATOR');
  const players = participants.filter((p) => p.role === 'PLAYER');
  const spectators = participants.filter((p) => p.role === 'SPECTATOR');

  const inVoiceCount = participants.filter((p) => p.isInVoice).length;
  const afterJoinersCount = participants.filter((p) => p.isAfterJoiner).length;

  return (
    <div className="live-partie-container" style={{ animation: 'fadeIn 0.3s ease', maxWidth: '1400px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* 1. Sleek Compact Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Radio size={22} color="var(--gold)" />
            <span>Live Partie</span>
          </h1>
          <span className={`live-status-pill ${session?.voiceChannelId ? 'active' : ''}`}>
            <span className="live-pulse-dot" />
            {session?.voiceChannelId ? 'EN DIRECT' : 'EN ATTENTE'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
            onClick={() => fetchSession(true)}
            disabled={loading || actionLoading}
            title="Rafraîchir les données"
          >
            <RefreshCw size={14} className={loading ? 'spin-anim' : ''} />
            <span>Rafraîchir</span>
          </button>
        </div>
      </div>

      {/* Floating Toast / Banner Message */}
      {bannerMessage && (
        <div
          className={`live-banner-alert ${bannerMessage.type}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            background:
              bannerMessage.type === 'success'
                ? 'rgba(34, 197, 94, 0.12)'
                : bannerMessage.type === 'error'
                ? 'rgba(239, 68, 68, 0.12)'
                : 'rgba(212, 175, 55, 0.12)',
            border:
              bannerMessage.type === 'success'
                ? '1px solid rgba(34, 197, 94, 0.3)'
                : bannerMessage.type === 'error'
                ? '1px solid rgba(239, 68, 68, 0.3)'
                : '1px solid rgba(212, 175, 55, 0.3)',
            color:
              bannerMessage.type === 'success'
                ? '#4ade80'
                : bannerMessage.type === 'error'
                ? '#f87171'
                : 'var(--text-cream)'
          }}
        >
          <span>{bannerMessage.text}</span>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '0 4px', opacity: 0.7 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Unified Cockpit Bar (Single Row Control Strip) */}
      <div className="live-cockpit-bar">
        <div className="live-cockpit-left">
          {/* Voice Channel Picker */}
          <div className="live-voice-select-wrap">
            <Volume2 size={16} color="var(--gold)" />
            <select
              className="live-voice-select"
              value={session?.voiceChannelId || ''}
              onChange={(e) => handleSelectVoiceChannel(e.target.value)}
              disabled={actionLoading}
            >
              <option value="">Sélectionner un salon vocal...</option>
              {voiceChannels.map((vc) => (
                <option key={vc.id} value={vc.id}>
                  🔊 {vc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Live Counters */}
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="live-stat-pill" title="Membres connectés en vocal">
              <span className={`live-stat-dot ${inVoiceCount > 0 ? 'active' : ''}`} />
              {inVoiceCount} vocal
            </span>
            <span className="live-stat-pill gold" title="Maîtres du Jeu">
              <Crown size={12} color="var(--gold)" />
              {narrators.length} MJ
            </span>
            <span className="live-stat-pill blue" title="Joueurs avec numéros">
              <Swords size={12} color="#60a5fa" />
              {players.length} Joueurs
            </span>
            {afterJoinersCount > 0 && (
              <span className="live-stat-pill purple" title="Joueurs pré-inscrits en attente">
                <Clock size={12} color="#c084fc" />
                {afterJoinersCount} en attente
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="live-cockpit-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleAutoNumber}
            disabled={actionLoading || players.length === 0}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', padding: '0.45rem 0.75rem' }}
            title="Attribuer automatiquement 01, 02... et 0000 aux narrateurs"
          >
            <Sparkles size={14} color="var(--gold)" />
            <span>Auto 01..</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleRandomizeNumbers}
            disabled={actionLoading || players.length <= 1}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', padding: '0.45rem 0.75rem' }}
            title="Mélanger aléatoirement les numéros des joueurs"
          >
            <Shuffle size={14} />
            <span>Mélanger</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleResetRenames}
            disabled={actionLoading || participants.length === 0}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', padding: '0.45rem 0.75rem' }}
            title="Restaurer les pseudos normaux sur Discord"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowAddJoiner(!showAddJoiner)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.82rem',
              padding: '0.45rem 0.75rem',
              borderColor: showAddJoiner ? '#c084fc' : undefined,
              color: showAddJoiner ? '#c084fc' : undefined
            }}
            title="Pré-inscrire un joueur par son ID Discord s'il n'est pas encore en vocal"
          >
            <UserPlus size={14} />
            <span>+ ID</span>
          </button>

          {/* Primary Action Button */}
          <button
            type="button"
            className="btn btn-gold"
            onClick={handleApplyRenames}
            disabled={actionLoading || participants.length === 0}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              padding: '0.45rem 1rem',
              boxShadow: '0 2px 14px rgba(212, 175, 55, 0.4)'
            }}
            title="Renommer tous les joueurs sur Discord selon leurs numéros"
          >
            <Sparkles size={15} />
            <span>Renommer Discord</span>
          </button>
        </div>
      </div>

      {/* Renaming Progress Bar (if in progress) */}
      {session?.isRenamingInProgress && session.renameProgress && (
        <div style={{ marginBottom: '1.25rem', background: 'rgba(0,0,0,0.5)', borderRadius: '8px', padding: '0.6rem 1rem', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--gold)', marginBottom: '0.3rem' }}>
            <span>Renommage Discord en cours...</span>
            <span>{session.renameProgress.current} / {session.renameProgress.total}</span>
          </div>
          <div style={{ height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                background: 'var(--gold)',
                width: `${(session.renameProgress.current / Math.max(session.renameProgress.total, 1)) * 100}%`,
                transition: 'width 0.2s ease'
              }}
            />
          </div>
        </div>
      )}

      {/* 3. Inline Quick-Add Joiner Strip */}
      {showAddJoiner && (
        <form onSubmit={handleAddAfterJoiner} className="live-add-joiner-strip">
          <div className="live-add-input-wrap">
            <UserPlus size={15} color="#c084fc" />
            <input
              type="text"
              className="live-add-input"
              placeholder="Identifiant Discord (User ID, ex: 289123456789012345)"
              value={afterJoinerId}
              onChange={(e) => setAfterJoinerId(e.target.value)}
              autoFocus
            />
          </div>
          <select
            className="live-add-select"
            value={afterJoinerRole}
            onChange={(e) => setAfterJoinerRole(e.target.value as any)}
          >
            <option value="PLAYER">⚔️ Joueur</option>
            <option value="NARRATOR">🎭 Narrateur (0000)</option>
          </select>
          <button
            type="submit"
            className="btn btn-gold"
            disabled={actionLoading || !afterJoinerId.trim()}
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}
          >
            Réserver
          </button>
          <button
            type="button"
            onClick={() => setShowAddJoiner(false)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            ✕
          </button>
        </form>
      )}

      {/* 4. Main Participants Content */}
      {!session?.voiceChannelId ? (
        <div className="live-empty-state-card">
          <Volume2 size={40} color="var(--gold)" style={{ opacity: 0.8 }} />
          <h3 style={{ margin: 0, color: 'var(--text-cream)' }}>Aucun salon vocal sélectionné</h3>
          <p style={{ margin: 0, fontSize: '0.88rem', maxWidth: '400px' }}>
            Sélectionnez un salon vocal dans la barre ci-dessus pour détecter et gérer les joueurs en direct.
          </p>
        </div>
      ) : (
        <div>
          {/* NARRATOR VIP ROW (Only if narrators exist) */}
          {narrators.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                <Crown size={16} color="var(--gold)" />
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--gold)', letterSpacing: '0.04em' }}>
                  MAÎTRE DU JEU (MJ • 0000)
                </span>
              </div>
              <div className="live-participants-grid">
                {narrators.map((p) => (
                  <ParticipantCard
                    key={p.id}
                    participant={p}
                    onUpdateRole={handleUpdateParticipantRole}
                    onUpdateNumber={handleUpdateParticipantNumber}
                    onRemove={handleRemoveParticipant}
                    onCopy={copyToClipboard}
                    isCopied={copiedId === p.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ACTIVE PLAYERS SECTION */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Swords size={16} color="#60a5fa" />
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#93c5fd', letterSpacing: '0.04em' }}>
                  JOUEURS ACTIFS ({players.length})
                </span>
                {narrators.length === 0 && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                    (Passez un joueur en 🎭 MJ si besoin)
                  </span>
                )}
              </div>
            </div>

            {players.length === 0 ? (
              <div className="live-empty-state-card" style={{ padding: '1.5rem' }}>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>
                  Aucun joueur dans ce salon vocal. Demandez-leur de se connecter ou ajoutez-les avec "+ ID" !
                </p>
              </div>
            ) : (
              <div className="live-participants-grid">
                {players.map((p) => (
                  <ParticipantCard
                    key={p.id}
                    participant={p}
                    onUpdateRole={handleUpdateParticipantRole}
                    onUpdateNumber={handleUpdateParticipantNumber}
                    onRemove={handleRemoveParticipant}
                    onCopy={copyToClipboard}
                    isCopied={copiedId === p.id}
                  />
                ))}
              </div>
            )}
          </div>

          {/* SPECTATORS SECTION (Only if spectators exist) */}
          {spectators.length > 0 && (
            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                <Eye size={15} color="var(--text-muted)" />
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  SPECTATEURS ({spectators.length})
                </span>
              </div>
              <div className="live-participants-grid">
                {spectators.map((p) => (
                  <ParticipantCard
                    key={p.id}
                    participant={p}
                    onUpdateRole={handleUpdateParticipantRole}
                    onUpdateNumber={handleUpdateParticipantNumber}
                    onRemove={handleRemoveParticipant}
                    onCopy={copyToClipboard}
                    isCopied={copiedId === p.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------------
// Participant Card Component (Mobile & Desktop Responsive)
// -------------------------------------------------------------
interface ParticipantCardProps {
  participant: LiveParticipant;
  onUpdateRole: (userId: string, newRole: 'PLAYER' | 'NARRATOR' | 'SPECTATOR') => void;
  onUpdateNumber: (userId: string, newNumber: number | null) => void;
  onRemove: (userId: string) => void;
  onCopy: (text: string, id: string) => void;
  isCopied: boolean;
}

const ParticipantCard: React.FC<ParticipantCardProps> = ({
  participant: p,
  onUpdateRole,
  onUpdateNumber,
  onRemove,
  onCopy,
  isCopied
}) => {
  const isNarrator = p.role === 'NARRATOR';
  const isPlayer = p.role === 'PLAYER';

  const numberDisplay =
    isNarrator ? '0000' : p.number !== null && p.number > 0 ? String(p.number).padStart(2, '0') : '--';

  return (
    <div
      className={`live-participant-card ${isNarrator ? 'narrator' : isPlayer ? 'player' : 'spectator'}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
        padding: '0.65rem',
        borderRadius: 'var(--radius-md)',
        background: isNarrator
          ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.12) 0%, rgba(20, 16, 25, 0.85) 100%)'
          : 'rgba(20, 20, 26, 0.75)',
        border: isNarrator
          ? '1px solid rgba(212, 175, 55, 0.45)'
          : '1px solid var(--border-dark)',
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.3)',
        transition: 'all 0.2s ease',
        position: 'relative'
      }}
    >
      {/* Top row: Avatar & Names */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {/* Avatar with Voice indicators */}
        <div style={{ position: 'relative', width: '36px', height: '36px', flexShrink: 0 }}>
          {p.avatar ? (
            <img
              src={p.avatar}
              alt={p.displayName}
              style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--bg-dark)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
                color: 'var(--text-cream)',
                border: '1px solid var(--border-dark)'
              }}
            >
              {p.displayName.substring(0, 2).toUpperCase()}
            </div>
          )}
          <span
            className={`live-voice-dot ${p.isInVoice ? 'online' : 'waiting'}`}
            title={p.isInVoice ? 'En vocal' : 'En attente'}
            style={{ width: '14px', height: '14px' }}
          >
            {p.isInVoice ? (
              p.isMute ? (
                <MicOff size={8} color="#f87171" />
              ) : (
                <Mic size={8} color="#4ade80" />
              )
            ) : (
              <Clock size={8} color="#c084fc" />
            )}
          </span>
        </div>

        {/* Names */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: '0.85rem',
              color: 'var(--text-cream)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
            title={p.displayName}
          >
            {p.displayName}
          </div>
          <div
            style={{
              fontSize: '0.72rem',
              color: isNarrator ? 'var(--gold)' : isPlayer ? '#93c5fd' : 'var(--text-light-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem'
            }}
          >
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.targetNick}>
              ➔ {p.targetNick}
            </span>
            <button
              type="button"
              onClick={() => onCopy(p.targetNick, p.id)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', opacity: 0.7 }}
              title="Copier"
            >
              {isCopied ? <Check size={10} color="#4ade80" /> : <Copy size={10} />}
            </button>
            {p.renameStatus === 'SUCCESS' && <span title="Renommé"><CheckCircle2 size={10} color="#4ade80" /></span>}
            {p.renameStatus === 'SKIPPED_HIERARCHY' && <span title="Rôle supérieur"><AlertTriangle size={10} color="#fbbf24" /></span>}
            {p.renameStatus === 'ERROR' && <span title="Erreur"><AlertTriangle size={10} color="#f87171" /></span>}
          </div>
        </div>
        
        {/* Number Display & Delete (Top Right) */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'flex-end', 
          gap: '0.2rem' 
        }}>
          {isPlayer ? (
            <input
              type="number"
              min="1"
              max="99"
              value={p.number || ''}
              onChange={(e) => onUpdateNumber(p.id, e.target.value ? Number(e.target.value) : null)}
              className="live-number-badge blue"
              style={{
                width: '32px',
                height: '24px',
                padding: '0',
                fontSize: '0.85rem',
                textAlign: 'center',
                border: '1px solid rgba(96, 165, 250, 0.5)',
                borderRadius: '4px',
                color: '#93c5fd',
                background: 'rgba(96, 165, 250, 0.1)',
                margin: 0
              }}
              title="Numéro du Joueur"
            />
          ) : isNarrator ? (
            <div className="live-number-badge gold" style={{ width: '36px', height: '24px', fontSize: '0.75rem', borderRadius: '4px' }}>
              0000
            </div>
          ) : (
            <div className="live-number-badge muted" style={{ width: '32px', height: '24px', fontSize: '0.75rem', borderRadius: '4px' }}>
              --
            </div>
          )}
          <button
            type="button"
            onClick={() => onRemove(p.id)}
            className="live-delete-btn"
            style={{ padding: '2px' }}
            title="Retirer"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Bottom row: Quick Role Switcher */}
      <div style={{ display: 'flex', gap: '0.2rem', paddingTop: '0.2rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          type="button"
          className={`live-role-btn ${isNarrator ? 'active narrator' : ''}`}
          onClick={() => onUpdateRole(p.id, 'NARRATOR')}
        >
          🎭 MJ
        </button>
        <button
          type="button"
          className={`live-role-btn ${isPlayer ? 'active player' : ''}`}
          onClick={() => onUpdateRole(p.id, 'PLAYER')}
        >
          ⚔️ Joueur
        </button>
        <button
          type="button"
          className={`live-role-btn ${p.role === 'SPECTATOR' ? 'active spectator' : ''}`}
          onClick={() => onUpdateRole(p.id, 'SPECTATOR')}
        >
          👁️ Spec
        </button>
      </div>
    </div>
  );
};
