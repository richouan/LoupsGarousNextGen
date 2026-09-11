import { cardMatcherService, MatchableCard } from '../services/CardMatcherService';
import { channelFilterService } from '../services/ChannelFilterService';
import { rateLimiterService } from '../services/RateLimiterService';
import { buildCardEmbed, buildSecretRevealRow, buildRolesListEmbeds } from '../utils/embedBuilder';
import { rolesListService } from '../services/RolesListService';

// Sample Loup-Garou cards for verification
const sampleCards: MatchableCard[] = [
  {
    id: 'card-1',
    name: 'Chasseur',
    slug: 'chasseur',
    camp: 'VILLAGEOIS',
    description: 'Le Chasseur élimine un joueur en mourant.',
    shortDescription: 'Tire sur quelqu\'un en mourant.',
    imageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136',
    replyMode: 'BOTH',
    isUnique: true,
    abilityType: 'NIGHT',
    difficulty: 1,
    isEnabled: true
  },
  {
    id: 'card-2',
    name: 'Sorcière',
    slug: 'sorciere',
    camp: 'VILLAGEOIS',
    description: 'Possède une potion de vie et une potion de mort.',
    replyMode: 'BOTH',
    isUnique: true,
    abilityType: 'NIGHT',
    difficulty: 2,
    isEnabled: true
  },
  {
    id: 'card-3',
    name: 'Loup-Garou',
    slug: 'loup-garou',
    camp: 'LOUPS',
    description: 'Dévore un villageois chaque nuit.',
    replyMode: 'BOTH',
    isUnique: false,
    abilityType: 'NIGHT',
    difficulty: 1,
    isEnabled: true
  },
  {
    id: 'card-4',
    name: 'Voleur',
    slug: 'voleur',
    camp: 'SOLITAIRE',
    description: 'Choisit un rôle parmi les cartes restantes.',
    replyMode: 'BOTH',
    isUnique: true,
    abilityType: 'NIGHT',
    difficulty: 3,
    isEnabled: true
  }
];

function runTests() {
  console.log('🐺 ============================================');
  console.log('🐺 LOUP-GAROU BOT ENGINE - VERIFICATION SUITE');
  console.log('🐺 ============================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
    }
  }

  // --- 1. Card Matching & Exact Role Name Filter Tests ---
  console.log('--- Test 1: Exact Role Name Detection & Normalization ---');

  const match1 = cardMatcherService.findMatch('Chasseur', sampleCards);
  assert(match1?.slug === 'chasseur', 'Matches "Chasseur" exactly');

  const match2 = cardMatcherService.findMatch('chasseur', sampleCards);
  assert(match2?.slug === 'chasseur', 'Matches lower-case "chasseur"');

  const match3 = cardMatcherService.findMatch('  CHASSEUR!  ', sampleCards);
  assert(match3?.slug === 'chasseur', 'Matches "  CHASSEUR!  " with trim, caps and punctuation');

  const match4 = cardMatcherService.findMatch('sorcière', sampleCards);
  assert(match4?.slug === 'sorciere', 'Matches with accents: "sorcière"');

  const match5 = cardMatcherService.findMatch('sorciere', sampleCards);
  assert(match5?.slug === 'sorciere', 'Matches without accents: "sorciere"');

  const match6 = cardMatcherService.findMatch('hunter', sampleCards);
  assert(match6 === null, 'No triggers anymore');

  // CRITICAL: Ensure full conversation messages containing the word are NOT auto-replied!
  const sentenceMatch = cardMatcherService.findMatch('Je pense que le chasseur a bien joué', sampleCards);
  assert(sentenceMatch === null, 'Rejects full sentence containing role word: "Je pense que le chasseur..."');

  const randomMatch = cardMatcherService.findMatch('bonjour tout le monde', sampleCards);
  assert(randomMatch === null, 'Rejects ordinary greeting');

  // --- 2. Channel & Category Filter Tests ---
  console.log('\n--- Test 2: Channel & Category Scoping ---');

  const optionsWithWhitelist = {
    autoReplyEnabled: true,
    allowedChannelIds: ['channel-loup-garou', 'channel-general'],
    allowedCategoryIds: ['category-partie-en-cours'],
    ignoredChannelIds: ['channel-annonces'],
    allowDms: true
  };

  assert(
    channelFilterService.isChannelAllowed(false, 'channel-loup-garou', 'category-partie-en-cours', optionsWithWhitelist),
    'Allows whitelisted channel'
  );

  assert(
    channelFilterService.isChannelAllowed(false, 'channel-autre', 'category-partie-en-cours', optionsWithWhitelist),
    'Allows channel inside whitelisted category'
  );

  assert(
    !channelFilterService.isChannelAllowed(false, 'channel-annonces', 'category-partie-en-cours', optionsWithWhitelist),
    'Blocks ignored channel even if category matches'
  );

  assert(
    !channelFilterService.isChannelAllowed(false, 'channel-random', 'category-random', optionsWithWhitelist),
    'Blocks channel outside of whitelist'
  );

  assert(
    channelFilterService.isChannelAllowed(true, 'dm-chan', null, optionsWithWhitelist),
    'Allows DM when allowDms is true'
  );

  // --- 3. Rate Limiter Tests ---
  console.log('\n--- Test 3: Anti-Spam Rate Limiter ---');

  const rl1 = rateLimiterService.checkRateLimit('guild-1', 'channel-1', 'user-123', 3, 1);
  assert(rl1.allowed === true, 'First request allowed');

  const rl2 = rateLimiterService.checkRateLimit('guild-1', 'channel-1', 'user-123', 3, 1);
  assert(rl2.allowed === false, 'Immediate second spam request BLOCKED by cooldown');

  const rl3 = rateLimiterService.checkRateLimit('guild-1', 'channel-1', 'user-456', 3, 1);
  assert(rl3.allowed === false, 'Immediate second request in same channel BLOCKED by channel cooldown');

  // --- 4. Embed & Reveal Button Builder Tests ---
  console.log('\n--- Test 4: Embed & Secret Reveal Button Construction ---');

  const embedOutput = buildCardEmbed(sampleCards[0], false);
  assert(embedOutput.embed.data.title === 'Chasseur', 'Embed title matches card name');
  assert(embedOutput.embed.data.color === 0x3b82f6, 'Embed color matches Villageois blue');

  const row = buildSecretRevealRow('card-1', 'Chasseur');
  assert(row.components.length === 2, 'Secret button row created with reveal and website buttons');

  // --- 5. Roles List (Mention & 3 Embeds) Tests ---
  console.log('\n--- Test 5: Roles List Query Detection & 3 Colored Embeds ---');

  const botId = '999999999999999999';
  const mockClient = { user: { id: botId } } as any;

  function createMockMessage(content: string, isMentioned: boolean, isGuild = true) {
    return {
      content,
      guild: isGuild ? { id: 'guild-1' } : null,
      client: mockClient,
      author: { bot: false, id: 'user-1' },
      system: false,
      mentions: {
        users: {
          has: (id: string) => isMentioned && id === botId
        }
      }
    } as any;
  }

  assert(
    rolesListService.isRolesListRequest(createMockMessage(`<@${botId}> roles`, true)),
    'Matches "@bot roles"'
  );
  assert(
    rolesListService.isRolesListRequest(createMockMessage(`<@!${botId}> roles list`, true)),
    'Matches "@bot roles list"'
  );
  assert(
    rolesListService.isRolesListRequest(createMockMessage(`<@${botId}> all roles`, true)),
    'Matches "@bot all roles"'
  );
  assert(
    rolesListService.isRolesListRequest(createMockMessage(`<@${botId}> : roles`, true)),
    'Matches "@bot : roles"'
  );
  assert(
    rolesListService.isRolesListRequest(createMockMessage(`<@${botId}> : all roles`, true)),
    'Matches "@bot : all roles"'
  );
  assert(
    rolesListService.isRolesListRequest(createMockMessage(`roles <@${botId}>`, true)),
    'Matches "roles @bot"'
  );
  assert(
    rolesListService.isRolesListRequest(createMockMessage(`roles`, false, false)),
    'Matches "roles" in DM without mention'
  );
  assert(
    !rolesListService.isRolesListRequest(createMockMessage(`roles`, false, true)),
    'Rejects "roles" in guild without mention'
  );
  assert(
    !rolesListService.isRolesListRequest(createMockMessage(`<@${botId}> hello bot`, true)),
    'Rejects unrelated question "@bot hello bot"'
  );

  // Test 3 Embeds generation: Loups in Red, Villageois in White-Yellow, Solos in Violet
  const roleEmbeds = buildRolesListEmbeds(sampleCards);
  assert(roleEmbeds.length === 3, 'Generates exactly 3 embeds');

  const [loupsEmbed, villageEmbed, soloEmbed] = roleEmbeds;

  assert(loupsEmbed.data.color === 0xef4444, 'Loups-Garous embed is RED (0xef4444)');
  assert(Boolean(loupsEmbed.data.title?.includes('Loups-Garous')), 'Loups embed has Loups-Garous title');
  assert(Boolean(loupsEmbed.data.description?.includes('Loup-Garou')), 'Loups embed lists Loup-Garou');

  assert(villageEmbed.data.color === 0xfef08a, 'Villageois embed is WHITE-YELLOW (0xfef08a)');
  assert(Boolean(villageEmbed.data.title?.includes('Villageois')), 'Villageois embed has Villageois title');
  assert(Boolean(villageEmbed.data.description?.includes('Chasseur') && villageEmbed.data.description?.includes('Sorcière')), 'Villageois embed lists Chasseur and Sorcière');

  assert(soloEmbed.data.color === 0xa855f7, 'Solos embed is VIOLET (0xa855f7)');
  assert(Boolean(soloEmbed.data.title?.includes('Solos')), 'Solos embed has Solos title');
  assert(Boolean(soloEmbed.data.description?.includes('Voleur')), 'Solos embed lists Voleur');

  console.log(`\n🐺 Results: ${passed}/${total} tests passed!`);
  if (passed === total) {
    console.log('🎉 ALL ENGINE VERIFICATIONS SUCCEEDED!\n');
  } else {
    process.exit(1);
  }
}

runTests();

