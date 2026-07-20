import type { Brand } from "../types";

/* ══════════════════════════════════════════════════════════════════════════
   DEVINE LA MARQUE — grandes marques mondiales (tech, réseaux, gaming, sport,
   mode, luxe, fast-food, boissons, snacks, auto, divertissement).
   ⚠️ Aucune reproduction de logo : chaque marque est présentée par un
   MONOGRAMME original (initiale + couleurs signature + emoji de secteur).
   Les indices dévoilés sont des FAITS (pays, année, produit) — pas des visuels
   protégés. Les couleurs ne sont que des couleurs.
   ══════════════════════════════════════════════════════════════════════════ */

export const MARQUES: Brand[] = [
  /* ── Tech ── */
  { id: 1, name: "Apple", initial: "", c1: "#555555", c2: "#111111", emoji: "🍎", category: "Tech", hint: "La pomme croquée de Cupertino", country: "États-Unis", since: 1976, product: "iPhone, Mac, AirPods" },
  { id: 2, name: "Samsung", initial: "S", c1: "#1428a0", c2: "#0b1a6b", emoji: "📱", category: "Tech", hint: "Géant coréen de l'électronique", country: "Corée du Sud", since: 1938, product: "Smartphones Galaxy" },
  { id: 3, name: "Google", initial: "G", c1: "#4285f4", c2: "#ea4335", emoji: "🔍", category: "Tech", hint: "Le moteur de recherche n°1", country: "États-Unis", since: 1998, product: "Recherche, Android, Maps" },
  { id: 4, name: "Microsoft", initial: "⊞", c1: "#f25022", c2: "#00a4ef", emoji: "💻", category: "Tech", hint: "Windows, Xbox, Office", country: "États-Unis", since: 1975, product: "Windows et Office" },
  { id: 5, name: "Sony", initial: "S", c1: "#0a0a0a", c2: "#333333", emoji: "🎮", category: "Tech", hint: "PlayStation et électronique japonaise", country: "Japon", since: 1946, product: "PlayStation, TV, audio" },
  { id: 6, name: "Xiaomi", initial: "MI", c1: "#ff6900", c2: "#ff8f00", emoji: "📱", category: "Tech", hint: "Smartphones malins à bon prix", country: "Chine", since: 2010, product: "Smartphones et objets connectés" },
  { id: 7, name: "Nvidia", initial: "N", c1: "#76b900", c2: "#4e7c00", emoji: "🖥️", category: "Tech", hint: "Le roi des cartes graphiques", country: "États-Unis", since: 1993, product: "Cartes graphiques GeForce" },
  { id: 8, name: "Tesla", initial: "T", c1: "#e82127", c2: "#7a1216", emoji: "🔋", category: "Tech", hint: "Voitures électriques d'Elon Musk", country: "États-Unis", since: 2003, product: "Voitures électriques" },
  { id: 9, name: "Amazon", initial: "a", c1: "#ff9900", c2: "#232f3e", emoji: "📦", category: "Tech", hint: "E-commerce, la flèche qui sourit", country: "États-Unis", since: 1994, product: "E-commerce et Prime" },
  { id: 10, name: "GoPro", initial: "G", c1: "#0092d0", c2: "#00618a", emoji: "📸", category: "Tech", hint: "Les caméras d'action", country: "États-Unis", since: 2002, product: "Caméras d'action" },

  /* ── Réseaux & apps ── */
  { id: 11, name: "TikTok", initial: "♪", c1: "#25f4ee", c2: "#fe2c55", emoji: "🎵", category: "Réseaux", hint: "Vidéos courtes qui rendent accro", country: "Chine", since: 2016, product: "Vidéos courtes" },
  { id: 12, name: "Instagram", initial: "◎", c1: "#f58529", c2: "#dd2a7b", emoji: "📸", category: "Réseaux", hint: "Photos, stories et reels", country: "États-Unis", since: 2010, product: "Photos et Reels" },
  { id: 13, name: "Snapchat", initial: "👻", c1: "#fffc00", c2: "#ffe600", emoji: "👻", category: "Réseaux", hint: "Le petit fantôme jaune", country: "États-Unis", since: 2011, product: "Photos éphémères" },
  { id: 14, name: "YouTube", initial: "▶", c1: "#ff0000", c2: "#c40000", emoji: "▶️", category: "Réseaux", hint: "La plateforme vidéo n°1", country: "États-Unis", since: 2005, product: "Vidéos en ligne" },
  { id: 15, name: "WhatsApp", initial: "✆", c1: "#25d366", c2: "#128c7e", emoji: "💬", category: "Réseaux", hint: "Messagerie verte au combiné", country: "États-Unis", since: 2009, product: "Messagerie" },
  { id: 16, name: "Discord", initial: "D", c1: "#5865f2", c2: "#404eed", emoji: "🎮", category: "Réseaux", hint: "Le chat vocal des gamers", country: "États-Unis", since: 2015, product: "Chat vocal gamers" },
  { id: 17, name: "Twitch", initial: "T", c1: "#9146ff", c2: "#6441a5", emoji: "📺", category: "Réseaux", hint: "Le streaming en direct violet", country: "États-Unis", since: 2011, product: "Streaming en direct" },
  { id: 18, name: "Pinterest", initial: "P", c1: "#e60023", c2: "#ad001a", emoji: "📌", category: "Réseaux", hint: "Idées et inspirations épinglées", country: "États-Unis", since: 2010, product: "Idées à épingler" },
  { id: 19, name: "Reddit", initial: "👽", c1: "#ff4500", c2: "#cc3700", emoji: "👽", category: "Réseaux", hint: "Le forum géant, mascotte Snoo", country: "États-Unis", since: 2005, product: "Forums communautaires" },
  { id: 20, name: "Netflix", initial: "N", c1: "#e50914", c2: "#8b0510", emoji: "🍿", category: "Divertissement", hint: "Séries et films en streaming", country: "États-Unis", since: 1997, product: "Séries et films" },
  { id: 21, name: "Spotify", initial: "♫", c1: "#1db954", c2: "#14833b", emoji: "🎧", category: "Divertissement", hint: "Musique en streaming, ondes vertes", country: "Suède", since: 2006, product: "Musique en streaming" },

  /* ── Gaming ── */
  { id: 22, name: "PlayStation", initial: "PS", c1: "#003791", c2: "#00266b", emoji: "🎮", category: "Gaming", hint: "La console de Sony", country: "Japon", since: 1994, product: "Consoles de jeu" },
  { id: 23, name: "Xbox", initial: "X", c1: "#107c10", c2: "#0b5a0b", emoji: "🎮", category: "Gaming", hint: "La console verte de Microsoft", country: "États-Unis", since: 2001, product: "Consoles de jeu" },
  { id: 24, name: "Nintendo", initial: "N", c1: "#e60012", c2: "#a5000d", emoji: "🍄", category: "Gaming", hint: "Mario, Zelda et la Switch", country: "Japon", since: 1889, product: "Switch, Mario, Zelda" },
  { id: 25, name: "Fortnite", initial: "F", c1: "#9d4dff", c2: "#00c8ff", emoji: "🪂", category: "Gaming", hint: "Battle royale et danses virales", country: "États-Unis", since: 2017, product: "Battle royale" },
  { id: 26, name: "Roblox", initial: "R", c1: "#e2231a", c2: "#111111", emoji: "🧱", category: "Gaming", hint: "Créer et jouer à des mondes", country: "États-Unis", since: 2006, product: "Mondes à créer" },
  { id: 27, name: "Minecraft", initial: "▤", c1: "#6cae3e", c2: "#8b5a2b", emoji: "⛏️", category: "Gaming", hint: "Le jeu de blocs à creuser", country: "Suède", since: 2011, product: "Jeu de blocs" },
  { id: 28, name: "Steam", initial: "S", c1: "#1b2838", c2: "#2a475e", emoji: "🎮", category: "Gaming", hint: "La boutique de jeux PC", country: "États-Unis", since: 2003, product: "Boutique de jeux PC" },

  /* ── Sport ── */
  { id: 29, name: "Nike", initial: "✔", c1: "#111111", c2: "#000000", emoji: "👟", category: "Sport", hint: "« Just Do It » (la virgule)", country: "États-Unis", since: 1971, product: "Chaussures de sport" },
  { id: 30, name: "Adidas", initial: "▲", c1: "#0a0a0a", c2: "#2b2b2b", emoji: "👟", category: "Sport", hint: "Les 3 bandes", country: "Allemagne", since: 1949, product: "Chaussures et survêtements" },
  { id: 31, name: "Puma", initial: "P", c1: "#111111", c2: "#000000", emoji: "🐆", category: "Sport", hint: "Le félin bondissant", country: "Allemagne", since: 1948, product: "Chaussures de sport" },
  { id: 32, name: "New Balance", initial: "N", c1: "#cf0a2c", c2: "#9a061f", emoji: "👟", category: "Sport", hint: "Le « N » des baskets", country: "États-Unis", since: 1906, product: "Baskets de running" },
  { id: 33, name: "Vans", initial: "V", c1: "#111111", c2: "#000000", emoji: "🛹", category: "Sport", hint: "Skate et « Off The Wall »", country: "États-Unis", since: 1966, product: "Chaussures de skate" },
  { id: 34, name: "Converse", initial: "★", c1: "#111111", c2: "#333333", emoji: "👟", category: "Sport", hint: "L'étoile « All Star »", country: "États-Unis", since: 1908, product: "Chaussures All Star" },
  { id: 35, name: "The North Face", initial: "▲", c1: "#111111", c2: "#e4002b", emoji: "🏔️", category: "Sport", hint: "Vêtements outdoor", country: "États-Unis", since: 1968, product: "Vêtements outdoor" },

  /* ── Mode & luxe ── */
  { id: 36, name: "Lacoste", initial: "🐊", c1: "#004526", c2: "#008f4c", emoji: "🐊", category: "Mode", hint: "Le crocodile vert", country: "France", since: 1933, product: "Polos" },
  { id: 37, name: "Zara", initial: "Z", c1: "#111111", c2: "#000000", emoji: "👗", category: "Mode", hint: "Fast-fashion espagnol", country: "Espagne", since: 1975, product: "Prêt-à-porter" },
  { id: 38, name: "H&M", initial: "H", c1: "#e50010", c2: "#b3000c", emoji: "👕", category: "Mode", hint: "Mode suédoise abordable", country: "Suède", since: 1947, product: "Prêt-à-porter" },
  { id: 39, name: "Uniqlo", initial: "U", c1: "#ff0000", c2: "#c40000", emoji: "🧥", category: "Mode", hint: "Basiques japonais", country: "Japon", since: 1984, product: "Vêtements basiques" },
  { id: 40, name: "Supreme", initial: "S", c1: "#e5322d", c2: "#b31e1a", emoji: "🧢", category: "Mode", hint: "Le carré rouge du streetwear", country: "États-Unis", since: 1994, product: "Streetwear" },
  { id: 41, name: "Ralph Lauren", initial: "🐴", c1: "#012169", c2: "#0a3a9c", emoji: "🐴", category: "Mode", hint: "Le joueur de polo", country: "États-Unis", since: 1967, product: "Polos chic" },
  { id: 42, name: "Gucci", initial: "GG", c1: "#006341", c2: "#8b0000", emoji: "💎", category: "Luxe", hint: "Le double G italien", country: "Italie", since: 1921, product: "Maroquinerie de luxe" },
  { id: 43, name: "Louis Vuitton", initial: "LV", c1: "#4b2e19", c2: "#c9a227", emoji: "💼", category: "Luxe", hint: "Le monogramme LV", country: "France", since: 1854, product: "Bagages et sacs de luxe" },
  { id: 44, name: "Chanel", initial: "CC", c1: "#111111", c2: "#000000", emoji: "🌸", category: "Luxe", hint: "Les deux C entrelacés", country: "France", since: 1910, product: "Parfums et haute couture" },
  { id: 45, name: "Dior", initial: "D", c1: "#111111", c2: "#333333", emoji: "👜", category: "Luxe", hint: "Maison de couture parisienne", country: "France", since: 1946, product: "Haute couture" },

  /* ── Fast-food & boissons & snacks ── */
  { id: 46, name: "McDonald's", initial: "M", c1: "#ffc72c", c2: "#da291c", emoji: "🍟", category: "Fast-food", hint: "Les arches dorées", country: "États-Unis", since: 1955, product: "Burgers et frites" },
  { id: 47, name: "Burger King", initial: "BK", c1: "#d62300", c2: "#8f1700", emoji: "🍔", category: "Fast-food", hint: "Le Whopper", country: "États-Unis", since: 1954, product: "Burgers" },
  { id: 48, name: "KFC", initial: "K", c1: "#a30000", c2: "#6e0000", emoji: "🍗", category: "Fast-food", hint: "Le poulet du Colonel", country: "États-Unis", since: 1952, product: "Poulet frit" },
  { id: 49, name: "Starbucks", initial: "★", c1: "#00704a", c2: "#004a31", emoji: "☕", category: "Fast-food", hint: "La sirène verte du café", country: "États-Unis", since: 1971, product: "Cafés à emporter" },
  { id: 50, name: "Subway", initial: "S", c1: "#008c15", c2: "#ffc600", emoji: "🥪", category: "Fast-food", hint: "Sandwichs sur mesure", country: "États-Unis", since: 1965, product: "Sandwichs" },
  { id: 51, name: "Domino's", initial: "D", c1: "#006491", c2: "#e31837", emoji: "🍕", category: "Fast-food", hint: "Pizzas livrées, le domino", country: "États-Unis", since: 1960, product: "Pizzas livrées" },
  { id: 52, name: "Coca-Cola", initial: "C", c1: "#f40009", c2: "#a50006", emoji: "🥤", category: "Boissons", hint: "Le soda rouge n°1", country: "États-Unis", since: 1886, product: "Soda cola" },
  { id: 53, name: "Pepsi", initial: "P", c1: "#004b93", c2: "#e32934", emoji: "🥤", category: "Boissons", hint: "Le rival bleu du cola", country: "États-Unis", since: 1898, product: "Soda cola" },
  { id: 54, name: "Red Bull", initial: "RB", c1: "#001489", c2: "#db0a40", emoji: "🐂", category: "Boissons", hint: "« Donne des ailes », 2 taureaux", country: "Autriche", since: 1987, product: "Boisson énergisante" },
  { id: 55, name: "Monster", initial: "M", c1: "#a3d900", c2: "#111111", emoji: "🥤", category: "Boissons", hint: "L'énergie à la griffe verte", country: "États-Unis", since: 2002, product: "Boisson énergisante" },
  { id: 56, name: "Fanta", initial: "F", c1: "#ff7f00", c2: "#e35b00", emoji: "🍊", category: "Boissons", hint: "Le soda orange pétillant", country: "Allemagne", since: 1940, product: "Soda à l'orange" },
  { id: 57, name: "Nutella", initial: "N", c1: "#3b2417", c2: "#e30613", emoji: "🍫", category: "Snacks", hint: "La pâte à tartiner noisette", country: "Italie", since: 1964, product: "Pâte à tartiner" },
  { id: 58, name: "Oreo", initial: "O", c1: "#111111", c2: "#0067b1", emoji: "🍪", category: "Snacks", hint: "Le biscuit noir à fourrer", country: "États-Unis", since: 1912, product: "Biscuits fourrés" },
  { id: 59, name: "Kinder", initial: "K", c1: "#d2001f", c2: "#8b4513", emoji: "🍫", category: "Snacks", hint: "Chocolat et surprises", country: "Italie", since: 1968, product: "Chocolats" },
  { id: 60, name: "Haribo", initial: "H", c1: "#e30613", c2: "#ffd200", emoji: "🐻", category: "Snacks", hint: "Les bonbons oursons", country: "Allemagne", since: 1920, product: "Bonbons gélifiés" },

  /* ── Auto ── */
  { id: 61, name: "BMW", initial: "B", c1: "#0066b1", c2: "#003d6b", emoji: "🚗", category: "Auto", hint: "L'hélice bleu-blanc bavaroise", country: "Allemagne", since: 1916, product: "Voitures et motos" },
  { id: 62, name: "Mercedes-Benz", initial: "☰", c1: "#333333", c2: "#000000", emoji: "🚗", category: "Auto", hint: "L'étoile à 3 branches", country: "Allemagne", since: 1926, product: "Voitures de prestige" },
  { id: 63, name: "Ferrari", initial: "🐎", c1: "#ff2800", c2: "#b31c00", emoji: "🏎️", category: "Auto", hint: "Le cheval cabré italien", country: "Italie", since: 1947, product: "Voitures de sport" },
  { id: 64, name: "Lamborghini", initial: "🐂", c1: "#ddb321", c2: "#111111", emoji: "🏎️", category: "Auto", hint: "Le taureau, supercars", country: "Italie", since: 1963, product: "Supercars" },
  { id: 65, name: "Toyota", initial: "T", c1: "#eb0a1e", c2: "#a50715", emoji: "🚗", category: "Auto", hint: "Constructeur japonais n°1", country: "Japon", since: 1937, product: "Voitures" },
  { id: 66, name: "Peugeot", initial: "🦁", c1: "#111111", c2: "#333333", emoji: "🦁", category: "Auto", hint: "Le lion français", country: "France", since: 1889, product: "Voitures" },

  /* ── Divertissement & divers ── */
  { id: 67, name: "Disney", initial: "D", c1: "#006e99", c2: "#00456b", emoji: "🏰", category: "Divertissement", hint: "Le château et Mickey", country: "États-Unis", since: 1923, product: "Films et parcs" },
  { id: 68, name: "Marvel", initial: "M", c1: "#ed1d24", c2: "#b30d13", emoji: "🦸", category: "Divertissement", hint: "Les super-héros (Avengers)", country: "États-Unis", since: 1939, product: "Comics et films de super-héros" },
  { id: 69, name: "Lego", initial: "L", c1: "#d01012", c2: "#ffcf00", emoji: "🧱", category: "Divers", hint: "Les briques danoises", country: "Danemark", since: 1932, product: "Briques de construction" },
  { id: 70, name: "IKEA", initial: "I", c1: "#0051ba", c2: "#ffda1a", emoji: "🛋️", category: "Divers", hint: "Meubles suédois en kit", country: "Suède", since: 1943, product: "Meubles en kit" },
  { id: 71, name: "Airbnb", initial: "◉", c1: "#ff5a5f", c2: "#e0484d", emoji: "🏠", category: "Divers", hint: "Louer un logement chez l'habitant", country: "États-Unis", since: 2008, product: "Locations de logements" },
  { id: 72, name: "Uber", initial: "U", c1: "#111111", c2: "#000000", emoji: "🚕", category: "Divers", hint: "Réserver une course en un tap", country: "États-Unis", since: 2009, product: "Courses en voiture" },
  { id: 73, name: "PayPal", initial: "P", c1: "#003087", c2: "#009cde", emoji: "💳", category: "Divers", hint: "Le paiement en ligne", country: "États-Unis", since: 1998, product: "Paiements en ligne" },

  /* ── Ajouts : encore plus de marques ── */
  { id: 74, name: "LG", initial: "L", c1: "#a50034", c2: "#6b0022", emoji: "📱", category: "Tech", hint: "Électronique coréenne, « Life's Good »", country: "Corée du Sud", since: 1958, product: "Électroménager et TV" },
  { id: 75, name: "Lenovo", initial: "L", c1: "#e2231a", c2: "#b31b14", emoji: "💻", category: "Tech", hint: "Ordinateurs et ThinkPad", country: "Chine", since: 1984, product: "Ordinateurs" },
  { id: 76, name: "Canon", initial: "C", c1: "#cc0000", c2: "#8f0000", emoji: "📷", category: "Tech", hint: "Appareils photo et imprimantes", country: "Japon", since: 1937, product: "Appareils photo" },
  { id: 77, name: "JBL", initial: "J", c1: "#ff6600", c2: "#cc5200", emoji: "🔊", category: "Tech", hint: "Enceintes et casques audio", country: "États-Unis", since: 1946, product: "Enceintes et casques" },
  { id: 78, name: "Bose", initial: "B", c1: "#111111", c2: "#333333", emoji: "🔊", category: "Tech", hint: "Le son haut de gamme", country: "États-Unis", since: 1964, product: "Audio haut de gamme" },
  { id: 79, name: "Facebook", initial: "f", c1: "#1877f2", c2: "#0a5dc2", emoji: "👍", category: "Réseaux", hint: "Le réseau social bleu au pouce", country: "États-Unis", since: 2004, product: "Réseau social" },
  { id: 80, name: "Telegram", initial: "T", c1: "#2aabee", c2: "#1c88bf", emoji: "✈️", category: "Réseaux", hint: "Messagerie, un avion en papier", country: "Russie", since: 2013, product: "Messagerie sécurisée" },
  { id: 81, name: "LinkedIn", initial: "in", c1: "#0a66c2", c2: "#004182", emoji: "💼", category: "Réseaux", hint: "Le réseau professionnel", country: "États-Unis", since: 2003, product: "Réseau professionnel" },
  { id: 82, name: "ChatGPT", initial: "◈", c1: "#10a37f", c2: "#0b7a5f", emoji: "🤖", category: "Tech", hint: "L'assistant d'intelligence artificielle", country: "États-Unis", since: 2022, product: "Assistant IA" },
  { id: 83, name: "Zoom", initial: "Z", c1: "#2d8cff", c2: "#1f6fd6", emoji: "🎥", category: "Réseaux", hint: "Les visioconférences", country: "États-Unis", since: 2011, product: "Visioconférence" },
  { id: 84, name: "Deezer", initial: "D", c1: "#a238ff", c2: "#7d1fd6", emoji: "🎧", category: "Divertissement", hint: "Musique en streaming", country: "France", since: 2007, product: "Musique en streaming" },

  { id: 85, name: "EA", initial: "EA", c1: "#ff4747", c2: "#111111", emoji: "🎮", category: "Gaming", hint: "Éditeur de FIFA et des Sims", country: "États-Unis", since: 1982, product: "Jeux vidéo (FIFA, Sims)" },
  { id: 86, name: "Ubisoft", initial: "U", c1: "#0a0a0a", c2: "#333333", emoji: "🎮", category: "Gaming", hint: "Assassin's Creed, Just Dance", country: "France", since: 1986, product: "Jeux vidéo (Assassin's Creed)" },
  { id: 87, name: "Epic Games", initial: "E", c1: "#2a2a2a", c2: "#111111", emoji: "🎮", category: "Gaming", hint: "Le créateur de Fortnite", country: "États-Unis", since: 1991, product: "Jeux vidéo (Fortnite)" },
  { id: 88, name: "Call of Duty", initial: "CoD", c1: "#1a1a1a", c2: "#333333", emoji: "🎯", category: "Gaming", hint: "Le jeu de tir militaire n°1", country: "États-Unis", since: 2003, product: "Jeu de tir" },
  { id: 89, name: "Pokémon", initial: "P", c1: "#ffcb05", c2: "#3d7dca", emoji: "⚡", category: "Gaming", hint: "« Attrapez-les tous ! »", country: "Japon", since: 1996, product: "Jeux et cartes à collectionner" },
  { id: 90, name: "Sega", initial: "S", c1: "#0064b5", c2: "#004b8a", emoji: "🎮", category: "Gaming", hint: "Sonic le hérisson", country: "Japon", since: 1960, product: "Jeux vidéo (Sonic)" },
  { id: 91, name: "Razer", initial: "R", c1: "#00c800", c2: "#0a3d0a", emoji: "🐍", category: "Gaming", hint: "Matériel gaming, serpent vert", country: "Singapour", since: 2005, product: "Matériel gaming" },

  { id: 92, name: "Reebok", initial: "R", c1: "#e2231a", c2: "#b31b14", emoji: "👟", category: "Sport", hint: "Baskets et fitness", country: "Royaume-Uni", since: 1958, product: "Baskets et fitness" },
  { id: 93, name: "Asics", initial: "A", c1: "#0033a0", c2: "#00246e", emoji: "👟", category: "Sport", hint: "Running japonais", country: "Japon", since: 1949, product: "Chaussures de running" },
  { id: 94, name: "Jordan", initial: "J", c1: "#111111", c2: "#c8102e", emoji: "🏀", category: "Sport", hint: "Baskets de basket légendaires", country: "États-Unis", since: 1984, product: "Baskets de basket" },
  { id: 95, name: "Decathlon", initial: "D", c1: "#0082c3", c2: "#005f8f", emoji: "⚽", category: "Sport", hint: "Le magasin de sport n°1", country: "France", since: 1976, product: "Articles de sport" },
  { id: 96, name: "Under Armour", initial: "UA", c1: "#1d1d1d", c2: "#000000", emoji: "💪", category: "Sport", hint: "Vêtements de performance", country: "États-Unis", since: 1996, product: "Vêtements de sport" },

  { id: 97, name: "Levi's", initial: "L", c1: "#b3122f", c2: "#8a0e24", emoji: "👖", category: "Mode", hint: "Les jeans américains", country: "États-Unis", since: 1853, product: "Jeans" },
  { id: 98, name: "Calvin Klein", initial: "CK", c1: "#111111", c2: "#000000", emoji: "🩳", category: "Mode", hint: "Mode et sous-vêtements CK", country: "États-Unis", since: 1968, product: "Mode et sous-vêtements" },
  { id: 99, name: "Tommy Hilfiger", initial: "T", c1: "#c8102e", c2: "#00205b", emoji: "⛵", category: "Mode", hint: "Mode américaine chic", country: "États-Unis", since: 1985, product: "Mode chic" },
  { id: 100, name: "Shein", initial: "S", c1: "#111111", c2: "#000000", emoji: "👗", category: "Mode", hint: "Fast-fashion en ligne", country: "Chine", since: 2008, product: "Mode en ligne" },
  { id: 101, name: "Sephora", initial: "S", c1: "#111111", c2: "#000000", emoji: "💄", category: "Divers", hint: "Parfums et cosmétiques", country: "France", since: 1969, product: "Parfums et cosmétiques" },
  { id: 102, name: "Prada", initial: "P", c1: "#1a1a1a", c2: "#333333", emoji: "👜", category: "Luxe", hint: "Maison de luxe milanaise", country: "Italie", since: 1913, product: "Maroquinerie de luxe" },
  { id: 103, name: "Balenciaga", initial: "B", c1: "#111111", c2: "#000000", emoji: "👟", category: "Luxe", hint: "Luxe et streetwear", country: "Espagne", since: 1919, product: "Mode de luxe" },

  { id: 104, name: "Pizza Hut", initial: "PH", c1: "#ee3124", c2: "#a51d16", emoji: "🍕", category: "Fast-food", hint: "La pizza au toit rouge", country: "États-Unis", since: 1958, product: "Pizzas" },
  { id: 105, name: "Krispy Kreme", initial: "K", c1: "#006241", c2: "#c8102e", emoji: "🍩", category: "Fast-food", hint: "Les donuts glacés", country: "États-Unis", since: 1937, product: "Donuts" },
  { id: 106, name: "Dunkin'", initial: "D", c1: "#ff671f", c2: "#e11383", emoji: "🍩", category: "Fast-food", hint: "Donuts et café", country: "États-Unis", since: 1950, product: "Donuts et café" },
  { id: 107, name: "Ben & Jerry's", initial: "B&J", c1: "#0072ce", c2: "#00843d", emoji: "🍦", category: "Snacks", hint: "Les glaces gourmandes", country: "États-Unis", since: 1978, product: "Glaces" },
  { id: 108, name: "Sprite", initial: "S", c1: "#009a44", c2: "#00722f", emoji: "🥤", category: "Boissons", hint: "Soda citron-vert pétillant", country: "États-Unis", since: 1961, product: "Soda citron-vert" },
  { id: 109, name: "Orangina", initial: "O", c1: "#ff7f00", c2: "#e35b00", emoji: "🍊", category: "Boissons", hint: "« Secouez-moi ! »", country: "France", since: 1936, product: "Soda à l'orange" },
  { id: 110, name: "Nescafé", initial: "N", c1: "#a6093d", c2: "#6b0626", emoji: "☕", category: "Boissons", hint: "Le café instantané", country: "Suisse", since: 1938, product: "Café instantané" },
  { id: 111, name: "M&M's", initial: "m", c1: "#2a9df4", c2: "#ff0000", emoji: "🍬", category: "Snacks", hint: "Les billes de chocolat colorées", country: "États-Unis", since: 1941, product: "Bonbons chocolatés" },
  { id: 112, name: "Doritos", initial: "D", c1: "#d52b1e", c2: "#111111", emoji: "🧀", category: "Snacks", hint: "Les chips tortilla", country: "États-Unis", since: 1964, product: "Chips tortilla" },
  { id: 113, name: "Lay's", initial: "L", c1: "#ffd200", c2: "#e30613", emoji: "🥔", category: "Snacks", hint: "Les chips n°1", country: "États-Unis", since: 1932, product: "Chips" },
  { id: 114, name: "Pringles", initial: "P", c1: "#e30613", c2: "#ffcb05", emoji: "🥔", category: "Snacks", hint: "Les chips dans un tube", country: "États-Unis", since: 1968, product: "Chips en tube" },
  { id: 115, name: "KitKat", initial: "K", c1: "#d70021", c2: "#8a0016", emoji: "🍫", category: "Snacks", hint: "« Have a break »", country: "Royaume-Uni", since: 1935, product: "Barres chocolatées" },
  { id: 116, name: "Snickers", initial: "S", c1: "#a6093d", c2: "#6b1a12", emoji: "🥜", category: "Snacks", hint: "Chocolat, caramel et cacahuètes", country: "États-Unis", since: 1930, product: "Barres chocolatées" },
  { id: 117, name: "Milka", initial: "M", c1: "#7d69ac", c2: "#5a4a82", emoji: "🐄", category: "Snacks", hint: "Le chocolat au lait violet", country: "Suisse", since: 1901, product: "Chocolat au lait" },
  { id: 118, name: "Twix", initial: "T", c1: "#c8102e", c2: "#c8a24a", emoji: "🍫", category: "Snacks", hint: "Les deux barres chocolatées", country: "Royaume-Uni", since: 1967, product: "Barres chocolatées" },
  { id: 119, name: "Chupa Chups", initial: "C", c1: "#e30613", c2: "#ffcb05", emoji: "🍭", category: "Snacks", hint: "Les sucettes rondes", country: "Espagne", since: 1958, product: "Sucettes" },

  { id: 120, name: "Audi", initial: "A", c1: "#bb0a30", c2: "#111111", emoji: "🚗", category: "Auto", hint: "Les 4 anneaux allemands", country: "Allemagne", since: 1909, product: "Voitures" },
  { id: 121, name: "Volkswagen", initial: "VW", c1: "#001e50", c2: "#003a8c", emoji: "🚗", category: "Auto", hint: "« La voiture du peuple »", country: "Allemagne", since: 1937, product: "Voitures" },
  { id: 122, name: "Porsche", initial: "P", c1: "#1a1a1a", c2: "#c8a24a", emoji: "🏎️", category: "Auto", hint: "Sportives allemandes de prestige", country: "Allemagne", since: 1931, product: "Voitures de sport" },
  { id: 123, name: "Renault", initial: "R", c1: "#ffcc33", c2: "#111111", emoji: "🚗", category: "Auto", hint: "Le losange français", country: "France", since: 1899, product: "Voitures" },

  { id: 124, name: "eBay", initial: "e", c1: "#e53238", c2: "#0064d2", emoji: "🛒", category: "Divers", hint: "Les enchères en ligne", country: "États-Unis", since: 1995, product: "Enchères en ligne" },
  { id: 125, name: "Temu", initial: "T", c1: "#ff6f00", c2: "#e35b00", emoji: "🛍️", category: "Divers", hint: "Le e-commerce à petits prix", country: "Chine", since: 2022, product: "E-commerce discount" },
  { id: 126, name: "Ryanair", initial: "R", c1: "#073590", c2: "#f1c933", emoji: "✈️", category: "Divers", hint: "La compagnie aérienne low-cost", country: "Irlande", since: 1984, product: "Vols low-cost" },
  { id: 127, name: "Booking", initial: "B", c1: "#003580", c2: "#0057b8", emoji: "🏨", category: "Divers", hint: "Réserver un hôtel", country: "Pays-Bas", since: 1996, product: "Réservation d'hôtels" },
];

const shuffle = <T,>(a: T[], rnd: () => number): T[] => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
};

/** L'initiale du monogramme (première lettre si non précisée). */
export function monogram(b: Brand): string { return b.initial || b.name.charAt(0).toUpperCase(); }

/** Un indice dévoilé progressivement (icône + texte). */
export interface BrandClue { ic: string; label: string; }

/**
 * Liste ordonnée des indices d'une marque, du plus vague au plus révélateur.
 * On ne garde que les champs présents → chaque marque a au moins 3 indices
 * (catégorie + monogramme + indice final).
 */
export function brandClues(b: Brand): BrandClue[] {
  const clues: BrandClue[] = [];
  clues.push({ ic: "🗂️", label: b.category });
  if (b.country) clues.push({ ic: "🌍", label: `Origine : ${b.country}` });
  if (b.since) clues.push({ ic: "📅", label: `Depuis ${b.since}` });
  if (b.product) clues.push({ ic: "🏆", label: b.product });
  clues.push({ ic: "🔤", label: `Initiale « ${monogram(b)} »` });
  clues.push({ ic: "💡", label: b.hint });
  return clues;
}

/** Tire une marque en évitant toute répétition (partie + parties récentes). */
export function pickBrand(usedInGame: number[], recent: Set<string>, rnd: () => number = Math.random): Brand {
  const inGame = new Set(usedInGame);
  let pool = MARQUES.filter(b => !inGame.has(b.id) && !recent.has(String(b.id)));
  if (pool.length === 0) pool = MARQUES.filter(b => !inGame.has(b.id));
  if (pool.length === 0) pool = MARQUES;
  return pool[Math.floor(rnd() * pool.length)];
}

/** 4 options (la bonne + 3 leurres, prioritairement de la même catégorie). */
export function buildOptions(answer: Brand, rnd: () => number = Math.random): string[] {
  const sameCat = shuffle(MARQUES.filter(b => b.id !== answer.id && b.category === answer.category), rnd);
  const others = shuffle(MARQUES.filter(b => b.id !== answer.id && b.category !== answer.category), rnd);
  const distractors = [...sameCat, ...others].slice(0, 3).map(b => b.name);
  return shuffle([answer.name, ...distractors], rnd);
}
