import React, { useState } from 'react';
import { Play, Send, CheckCircle2, XCircle, AlertTriangle, Sparkles, MessageSquare } from 'lucide-react';
import { api } from '../api';
import { DiscordEmbedPreview } from '../components/DiscordEmbedPreview';

interface SimulatorTabProps {
  guildId: string;
  channels: any[];
}

export const SimulatorTab: React.FC<SimulatorTabProps> = ({ guildId, channels }) => {
  const textChannels = channels.filter((c) => c.type === 0);
  const [selectedChannelId, setSelectedChannelId] = useState(textChannels[0]?.id || 'chan-101');
  const [messageText, setMessageText] = useState('Chasseur');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const handleSimulate = async (customText?: string) => {
    const textToSend = customText || messageText;
    if (!textToSend.trim()) return;

    setLoading(true);
    setResult(null);

    const channelObj = textChannels.find((c) => c.id === selectedChannelId);

    try {
      const res = await api.post('/bot/simulate-reply', {
        guildId,
        channelId: selectedChannelId,
        categoryId: channelObj?.parentId || null,
        messageContent: textToSend,
        userId: 'sim-user-1'
      });
      setResult(res.data);
    } catch (err: any) {
      setResult({
        matched: false,
        status: 'ERROR',
        reason: err.response?.data?.error || 'Simulation error'
      });
    } finally {
      setLoading(false);
    }
  };

  const presetBtnStyle = {
    fontSize: '0.72rem',
    background: 'rgba(201, 168, 76, 0.1)',
    color: 'var(--text-dark-secondary)',
    border: '1px solid var(--border-parchment)',
    padding: '3px 8px',
    borderRadius: '4px',
    cursor: 'pointer' as const,
    fontFamily: 'var(--font-body)',
    transition: 'all 0.15s ease'
  };

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <h1 style={{ marginBottom: '0.15rem' }}>
          Real-Time Auto-Reply Simulator
        </h1>
        <p style={{ color: 'var(--text-dark-secondary)', fontSize: '0.95rem' }}>
          Test how the bot reacts when a player sends a message in a Discord channel.
        </p>
      </div>

      {/* Responsive 2-column on desktop, stacked on mobile */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        {/* Left: Input Console */}
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <Sparkles size={18} color="var(--gold)" />
            <h3>Test Console</h3>
          </div>

          <div className="form-group">
            <label className="form-label">Virtual Discord Channel</label>
            <select
              className="form-control"
              value={selectedChannelId}
              onChange={(e) => setSelectedChannelId(e.target.value)}
            >
              {textChannels.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.name} {c.parentId ? `(Category: ${c.parentId})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Player's Message</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Type a role name (e.g. Chasseur, Sorcière, Voyante)"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSimulate()}
              />
              <button
                className="btn btn-primary"
                onClick={() => handleSimulate()}
                disabled={loading}
                style={{ whiteSpace: 'nowrap' }}
              >
                <Send size={14} />
                {loading ? '...' : 'Send'}
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted-dark)', marginBottom: '0.3rem', fontWeight: 600, fontFamily: 'var(--font-title)', letterSpacing: '0.03em' }}>
              Quick test examples:
            </div>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {[
                { label: 'Chasseur (Exact)', text: 'Chasseur' },
                { label: 'chasseur (Lowercase)', text: 'chasseur' },
                { label: 'sorcière (Accented)', text: 'sorcière' },
                { label: 'sorciere (No accent)', text: 'sorciere' },
                { label: 'hunter (Alias)', text: 'hunter' },
                { label: 'Full sentence (Ignored)', text: 'Je suis le chasseur et je tire' },
                { label: 'Random message', text: 'salut tout le monde' }
              ].map((btn) => (
                <button
                  key={btn.label}
                  type="button"
                  onClick={() => {
                    setMessageText(btn.text);
                    handleSimulate(btn.text);
                  }}
                  style={presetBtnStyle}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Result Banner */}
          {result && (
            <div
              style={{
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem',
                border: '2px solid',
                borderColor:
                  result.status === 'TRIGGERED'
                    ? 'rgba(16, 185, 129, 0.4)'
                    : result.status === 'FILTERED_OUT'
                    ? 'rgba(184, 134, 11, 0.4)'
                    : 'var(--border-dark)',
                background:
                  result.status === 'TRIGGERED'
                    ? 'rgba(16, 185, 129, 0.08)'
                    : result.status === 'FILTERED_OUT'
                    ? 'rgba(184, 134, 11, 0.08)'
                    : 'var(--bg-dark)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                {result.status === 'TRIGGERED' ? (
                  <CheckCircle2 size={16} color="#059669" />
                ) : result.status === 'FILTERED_OUT' ? (
                  <AlertTriangle size={16} color="#b8860b" />
                ) : (
                  <XCircle size={16} color="var(--text-muted-dark)" />
                )}
                <span style={{ fontWeight: 700, fontSize: '0.85rem', fontFamily: 'var(--font-title)' }}>
                  {result.status === 'TRIGGERED'
                    ? 'TRIGGERED SUCCESSFULLY'
                    : result.status === 'FILTERED_OUT'
                    ? 'CHANNEL NOT ALLOWED'
                    : 'IGNORED (NORMAL CONVERSATION)'}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dark-secondary)', lineHeight: '1.4' }}>
                {result.reason}
              </p>
              {result.delivery && (
                <div style={{ fontSize: '0.72rem', marginTop: '0.35rem', color: 'var(--gold)', fontWeight: 600 }}>
                  ⚙️ Delivery: <strong>{result.delivery}</strong> | Mode: <strong>{result.mode}</strong>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Live Discord Render */}
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <MessageSquare size={18} color="var(--gold)" />
            <h3>Discord Visual Render</h3>
          </div>

          {result?.matched && result.matchedCard ? (
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dark-secondary)', marginBottom: '0.5rem' }}>
                Here is the response the bot sends to players:
              </p>
              <DiscordEmbedPreview
                card={result.matchedCard}
                deliveryMethod={result.delivery}
                replyMode={result.mode}
              />
            </div>
          ) : (
            <div
              style={{
                height: '200px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                textAlign: 'center',
                border: '2px dashed var(--border-dark)',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <MessageSquare size={32} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
              <div style={{ fontSize: '0.85rem' }}>No simulated response yet.</div>
              <div style={{ fontSize: '0.72rem' }}>Type "Chasseur" on the left to trigger the bot.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
