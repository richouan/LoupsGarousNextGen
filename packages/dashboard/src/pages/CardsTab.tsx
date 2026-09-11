import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Edit3,
  Eye,
  LayoutGrid,
  Grid3X3,
  List,
  ArrowUpDown,
  Shield,
  PawPrint
} from 'lucide-react';
import { CardEditor } from '../components/CardEditor';
import { DiscordEmbedPreview } from '../components/DiscordEmbedPreview';
import { LazyCardImage } from '../components/LazyCardImage';
import { getOptimizedImageUrl } from '../utils/imageUtils';

interface CardsTabProps {
  cards: any[];
  onSaveCard: (cardData: any) => Promise<void>;
  onDeleteCard: (cardId: string) => Promise<void>;
  selectedGuildName: string;
  isSuperAdmin?: boolean;
}

const campLabels: Record<string, string> = {
  VILLAGEOIS: 'Villageois',
  LOUPS: 'Loup Garou',
  SOLITAIRE: 'Solo'
};

const campEmoji: Record<string, string> = {
  VILLAGEOIS: '🛡️',
  LOUPS: '🐺',
  SOLITAIRE: '🔮'
};

export const CardsTab: React.FC<CardsTabProps> = ({
  cards,
  onSaveCard,
  onDeleteCard,
  selectedGuildName,
  isSuperAdmin = false
}) => {
  const [search, setSearch] = useState('');
  const [campFilter, setCampFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'compact' | 'medium'>('compact');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'newest' | 'oldest' | 'random'>('name_asc');
  const [viewState, setViewState] = useState<'grid' | 'editor'>('grid');
  const [editingCard, setEditingCard] = useState<any | null>(null);
  const [previewCard, setPreviewCard] = useState<any | null>(null);

  const counts = useMemo(() => ({
    ALL: cards.length,
    VILLAGEOIS: cards.filter((c) => c.camp === 'VILLAGEOIS').length,
    LOUPS: cards.filter((c) => c.camp === 'LOUPS').length,
    SOLITAIRE: cards.filter((c) => c.camp === 'SOLITAIRE').length
  }), [cards]);

  const filteredCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = cards.filter((c) => {
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.shortDescription && c.shortDescription.toLowerCase().includes(q));
      const matchesCamp = campFilter === 'ALL' || c.camp === campFilter;
      return matchesSearch && matchesCamp;
    });

    result.sort((a: any, b: any) => {
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'random') return Math.random() - 0.5;
      return 0;
    });

    return result;
  }, [cards, search, campFilter, sortBy]);

  // Progressive row reveal (3-4 rows initial, more revealed as user scrolls)
  const initialBatch = viewMode === 'compact' ? 18 : 10;
  const [visibleCount, setVisibleCount] = useState(initialBatch);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset count whenever filters or viewMode change
  useEffect(() => {
    setVisibleCount(viewMode === 'compact' ? 18 : 10);
  }, [search, campFilter, sortBy, viewMode]);

  // Observer to reveal more roles when scrolling near the bottom
  useEffect(() => {
    if (visibleCount >= filteredCards.length) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          const step = viewMode === 'compact' ? 12 : 6;
          setVisibleCount((prev) => Math.min(prev + step, filteredCards.length));
        }
      },
      {
        rootMargin: '300px 0px',
        threshold: 0.05
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [visibleCount, filteredCards.length, viewMode]);

  const visibleCards = useMemo(() => {
    return filteredCards.slice(0, visibleCount);
  }, [filteredCards, visibleCount]);

  const campBadgeClass: Record<string, string> = {
    VILLAGEOIS: 'badge-village',
    LOUPS: 'badge-loups',
    SOLITAIRE: 'badge-solitaire'
  };

  const handleCardClick = (card: any) => {
    if (!isSuperAdmin) return;
    setEditingCard(card);
    setViewState('editor');
  };

  const handleCreateNew = () => {
    setEditingCard(null);
    setViewState('editor');
  };

  if (viewState === 'editor') {
    return (
      <CardEditor
        initialCard={editingCard}
        onSave={async (card) => {
          const savedCard = await onSaveCard(card);
          setEditingCard(savedCard);
        }}
        onDelete={async (id) => {
          await onDeleteCard(id);
          setEditingCard(null);
          setViewState('grid');
        }}
        onClose={() => {
          setEditingCard(null);
          setViewState('grid');
        }}
      />
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1rem'
        }}
      >
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>
            All Roles
          </h1>
          <p style={{ color: 'var(--text-dark-secondary)', fontSize: '0.95rem' }}>
            Discover each role, its power, strategy, and secrets.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* View Toggle */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-dark-surface)',
              padding: '2px',
              borderRadius: '6px',
              border: '1px solid var(--border-dark)',
              gap: '2px',
              height: '38px'
            }}
          >
            <button
              title="Compact Cards"
              onClick={() => setViewMode('compact')}
              style={{
                background: viewMode === 'compact' ? 'var(--bg-dark)' : 'transparent',
                color: viewMode === 'compact' ? 'var(--gold)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '5px',
                padding: '0.35rem 0.6rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.82rem',
                fontFamily: 'var(--font-title)',
                fontWeight: 700
              }}
            >
              <Grid3X3 size={14} />
              Cards
            </button>
            <button
              title="Medium Cards"
              onClick={() => setViewMode('medium')}
              style={{
                background: viewMode === 'medium' ? 'var(--bg-dark)' : 'transparent',
                color: viewMode === 'medium' ? 'var(--gold)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '5px',
                padding: '0.35rem 0.6rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.82rem',
                fontFamily: 'var(--font-title)',
                fontWeight: 700
              }}
            >
              <LayoutGrid size={14} />
              Details
            </button>
          </div>

          {isSuperAdmin && (
            <button
              className="btn btn-gold"
              style={{ fontSize: '0.82rem', padding: '0 0.85rem', height: '38px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={handleCreateNew}
            >
              <Plus size={15} />
              Create Role
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '0.75rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.65rem',
          alignItems: 'center',
          marginBottom: '0.75rem'
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 100%' }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted-dark)'
            }}
          />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '2rem', height: '38px', fontSize: '0.85rem' }}
            placeholder="Search a role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Camp Filter */}
        <div style={{ flex: '1 1 auto', minWidth: '250px' }}>
          <div className="segmented-control" style={{ width: '100%', display: 'flex' }}>
            {[
              { id: 'ALL', label: 'All', count: counts.ALL },
              { id: 'VILLAGEOIS', label: <><Shield size={14} style={{ verticalAlign: 'middle', marginRight: '4px', marginBottom: '2px' }}/> Villageois</>, count: counts.VILLAGEOIS },
              { id: 'LOUPS', label: <><PawPrint size={14} style={{ verticalAlign: 'middle', marginRight: '4px', marginBottom: '2px' }}/> Loup Garou</>, count: counts.LOUPS },
              { id: 'SOLITAIRE', label: <><Eye size={14} style={{ verticalAlign: 'middle', marginRight: '4px', marginBottom: '2px' }}/> Solo</>, count: counts.SOLITAIRE }
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                className={campFilter === item.id ? (item.id === 'ALL' ? 'active' : item.id === 'VILLAGEOIS' ? 'active-village' : item.id === 'LOUPS' ? 'active-loups' : 'active-solo') : ''}
                onClick={() => setCampFilter(item.id)}
                style={{ flex: 1, padding: '0.45rem 0', fontSize: '0.75rem' }}
              >
                <span>{item.label} <span style={{ opacity: 0.7, fontSize: '0.65rem' }}>({item.count})</span></span>
              </button>
            ))}
          </div>
        </div>

        {/* Sort */}
        <div style={{ position: 'relative', flex: '0 0 160px' }}>
          <ArrowUpDown size={13} style={{ color: 'var(--text-muted-dark)', position: 'absolute', left: '10px', top: '10px' }} />
          <select
            className="form-control"
            style={{ width: '100%', padding: '0.25rem 0.5rem 0.25rem 2rem', height: '38px', fontSize: '0.78rem' }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="name_asc">Name A-Z</option>
            <option value="name_desc">Name Z-A</option>
            <option value="newest">Newest to Oldest</option>
            <option value="oldest">Oldest to Newest</option>
            <option value="random">Random</option>
          </select>
        </div>
      </div>

      {/* No results */}
      {filteredCards.length === 0 && (
        <div
          className="glass-panel"
          style={{ textAlign: 'center', padding: '2.5rem 1rem', marginTop: '1rem' }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
          <h3 style={{ marginBottom: '0.3rem' }}>No role found</h3>
          <p style={{ color: 'var(--text-dark-secondary)', fontSize: '0.95rem' }}>
            No cards matched "{search}". Try another keyword.
          </p>
        </div>
      )}

      {/* COMPACT GRID — Small medieval card tiles */}
      {viewMode === 'compact' && (
        <div className="cards-grid-compact">
          {visibleCards.map((card, index) => (
            <div
              key={card.id}
              className="role-card-compact"
              onClick={() => handleCardClick(card)}
            >
              {/* Artwork */}
              <div className="card-art">
                {card.imageUrl ? (
                  <LazyCardImage
                    src={getOptimizedImageUrl(card.imageUrl, 'thumb')}
                    alt={card.name}
                    priority={index < 12} // First 2-3 rows load immediately, others as you scroll
                  />
                ) : (
                  <div className="card-art-placeholder">
                    {campEmoji[card.camp] || '🐺'}
                  </div>
                )}
                <div className="card-art-overlay" />

                {/* Removed camp strip badge */}

                {card.isCustom && (
                  <span className="card-custom-badge">CUSTOM</span>
                )}

                {/* Hover stats */}
                <div className="card-hover-stats">
                  <span style={{ color: 'var(--gold)' }}>
                    {'★'.repeat(card.difficulty || 1)}
                  </span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>|</span>
                  <span style={{ color: 'var(--text-cream)' }}>
                    {card.abilityType === 'NIGHT' ? '🌙 Night' : card.abilityType === 'DAY' ? '☀️ Day' : '❌ None'}
                  </span>
                </div>

                {/* Hover overlay removed for zero distractions */}
              </div>

              {/* Footer */}
              <div className="card-footer">
                <div className="card-role-name" title={card.name}>{card.name}</div>
                <div className={`card-camp-label camp-${(card.camp || '').toLowerCase()}`}>
                  {campLabels[card.camp] || card.camp}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MEDIUM GRID */}
      {viewMode === 'medium' && (
        <div className="cards-grid-medium">
          {visibleCards.map((card, index) => (
            <div
              key={card.id}
              className="role-card-medium"
              onClick={() => handleCardClick(card)}
            >
              <div className="card-banner-med" style={{ position: 'relative' }}>
                {card.imageUrl ? (
                  <LazyCardImage
                    src={getOptimizedImageUrl(card.imageUrl, 'medium')}
                    alt={card.name}
                    priority={index < 6} // First 2-3 rows load immediately, others as you scroll
                  />
                ) : (
                  <div
                    style={{
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, #1a1425 0%, #2d1f4a 100%)',
                      fontSize: '1.6rem'
                    }}
                  >
                    {campEmoji[card.camp] || '🐺'}
                  </div>
                )}
                {/* Removed camp badge on top right */}
                {card.isCustom && (
                  <div style={{ position: 'absolute', top: '6px', left: '6px' }}>
                    <span style={{
                      fontSize: '0.55rem', fontWeight: 700, background: 'var(--gold)',
                      color: 'var(--bg-dark)', padding: '1px 5px', borderRadius: '3px',
                      fontFamily: 'var(--font-mono)'
                    }}>CUSTOM</span>
                  </div>
                )}
              </div>

              <div className="card-content-med">
                <div className="card-title-med">
                  <span>{card.name}</span>
                </div>

                <div className="card-desc-med">
                  {card.shortDescription || card.description}
                </div>

                {/* Badges */}
                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  <span className="trigger-tag" style={{ color: 'var(--gold)' }}>
                    {'★'.repeat(card.difficulty || 1)}
                  </span>
                  <span className="trigger-tag" style={{ background: 'var(--bg-dark)' }}>
                    {card.isUnique ? '👑 Unique' : '🔄 Repeat'}
                  </span>
                  <span className="trigger-tag" style={{ background: 'var(--bg-dark)' }}>
                    {card.abilityType === 'NIGHT' ? '🌙 Night' : card.abilityType === 'DAY' ? '☀️ Day' : '❌ None'}
                  </span>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sentinel for progressive scroll loading */}
      {visibleCount < filteredCards.length && (
        <div ref={sentinelRef} className="cards-scroll-sentinel">
          <svg className="lazy-circular-spinner" viewBox="0 0 50 50" style={{ width: '26px', height: '26px' }}>
            <circle className="lazy-spinner-track" cx="25" cy="25" r="18" fill="none" strokeWidth="3.5" />
            <circle className="lazy-spinner-path" cx="25" cy="25" r="18" fill="none" strokeWidth="3.5" />
          </svg>
          <span>Défilez pour afficher plus de rôles...</span>
        </div>
      )}

      {/* Discord Embed Preview Modal */}
      {previewCard && (
        <div className="modal-overlay" onClick={() => setPreviewCard(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 className="fantasy-font" style={{ fontSize: '1.1rem', color: 'var(--gold)' }}>
                Discord Embed Preview
              </h3>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.3rem', borderRadius: '50%', background: 'var(--bg-dark-surface)', color: 'var(--text-cream)', border: '1px solid var(--border-gold-dim)' }}
                onClick={() => setPreviewCard(null)}
              >
                ×
              </button>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-light-muted)', marginBottom: '0.75rem', fontStyle: 'italic' }}>
              This is what players see when typing <strong style={{ color: 'var(--gold)' }}>"{previewCard.name}"</strong> in Discord:
            </p>
            <DiscordEmbedPreview card={previewCard} />
            <div style={{ textAlign: 'right', marginTop: '1rem' }}>
              <button className="btn btn-primary" onClick={() => setPreviewCard(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor is conditionally rendered at the top, so we don't need it here anymore */}
    </div>
  );
};
