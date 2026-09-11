import React from 'react';
import { Eye } from 'lucide-react';
import { getOptimizedImageUrl } from '../utils/imageUtils';

interface DiscordEmbedPreviewProps {
  card: {
    name: string;
    camp: string;
    description: string;
    shortDescription?: string | null;
    imageUrl?: string | null;
  };
  deliveryMethod?: 'PUBLIC' | 'EPHEMERAL_REVEAL' | 'DM';
  replyMode?: 'TEXT_ONLY' | 'PHOTO_ONLY' | 'BOTH';
}

export const DiscordEmbedPreview: React.FC<DiscordEmbedPreviewProps> = ({
  card,
  deliveryMethod = 'PUBLIC',
  replyMode = 'BOTH'
}) => {
  const [revealed, setRevealed] = React.useState(deliveryMethod !== 'EPHEMERAL_REVEAL');

  const campColors: Record<string, string> = {
    VILLAGEOIS: '#3b82f6',
    LOUPS: '#ef4444',
    SOLITAIRE: '#a855f7',
    NEUTRE: '#f59e0b'
  };

  const campLabels: Record<string, string> = {
    VILLAGEOIS: '🛡️ Camp du Village (Innocents)',
    LOUPS: '🐺 Meute des Loups-Garous',
    SOLITAIRE: '🔮 Joueur Solitaire',
    NEUTRE: '⚖️ Neutre / Alterne'
  };

  const embedColor = campColors[card.camp] || '#6366f1';

  return (
    <div className="discord-preview" style={{ borderLeftColor: embedColor }}>
      {/* Bot Header */}
      <div className="discord-user-header">
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: '#5865f2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.9rem'
          }}
        >
          🐺
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontWeight: 600, color: '#f2f3f5', fontSize: '0.9rem' }}>
            Loup-Garou Master
          </span>
          <span className="discord-bot-tag">BOT</span>
          <span style={{ fontSize: '0.7rem', color: '#949ba4' }}>Aujourd'hui à 20:00</span>
        </div>
      </div>

      {deliveryMethod === 'EPHEMERAL_REVEAL' && !revealed ? (
        <div style={{ marginTop: '0.5rem' }}>
          <div style={{ fontSize: '0.88rem', color: '#dbdee1', marginBottom: '0.6rem' }}>
            🔒 Demande de carte pour **{card.name}**. Clique ci-dessous pour l'afficher en secret :
          </div>
          <button
            className="btn btn-secondary"
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: '0.82rem',
              background: '#4e5058',
              color: 'white',
              border: 'none',
              borderRadius: '4px'
            }}
            onClick={() => setRevealed(true)}
          >
            <Eye size={14} />
            👁️ Révéler "{card.name}" en secret
          </button>
        </div>
      ) : (
        <div style={{ marginTop: '0.4rem' }}>
          {deliveryMethod === 'EPHEMERAL_REVEAL' && (
            <div
              style={{
                fontSize: '0.72rem',
                color: '#949ba4',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
            >
              <Eye size={12} /> Uniquement visible par toi
            </div>
          )}

          {replyMode === 'TEXT_ONLY' ? (
            <div style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
              <strong>📜 {card.name} ({card.camp})</strong>
              <div style={{ marginTop: '0.4rem', color: '#dbdee1' }}>{card.description}</div>
            </div>
          ) : replyMode === 'PHOTO_ONLY' ? (
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                🃏 {card.name}
              </div>
              {card.imageUrl && (
                <img
                  src={getOptimizedImageUrl(card.imageUrl, 'medium')}
                  alt={card.name}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '260px',
                    borderRadius: '8px',
                    objectFit: 'cover'
                  }}
                />
              )}
            </div>
          ) : (
            // BOTH / Full Rich Embed
            <div
              style={{
                background: '#2b2d31',
                borderRadius: '6px',
                borderLeft: `4px solid ${embedColor}`,
                padding: '0.75rem 1rem'
              }}
            >
              <div
                style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#fff',
                  marginBottom: '0.4rem'
                }}
              >
                🃏 Carte : {card.name}
              </div>

              <div style={{ fontSize: '0.85rem', color: '#b5bac1', marginBottom: '0.6rem' }}>
                <strong style={{ color: '#fff' }}>Allégeance : </strong>
                {campLabels[card.camp] || card.camp}
              </div>

              <div
                style={{
                  fontSize: '0.85rem',
                  lineHeight: '1.4',
                  color: '#dbdee1',
                  marginBottom: '0.75rem'
                }}
              >
                <div style={{ fontWeight: 600, color: '#fff', marginBottom: '0.2rem' }}>
                  📜 Description & Pouvoir :
                </div>
                {card.description}
              </div>

              {card.imageUrl && (
                <div style={{ marginTop: '0.75rem' }}>
                  <img
                    src={getOptimizedImageUrl(card.imageUrl, 'medium')}
                    alt={card.name}
                    style={{
                      width: '100%',
                      maxHeight: '240px',
                      borderRadius: '6px',
                      objectFit: 'cover'
                    }}
                  />
                </div>
              )}

              <div
                style={{
                  fontSize: '0.7rem',
                  color: '#949ba4',
                  marginTop: '0.75rem',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  paddingTop: '0.4rem'
                }}
              >
                🌙 Loup-Garou 2026 • Tape le nom d’une carte pour l’afficher
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
