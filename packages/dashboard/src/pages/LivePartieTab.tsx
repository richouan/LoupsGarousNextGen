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
    <div className="live-partie-container" style={{ animation: 'fadeIn 0.3s ease', paddingBottom: '7rem' }}>
      {/* 1. Header Banner */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <Radio size={24} color="var(--gold)" className="live-pulse-icon" />
            <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Live Partie & Gestion des Joueurs</h1>
          </div>
          <p style={{ color: 'var(--text-light-muted)', fontSize: '0.92rem', margin: 0 }}>
            Détection vocale en direct sur <strong>{selectedGuild.name}</strong>, attribution des numéros (<code>01</code>, <code>0000</code>) et renommage automatique en 1 clic.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
          onClick={() => fetchSession(true)}
          disabled={loading || actionLoading}
          title="Rafraîchir les données de la partie"
        >
          <RefreshCw size={15} className={loading ? 'spin-anim' : ''} />
          <span>Rafraîchir</span>
        </button>
      </div>

      {/* Banner Feedback Messages */}
      {bannerMessage && (
        <div
          className={`live-banner-alert ${bannerMessage.type}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
            background:
              bannerMessage.type === 'success'
                ? 'rgba(34, 197, 94, 0.15)'
                : bannerMessage.type === 'error'
                ? 'rgba(239, 68, 68, 0.15)'
                : 'rgba(212, 175, 55, 0.15)',
            border:
              bannerMessage.type === 'success'
                ? '1px solid rgba(34, 197, 94, 0.4)'
                : bannerMessage.type === 'error'
                ? '1px solid rgba(239, 68, 68, 0.4)'
                : '1px solid rgba(212, 175, 55, 0.4)',
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
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.7 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Top Control Panel: Voice Channel Selector & Game Actions */}
      <div
        className="glass-panel"
        style={{
          marginBottom: '1.75rem',
          border: '1px solid rgba(212, 175, 55, 0.35)',
          background: 'radial-gradient(ellipse at top, rgba(212, 175, 55, 0.08) 0%, rgba(20, 16, 14, 0.85) 60%)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          padding: '1.25rem 1.5rem'
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', alignItems: 'center' }}>
          
          {/* Voice Channel Selection */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-cream)', marginBottom: '0.5rem' }}>
              <Volume2 size={16} color="var(--gold)" />
              Salon Vocal de la Partie :
            </label>
            <select
              className="form-control"
              style={{ background: 'var(--bg-dark-surface)', fontSize: '0.9rem' }}
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

          {/* Quick Metrics */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="live-stat-pill">
              <span className="live-stat-dot active" />
              <span>{inVoiceCount} en vocal</span>
            </div>
            <div className="live-stat-pill gold">
              <Crown size={14} color="var(--gold)" />
              <span>{narrators.length} MJ</span>
            </div>
            <div className="live-stat-pill blue">
              <Swords size={14} color="#60a5fa" />
              <span>{players.length} Joueurs</span>
            </div>
            {afterJoinersCount > 0 && (
              <div className="live-stat-pill purple">
                <Clock size={14} color="#c084fc" />
                <span>{afterJoinersCount} En attente</span>
              </div>
            )}
          </div>

          {/* Action Buttons Toolbar */}
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleAutoNumber}
              disabled={actionLoading || players.length === 0}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.55rem 0.9rem' }}
              title="Attribue les numéros 01, 02... et 0000 aux narrateurs"
            >
              <Sparkles size={15} color="var(--gold)" />
              <span>Auto-Numéroter</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleRandomizeNumbers}
              disabled={actionLoading || players.length <= 1}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.55rem 0.9rem' }}
              title="Mélanger l'ordre aléatoirement"
            >
              <Shuffle size={15} />
              <span>Mélanger</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleResetRenames}
              disabled={actionLoading || participants.length === 0}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.55rem 0.9rem' }}
              title="Restaurer les pseudos normaux sans numéros"
            >
              <RotateCcw size={15} />
              <span>Restaurer Noms</span>
            </button>
          </div>

        </div>

        {/* Progress Bar when renaming */}
        {session?.isRenamingInProgress && session.renameProgress && (
          <div style={{ marginTop: '1rem', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', padding: '0.75rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--gold)', marginBottom: '0.4rem' }}>
              <span>Renommage Discord en cours...</span>
              <span>{session.renameProgress.current} / {session.renameProgress.total}</span>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
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
      </div>

      {/* 3. After-Joiners Form: Pre-add players by ID */}
      <div
        className="glass-panel"
        style={{
          marginBottom: '1.75rem',
          padding: '1rem 1.25rem',
          background: 'rgba(15, 12, 20, 0.65)',
          border: '1px dashed rgba(192, 132, 252, 0.4)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <UserPlus size={18} color="#c084fc" />
          <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-cream)' }}>
            Pré-inscrire un joueur en retard (After-Joiner)
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#c084fc', background: 'rgba(192, 132, 252, 0.15)', padding: '2px 8px', borderRadius: '10px' }}>
            Optionnel
          </span>
        </div>
        <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.83rem', color: 'var(--text-light-muted)' }}>
          Entrez l'identifiant Discord (User ID) d'un joueur qui va bientôt rejoindre le salon vocal. Le bot lui réservera sa place et son numéro automatiquement dès son arrivée.
        </p>

        <form onSubmit={handleAddAfterJoiner} style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Identifiant Discord (ex: 289123456789012345)"
            value={afterJoinerId}
            onChange={(e) => setAfterJoinerId(e.target.value)}
            style={{ flex: '1 1 240px', fontSize: '0.85rem' }}
          />

          <select
            className="form-control"
            style={{ width: '140px', fontSize: '0.85rem' }}
            value={afterJoinerRole}
            onChange={(e) => setAfterJoinerRole(e.target.value as any)}
          >
            <option value="PLAYER">⚔️ Joueur</option>
            <option value="NARRATOR">🎭 Narrateur</option>
          </select>

          <button
            type="submit"
            className="btn btn-gold"
            disabled={actionLoading || !afterJoinerId.trim()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.55rem 1.1rem' }}
          >
            <UserPlus size={15} />
            <span>Réserver sa place</span>
          </button>
        </form>
      </div>

      {/* 4. Categorized Participant Lists */}

      {/* A. NARRATEURS (0000) */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
          <Crown size={18} color="var(--gold)" />
          <h2 className="fantasy-font" style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-cream)' }}>
            Narrateur(s) du Jeu (MJ)
          </h2>
          <span style={{ fontSize: '0.75rem', background: 'rgba(212, 175, 55, 0.2)', color: 'var(--gold)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
            Préfixe : 0000
          </span>
        </div>

        {narrators.length === 0 ? (
          <div className="live-empty-state">
            Aucun narrateur désigné. Vous pouvez promouvoir un joueur en MJ ci-dessous.
          </div>
        ) : (
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
        )}
      </div>

      {/* B. JOUEURS (01, 02, 03...) */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
          <Swords size={18} color="#60a5fa" />
          <h2 className="fantasy-font" style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-cream)' }}>
            Joueurs Actifs ({players.length})
          </h2>
          <span style={{ fontSize: '0.75rem', background: 'rgba(96, 165, 250, 0.2)', color: '#93c5fd', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
            Numéros : 01, 02, 03...
          </span>
        </div>

        {players.length === 0 ? (
          <div className="live-empty-state">
            {session?.voiceChannelId
              ? "Aucun joueur connecté dans ce salon vocal. Demandez aux joueurs de rejoindre le salon ou pré-inscrivez-les avec l'ID ci-dessus !"
              : "Veuillez sélectionner un salon vocal en haut pour détecter les joueurs."}
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

      {/* C. SPECTATEURS */}
      {spectators.length > 0 && (
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
            <Eye size={18} color="var(--text-muted)" />
            <h2 className="fantasy-font" style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-muted)' }}>
              Spectateurs ({spectators.length})
            </h2>
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

      {/* 5. Sticky Bottom Action Bar for Mobile & Desktop */}
      <div className="live-sticky-action-bar">
        <div className="live-sticky-content">
          <div className="live-sticky-info">
            <span style={{ fontWeight: 600, color: 'var(--text-cream)' }}>
              Partie prête :
            </span>
            <span style={{ color: 'var(--gold)', fontWeight: 700 }}>
              {players.length} Joueur{players.length > 1 ? 's' : ''}
            </span>
            <span style={{ color: 'var(--text-light-muted)' }}>•</span>
            <span style={{ color: '#c084fc' }}>
              {narrators.length} MJ
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-gold"
              onClick={handleApplyRenames}
              disabled={actionLoading || participants.length === 0}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.6rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                boxShadow: '0 4px 20px rgba(212, 175, 55, 0.4)'
              }}
            >
              <Sparkles size={18} />
              <span>🪄 Renommer sur Discord</span>
            </button>
          </div>
        </div>
      </div>
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
        gap: '0.75rem',
        padding: '1rem',
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
      {/* Top row: Number Badge + Avatar + Names + Voice status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Large Number Badge */}
        <div
          className={`live-number-badge ${isNarrator ? 'gold' : isPlayer ? 'blue' : 'muted'}`}
          title={isNarrator ? 'Préfixe Narrateur' : 'Numéro du Joueur'}
        >
          {numberDisplay}
        </div>

        {/* Avatar with Voice indicators */}
        <div style={{ position: 'relative', width: '42px', height: '42px' }}>
          {p.avatar ? (
            <img
              src={p.avatar}
              alt={p.displayName}
              style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'var(--bg-dark)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                color: 'var(--text-cream)',
                border: '1px solid var(--border-dark)'
              }}
            >
              {p.displayName.substring(0, 2).toUpperCase()}
            </div>
          )}

          {/* Voice status micro-badge */}
          <span
            className={`live-voice-dot ${p.isInVoice ? 'online' : 'waiting'}`}
            title={p.isInVoice ? 'Connecté en vocal' : 'En attente de connexion'}
          >
            {p.isInVoice ? (
              p.isMute ? (
                <MicOff size={10} color="#f87171" />
              ) : (
                <Mic size={10} color="#4ade80" />
              )
            ) : (
              <Clock size={10} color="#c084fc" />
            )}
          </span>
        </div>

        {/* Names */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: '0.92rem',
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
              fontSize: '0.78rem',
              color: isNarrator ? 'var(--gold)' : isPlayer ? '#93c5fd' : 'var(--text-light-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <span>➔ {p.targetNick}</span>
            <button
              type="button"
              onClick={() => onCopy(p.targetNick, p.id)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', opacity: 0.7 }}
              title="Copier le pseudo"
            >
              {isCopied ? <Check size={12} color="#4ade80" /> : <Copy size={12} />}
            </button>
          </div>
        </div>

        {/* Delete / Kick button */}
        <button
          type="button"
          onClick={() => onRemove(p.id)}
          className="live-delete-btn"
          title="Retirer de la partie"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Middle row: Status badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem', fontSize: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {p.renameStatus === 'SUCCESS' && (
            <span style={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <CheckCircle2 size={13} /> Renommé sur Discord
            </span>
          )}
          {p.renameStatus === 'SKIPPED_HIERARCHY' && (
            <span
              style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              title="Le bot ne peut pas renommer ce membre car son rôle Discord est supérieur ou il est propriétaire du serveur."
            >
              <AlertTriangle size={13} /> Rôle supérieur (manuel)
            </span>
          )}
          {p.renameStatus === 'IDLE' && (
            <span style={{ color: 'var(--text-light-muted)' }}>
              {p.isInVoice ? 'Prêt à renommer' : '⏳ En attente de connexion'}
            </span>
          )}
          {p.renameStatus === 'ERROR' && (
            <span style={{ color: '#f87171' }}>
              Erreur: {p.renameError || 'Échec du renommage'}
            </span>
          )}
        </div>

        {/* Number input for Players */}
        {isPlayer && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>N° :</span>
            <input
              type="number"
              min="1"
              max="99"
              value={p.number || ''}
              onChange={(e) => onUpdateNumber(p.id, e.target.value ? Number(e.target.value) : null)}
              style={{
                width: '46px',
                padding: '2px 4px',
                fontSize: '0.78rem',
                textAlign: 'center',
                background: 'var(--bg-dark)',
                border: '1px solid var(--border-dark)',
                borderRadius: '4px',
                color: 'var(--text-cream)'
              }}
            />
          </div>
        )}
      </div>

      {/* Bottom row: Quick Role Switcher */}
      <div style={{ display: 'flex', gap: '0.35rem', paddingTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
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
