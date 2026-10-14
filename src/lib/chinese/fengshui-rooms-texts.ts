/*
 * What the rooms are called and what Ulune says of a room in its palace
 * (languages plan, part 26), in English and French. Suggestions with their
 * reasons, as practitioners give them: never a threat, nothing to buy, no
 * move or building work asked for.
 * scripts/chinese-fengshui-rooms.test.mjs keeps both languages and their tone.
 *
 *   {room}   the room with "your": "your kitchen", « votre cuisine »
 *   {star}   the star that reads it: "8 White"
 *   {state}  its state now: "waning"
 *   {other}  the palace's other star, when the fit turns on it
 *   {now}    the present period
 */
import type { Both } from "./both";
import type { RoomFit, RoomKind } from "./fengshui-rooms";

/** `yoursMany`: two or more of a kind in one palace, with {n}. */
export type RoomName = { name: Both; short: Both; yours: Both; yoursMany: Both };

export const ROOM_NAMES: Readonly<Record<RoomKind, RoomName>> = {
  entrance: { name: ["Entrance", "Entrée"], short: ["Entry", "Entrée"], yours: ["your entrance", "votre entrée"], yoursMany: ["your {n} entrances", "vos {n} entrées"] },
  living: { name: ["Living room", "Salon"], short: ["Living", "Salon"], yours: ["your living room", "votre salon"], yoursMany: ["your {n} living rooms", "vos {n} salons"] },
  dining: { name: ["Dining room", "Salle à manger"], short: ["Dining", "Repas"], yours: ["your dining room", "votre salle à manger"], yoursMany: ["your {n} dining rooms", "vos {n} salles à manger"] },
  kitchen: { name: ["Kitchen", "Cuisine"], short: ["Kitchen", "Cuisine"], yours: ["your kitchen", "votre cuisine"], yoursMany: ["your {n} kitchens", "vos {n} cuisines"] },
  office: { name: ["Office", "Bureau"], short: ["Office", "Bureau"], yours: ["your office", "votre bureau"], yoursMany: ["your {n} offices", "vos {n} bureaux"] },
  bedroom: { name: ["Bedroom", "Chambre"], short: ["Bedroom", "Chambre"], yours: ["your bedroom", "votre chambre"], yoursMany: ["your {n} bedrooms", "vos {n} chambres"] },
  children: { name: ["Child’s room", "Chambre d’enfant"], short: ["Child", "Enfant"], yours: ["your child’s room", "la chambre de votre enfant"], yoursMany: ["your children’s {n} rooms", "les {n} chambres de vos enfants"] },
  bathroom: { name: ["Bathroom or toilet", "Salle d’eau ou WC"], short: ["Bath", "Eau"], yours: ["your bathroom", "votre salle d’eau"], yoursMany: ["your {n} bathrooms", "vos {n} salles d’eau"] },
  storage: { name: ["Storage or garage", "Débarras ou garage"], short: ["Storage", "Débarras"], yours: ["your storage room", "votre débarras"], yoursMany: ["your {n} storage rooms", "vos {n} débarras"] },
};

type FitKey = `${RoomFit["use"]}-${RoomFit["fit"]}`;

export const ROOM_FIT_TEXTS: Readonly<Partial<Record<FitKey, Both>>> = {
  "quiet-suits": [
    "For {room}, a quiet room, the schools read the mountain star, which speaks of the people of the home, their rest and their bonds. Here it is the {star}, {state}: the room’s use and its star go the same way.",
    "Pour {room}, une pièce calme, les écoles lisent l’étoile de la montagne, qui parle des habitants, de leur repos et de leurs liens. Ici c’est le {star}, {state}\u202f: l’usage de la pièce et son étoile vont dans le même sens.",
  ],
  "quiet-elsewhere": [
    "For {room}, a quiet room, the schools read the mountain star: here the {star}, {state}. This palace’s timely star is its water star, the {other}, which likes movement and use: some practitioners would suggest a busier room here and a quieter sector to rest in, where the home allows. A suggestion, never a rule.",
    "Pour {room}, une pièce calme, les écoles lisent l’étoile de la montagne\u202f: ici le {star}, {state}. L’étoile en phase de ce palais est son étoile de l’eau, le {other}, qui aime le mouvement et l’usage\u202f: certains praticiens suggéreraient ici une pièce plus animée, et un secteur plus calme pour se reposer, quand le logement le permet. Une suggestion, jamais une règle.",
  ],
  "quiet-neither": [
    "For {room}, a quiet room, the schools read the mountain star: here the {star}, {state}. Neither of this palace’s stars is in its season in Period {now}; the schools ask little of such a sector, and keep it simple and calm.",
    "Pour {room}, une pièce calme, les écoles lisent l’étoile de la montagne\u202f: ici le {star}, {state}. Aucune des étoiles de ce palais n’est dans sa saison en Période {now}\u202f; les écoles demandent peu à un tel secteur, et le gardent simple et calme.",
  ],
  "active-suits": [
    "For {room}, a room of activity and comings and goings, the schools read the water star, which speaks of what flows in: work, exchanges, income. Here it is the {star}, {state}: the room’s use and its star go the same way.",
    "Pour {room}, une pièce d’activité et de passage, les écoles lisent l’étoile de l’eau, qui parle de ce qui arrive\u202f: le travail, les échanges, les revenus. Ici c’est le {star}, {state}\u202f: l’usage de la pièce et son étoile vont dans le même sens.",
  ],
  "active-elsewhere": [
    "For {room}, a room of activity, the schools read the water star: here the {star}, {state}. This palace’s timely star is its mountain star, the {other}, which likes quiet: some practitioners would suggest resting here and keeping the activity for another sector, where the home allows. A suggestion, never a rule.",
    "Pour {room}, une pièce d’activité, les écoles lisent l’étoile de l’eau\u202f: ici le {star}, {state}. L’étoile en phase de ce palais est son étoile de la montagne, le {other}, qui aime le calme\u202f: certains praticiens suggéreraient de se reposer ici et de garder l’activité pour un autre secteur, quand le logement le permet. Une suggestion, jamais une règle.",
  ],
  "active-neither": [
    "For {room}, a room of activity, the schools read the water star: here the {star}, {state}. Neither of this palace’s stars is in its season in Period {now}; the schools ask little of such a sector, and keep it tidy and easy to move through.",
    "Pour {room}, une pièce d’activité, les écoles lisent l’étoile de l’eau\u202f: ici le {star}, {state}. Aucune des étoiles de ce palais n’est dans sa saison en Période {now}\u202f; les écoles demandent peu à un tel secteur, et le gardent rangé et facile à traverser.",
  ],
  "passage-free": [
    "For {room}, a room of passage, the schools are glad of a sector whose stars are out of season, as this one is: the timely stars are best kept for the rooms that are lived in.",
    "Pour {room}, une pièce de passage, les écoles se réjouissent d’un secteur dont les étoiles sont hors saison, comme celui-ci\u202f: les étoiles en phase sont mieux gardées pour les pièces où l’on vit.",
  ],
  "passage-spends": [
    "For {room}, a room of passage, the schools would rather keep a timely star, here the {star}, for a room that is lived in. Nothing needs to change: it is a note for the day the home’s layout does.",
    "Pour {room}, une pièce de passage, les écoles préféreraient garder une étoile en phase, ici le {star}, pour une pièce où l’on vit. Rien n’est à changer\u202f: c’est une note pour le jour où l’agencement du logement changera.",
  ],
};

/** "In this palace: …", the rooms in it. */
export const ROOMS_HERE: Both = ["In this palace: {list}.", "Dans ce palais\u202f: {list}."];
