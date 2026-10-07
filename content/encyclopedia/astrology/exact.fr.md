---
id: exact
lang: fr
slug: exact
title: Exact
aliases: [Aspect exact]
tradition: astrology
family: techniques
kind: core
page: true
summary: La minute où un aspect ou un passage est précis au degré, à la minute et à la seconde près, le sommet d’un transit.
related: [window, transit, orb, applying, progression]
sources:
  - William Lilly, Christian Astrology, 1647
revised: 2026-10-07
---

## Sens

Un aspect est exact quand la distance entre deux corps vaut précisément l’angle de l’aspect : 0° pour une conjonction, 90° pour un carré, 120° pour un trigone. Avant cet instant, l’aspect est [[applying|applicatif]] : les corps se rapprochent de l’angle. Après, il se sépare. Le même mot sert pour un passage, comme l’entrée d’une planète dans un signe ou une phase de la Lune : l’instant où la ligne est atteinte.

La tradition lit le moment exact comme le sommet d’un aspect, le point où son thème est le plus net. Le temps qui l’entoure compte aussi. Un aspect se fait sentir dans les limites de son [[orb|orbe]], grandissant tandis qu’il s’applique et s’effaçant tandis qu’il se sépare ; beaucoup d’astrologues trouvent la montée aussi parlante que le sommet. Mieux vaut lire une heure exacte comme le centre d’une période que comme une échéance.

La durée de l’approche dépend du corps qui bouge. La Lune avance d’environ treize degrés par jour : un [[transit]] lunaire franchit son dernier degré en deux heures à peu près. Le Soleil met un jour ou deux pour le même degré. Une planète lente peut rester près de l’exact des semaines durant, et une [[retrograde|rétrogradation]] peut la ramener deux ou trois fois sur le même degré : cette période plus longue, c’est la [[window|fenêtre du transit]].

## En pratique

- **Comme repère** : une date exacte est une note utile dans un journal. Beaucoup de gens regardent ensuite ce qu’ils ont rêvé, rencontré ou décidé ce jour-là et autour.
- **Un transit lent à trois passages** : le premier passage exact ouvre souvent le thème, le passage rétrograde le retravaille, le dernier le pose. Toute la période compte ; les dates exactes en sont les sommets.
- **Les déclencheurs rapides** : le jour où un transit lent est exact, la Lune ou le Soleil qui passent sur un point lié se lisent souvent comme le moment où il se montre.
- **Dans les progressions** : un jour du ciel vaut une année de vie, donc une heure du ciel [[progression|progressé]] vaut une quinzaine de jours de vie. Une date exacte en progression est le centre d’une saison, non d’une journée.

## Origine et histoire

L’astrologie ancienne disait qu’un aspect se *parfait* : en astrologie horaire, la réponse à une question est oui quand les deux significateurs arrivent à un aspect exact. William Lilly, dans *Christian Astrology* (1647), distingue l’aspect *partile*, dont les corps sont au même nombre de degrés dans leurs signes, de l’aspect *platique*, tenu dans les orbes des corps. Avant l’informatique, les astrologues trouvaient les heures exactes à la main, à partir des positions quotidiennes des éphémérides imprimées, en général à l’heure près. Les logiciels les donnent aujourd’hui à la minute.

## Comment Ulune le calcule

- Pour trouver un moment exact, Ulune échantillonne les positions du corps en mouvement, cherche l’intervalle où l’écart à l’angle de l’aspect change de signe, puis affine l’instant à l’intérieur par la méthode de Newton. Il s’arrête quand l’arc est inférieur à environ 0,0004″.
- Le moment est gardé à la seconde et affiché à la minute dans le calendrier. Un passage qui n’approche jamais l’exact à moins de 1′ est écarté : Ulune n’invente jamais une date exacte.
- Vos transits sont trouvés ainsi sur votre appareil, à partir des positions du ciel toutes les 12 heures, reliées par une courbe lisse qui passe par chaque position et chaque vitesse. La fenêtre d’une planète lente se trace à partir de ses positions quotidiennes.
- Les événements propres du ciel dans le calendrier, comme les aspects exacts entre les planètes du Soleil à Pluton, les phases de la Lune, les changements de signe et les stations, sont trouvés avec la Swiss Ephemeris et sont les mêmes pour tous.
- Pour une progression, le moment exact est trouvé dans le ciel progressé puis reconverti en date de la vie, lui aussi à la seconde.
- Dans la lecture d’un transit, Ulune estime aussi combien de temps il reste à moins de 1°, d’après la vitesse du corps au moment exact. Il s’en abstient près d’une station, ou quand la durée dépasserait quatre mois de chaque côté.
