import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const OFFICIAL_CARDS = [
  {
    name: "Chasseur",
    slug: "chasseur",
    camp: "VILLAGEOIS",
    shortDescription: "S'il meurt, il élimine immédiatement un joueur de son choix avec son fusil.",
    description: "Le Chasseur n'a aucun pouvoir tant qu'il est vivant. Mais dès lors qu'il se fait éliminer (que ce soit par les Loups-Garous durant la nuit ou par le vote du village le jour), il a le pouvoir de répliquer instantanément avant de mourir en abattant n'importe quel autre joueur de son choix d'un coup de fusil.",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80",
    triggers: JSON.stringify(["chasseur", "hunter", "chass", "le chasseur"]),
    replyMode: "BOTH",
    isEnabled: true
  },
  {
    name: "Voyante",
    slug: "voyante",
    camp: "VILLAGEOIS",
    shortDescription: "Chaque nuit, elle découvre la véritable identité secrète d'un joueur.",
    description: "Chaque nuit avant l'attaque des Loups-Garous, le Narrateur appelle la Voyante. Elle désigne un joueur dont elle souhaite percer le secret. Le Narrateur lui montre discrètement la carte de ce joueur. Elle doit guider le village le jour sans se faire démasquer par les loups.",
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
    triggers: JSON.stringify(["voyante", "seer", "vovo", "la voyante"]),
    replyMode: "BOTH",
    isEnabled: true
  },
  {
    name: "Sorcière",
    slug: "sorciere",
    camp: "VILLAGEOIS",
    shortDescription: "Possède 2 potions à usage unique : une de Guérison et une de Mort.",
    description: "La Sorcière se réveille chaque nuit après les Loups. Le Narrateur lui désigne la victime de la meute. Elle peut utiliser sa potion de Guérison pour la sauver, et/ou utiliser sa potion d'Empoisonnement pour éliminer un joueur supplémentaire. Chaque potion n'est utilisable qu'une seule fois dans toute la partie.",
    imageUrl: "https://images.unsplash.com/photo-1514533450685-4493e01d1fdc?auto=format&fit=crop&w=600&q=80",
    triggers: JSON.stringify(["sorciere", "sorcière", "witch", "la sorciere", "la sorcière"]),
    replyMode: "BOTH",
    isEnabled: true
  },
  {
    name: "Loup-Garou",
    slug: "loup-garou",
    camp: "LOUPS",
    shortDescription: "Se réveille chaque nuit avec la meute pour dévorer un villageois.",
    description: "Chaque nuit, les Loups-Garous se réveillent ensemble et désignent d'un commun accord une victime innocente à dévorer. Le jour, ils se font passer pour de simples villageois et tentent de manipuler les votes pour éliminer les innocents sans se faire repérer.",
    imageUrl: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=600&q=80",
    triggers: JSON.stringify(["loup", "loups", "loup-garou", "loup garou", "werewolf", "lg"]),
    replyMode: "BOTH",
    isEnabled: true
  },
  {
    name: "Cupidon",
    slug: "cupidon",
    camp: "VILLAGEOIS",
    shortDescription: "Désigne la première nuit deux amoureux liés à la vie à la mort.",
    description: "Durant la toute première nuit, Cupidon décoche ses flèches et choisit deux joueurs qui deviendront amoureux. Si l'un d'eux meurt, l'autre meurt immédiatement de chagrin. Si l'un est Loup et l'autre Villageois, leur seul but devient d'éliminer tous les autres pour triompher ensemble.",
    imageUrl: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=600&q=80",
    triggers: JSON.stringify(["cupidon", "cupid", "amoureux", "l'amour"]),
    replyMode: "BOTH",
    isEnabled: true
  },
  {
    name: "Petite Fille",
    slug: "petite-fille",
    camp: "VILLAGEOIS",
    shortDescription: "Peut entrouvrir les yeux discrètement pendant le réveil des Loups-Garous.",
    description: "La Petite Fille peut espionner les Loups-Garous la nuit en entrouvrant discrètement les yeux. Cependant, si un Loup-Garou la surprend en train de regarder, elle meurt sur le champ à la place de la victime prévue.",
    imageUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80",
    triggers: JSON.stringify(["petite fille", "petite-fille", "pf", "fille"]),
    replyMode: "BOTH",
    isEnabled: true
  },
  {
    name: "Salvateur",
    slug: "salvateur",
    camp: "VILLAGEOIS",
    shortDescription: "Protège chaque nuit un joueur contre les griffes des Loups-Garous.",
    description: "Le Salvateur se réveille chaque nuit avant les Loups-Garous et désigne un joueur qu'il protège avec son bouclier protecteur. Si les Loups choisissent ce joueur cette nuit-là, la victime survit. Attention : le Salvateur ne peut pas protéger la même personne deux nuits de suite.",
    imageUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
    triggers: JSON.stringify(["salvateur", "salva", "protecteur", "gardien"]),
    replyMode: "BOTH",
    isEnabled: true
  },
  {
    name: "Voleur",
    slug: "voleur",
    camp: "NEUTRE",
    shortDescription: "La première nuit, il peut choisir d'échanger sa carte avec l'une des 2 cartes écartées.",
    description: "Si le Voleur est en jeu, le Narrateur prépare deux cartes supplémentaires. La première nuit, le Voleur prend connaissance de ces deux cartes et peut décider d'en choisir une pour en devenir le rôle. S'il s'agit de deux Loups-Garous, il est obligé d'en prendre un.",
    imageUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80",
    triggers: JSON.stringify(["voleur", "thief"]),
    replyMode: "BOTH",
    isEnabled: true
  },
  {
    name: "Idiot du Village",
    slug: "idiot-du-village",
    camp: "VILLAGEOIS",
    shortDescription: "S'il est condamné au vote du village, il est gracié mais perd son droit de vote.",
    description: "Si le village vote l'exécution de l'Idiot du Village, il révèle immédiatement son identité. Les villageois pris de remords le gracient sur le champ : il ne meurt pas. En revanche, pour le reste de la partie, il ne peut plus jamais voter lors des assemblées.",
    imageUrl: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=600&q=80",
    triggers: JSON.stringify(["idiot", "idiot du village", "l'idiot"]),
    replyMode: "BOTH",
    isEnabled: true
  },
  {
    name: "Joueur de Flûte",
    slug: "joueur-de-flute",
    camp: "SOLITAIRE",
    shortDescription: "Charme deux joueurs chaque nuit. Gagne seul si tous les vivants sont charmés.",
    description: "Ennemi juré du village et des loups, le Joueur de Flûte se réveille chaque nuit et enchante deux joueurs avec sa mélodie magique. Le Narrateur touche discrètement les charmés. Dès lors que TOUS les joueurs encore en vie sont charmés, le Joueur de Flûte remporte immédiatement la partie en solitaire.",
    imageUrl: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=600&q=80",
    triggers: JSON.stringify(["joueur de flute", "joueur de flûte", "flutiste", "flûte", "flute"]),
    replyMode: "BOTH",
    isEnabled: true
  }
];

async function main() {
  console.log('Seeding official Loup-Garou cards...');

  for (const card of OFFICIAL_CARDS) {
    const existing = await prisma.card.findFirst({
      where: { slug: card.slug, guildId: null }
    });

    if (existing) {
      await prisma.card.update({
        where: { id: existing.id },
        data: card
      });
    } else {
      await prisma.card.create({
        data: card
      });
    }
  }

  console.log(`Seeded ${OFFICIAL_CARDS.length} official Loup-Garou cards successfully!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
