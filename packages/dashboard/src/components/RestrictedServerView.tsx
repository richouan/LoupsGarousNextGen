import React from 'react';

interface AllowedGuild {
  id: string;
  name: string;
  icon: string | null;
}

interface RestrictedServerViewProps {
  selectedGuild: {
    id: string;
    name: string;
    icon?: string | null;
  };
  allowedGuilds: AllowedGuild[];
  contactUser: string;
  userGuilds?: any[];
  onSelectGuild?: (guild: any) => void;
}

export const RestrictedServerView: React.FC<RestrictedServerViewProps> = ({
  selectedGuild,
  allowedGuilds,
  contactUser = 'ezreal',
  userGuilds = [],
  onSelectGuild
}) => {
  // Find if user has any server that IS allowed
  const userAllowedGuilds = (userGuilds || []).filter((ug) =>
    allowedGuilds.some((ag) => ag.id === ug.id)
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        maxWidth: '820px',
        margin: '0 auto',
        animation: 'fadeIn 0.3s ease'
      }}
    >
      {/* Top Lock Badge */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.6rem',
          background: 'rgba(234, 179, 8, 0.12)',
          border: '1px solid rgba(234, 179, 8, 0.35)',
          padding: '0.45rem 1.1rem',
          borderRadius: '9999px',
          color: '#facc15',
          fontSize: '0.84rem',
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          marginBottom: '1.25rem',
          boxShadow: '0 0 20px rgba(234, 179, 8, 0.15)'
        }}
      >
        <span style={{ fontSize: '1rem' }}>🔒</span>
        <span>Bêta Privée • Accès Restreint</span>
      </div>

      {/* Main Title & Description */}
      <h1
        style={{
          fontFamily: 'var(--font-title)',
          fontSize: '2rem',
          fontWeight: 700,
          color: 'var(--text-gold)',
          textAlign: 'center',
          marginBottom: '0.75rem',
          letterSpacing: '0.02em',
          textShadow: '0 2px 10px rgba(0,0,0,0.5)'
        }}
      >
        Ce bot est en cours de développement
      </h1>

      <p
        style={{
          color: 'var(--text-light-muted)',
          textAlign: 'center',
          fontSize: '1rem',
          maxWidth: '640px',
          lineHeight: '1.6',
          marginBottom: '2.5rem'
        }}
      >
        L'utilisation du bot et l'accès au tableau de bord pour le serveur{' '}
        <strong style={{ color: '#fff' }}>"{selectedGuild.name}"</strong> sont temporairement
        bloqués. Le bot est actuellement en phase de test fermée et fonctionne exclusivement sur les
        serveurs officiels suivants :
      </p>

      {/* Allowed Servers Showcase Grid */}
      <div
        style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns:
            allowedGuilds.length > 1 ? 'repeat(auto-fit, minmax(260px, 1fr))' : '1fr',
          gap: '1.25rem',
          marginBottom: '2.5rem'
        }}
      >
        {allowedGuilds.map((guild, idx) => (
          <div
            key={guild.id}
            style={{
              background: 'rgba(17, 24, 39, 0.75)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(201, 168, 76, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
              transition: 'transform 0.2s ease, border-color 0.2s ease'
            }}
          >
            {guild.icon ? (
              <img
                src={guild.icon}
                alt={guild.name}
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--gold)',
                  boxShadow: '0 0 12px rgba(201, 168, 76, 0.4)'
                }}
              />
            ) : (
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                  border: '2px solid var(--gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '1.2rem',
                  color: 'var(--gold)',
                  boxShadow: '0 0 12px rgba(201, 168, 76, 0.4)'
                }}
              >
                {guild.name.substring(0, 2).toUpperCase()}
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '0.72rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--text-gold)',
                  fontWeight: 600,
                  marginBottom: '0.2rem'
                }}
              >
                Serveur Partenaire {idx + 1}
              </div>
              <div
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {guild.name}
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.76rem',
                  color: '#4ade80',
                  marginTop: '0.25rem'
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#4ade80',
                    display: 'inline-block'
                  }}
                />
                Accès Actif & Déployé
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Contact Notice Card */}
      <div
        style={{
          width: '100%',
          background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.5), rgba(15, 23, 42, 0.7))',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.75rem 2rem',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(90deg, transparent, var(--gold), transparent)'
          }}
        />

        <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>💬</div>

        <h3
          style={{
            fontSize: '1.2rem',
            fontWeight: 700,
            color: '#fff',
            marginBottom: '0.5rem',
            fontFamily: 'var(--font-title)'
          }}
        >
          Vous souhaitez ajouter votre serveur ?
        </h3>

        <p
          style={{
            fontSize: '0.9rem',
            color: 'var(--text-light-muted)',
            maxWidth: '540px',
            margin: '0 auto 1.25rem auto',
            lineHeight: '1.5'
          }}
        >
          Pour activer le bot Loup-Garou sur <strong>{selectedGuild.name}</strong> ou devenir
          serveur partenaire, veuillez contacter directement le développeur :
        </p>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: 'rgba(88, 101, 242, 0.15)',
            border: '1px solid rgba(88, 101, 242, 0.4)',
            padding: '0.65rem 1.25rem',
            borderRadius: 'var(--radius-sm)',
            color: '#c7d2fe',
            fontWeight: 600,
            fontSize: '0.95rem'
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ color: '#5865F2' }}
          >
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
          </svg>
          <span>Contact Discord : </span>
          <strong style={{ color: '#fff', letterSpacing: '0.02em' }}>{contactUser}</strong>
        </div>

        {/* Quick Switch Button if user is an admin of an allowed server */}
        {userAllowedGuilds.length > 0 && onSelectGuild && (
          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-light-muted)', display: 'block', marginBottom: '0.75rem' }}>
              Vous avez accès à un serveur officiel partenaire :
            </span>
            <button
              onClick={() => onSelectGuild(userAllowedGuilds[0])}
              className="btn btn-gold"
              style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem' }}
            >
              Basculer vers {userAllowedGuilds[0].name}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
