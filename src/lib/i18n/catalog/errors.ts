/** errors: [English, French]. */
export const errors = {
  couldNotCast: ["Couldn’t cast the chart. Try again in a moment.", "Impossible de calculer le thème. Réessayez dans un instant."],
  couldNotCastProgressions: [
    "Couldn’t calculate this progression. Try again in a moment.",
    "Impossible de calculer cette progression. Réessayez dans un instant.",
  ],
  couldNotCastSky: ["Couldn’t calculate the sky. Try again in a moment.", "Impossible de calculer le ciel. Réessayez dans un instant."],
  couldNotCompose: [
    "Couldn’t write the reading. Try again in a moment.",
    "La lecture n’a pas pu être rédigée. Réessayez dans un instant.",
  ],
  couldNotFind: [
    "Couldn’t find “{query}”. Check the spelling, or add the country (Paris, France), or paste coordinates.",
    "Impossible de trouver «\u202f{query}\u202f». Vérifiez l’orthographe, ajoutez le pays (Paris, France), ou collez des coordonnées.",
  ],
  couldNotSaveLocal: [
    "Couldn’t save this chart in the browser. Storage may be full or blocked: free some space or allow storage for this site, then try again.",
    "Impossible d’enregistrer ce thème dans le navigateur. Le stockage est peut-être plein ou bloqué\u202f: libérez de la place ou autorisez le stockage pour ce site, puis réessayez.",
  ],
  errorSlotRetry: ["Try again", "Réessayer"],
  errorSlotTitle: ["This page didn’t load.", "Cette page ne s’est pas chargée."],
  staleVersionTitle: ["A new version of Ulune is out.", "Une nouvelle version d’Ulune est en ligne."],
  staleVersionBody: [
    "This view needs it: reload the page to open it. Charts not kept in a private space will need to be cast again.",
    "Cette vue en a besoin\u202f: rechargez la page pour l’ouvrir. Les thèmes qui ne sont pas gardés dans un espace privé devront être calculés à nouveau.",
  ],
  retryCompose: ["Try again", "Réessayer"],
  err_birth_date_missing: ["Add a birth date.", "Indiquez une date de naissance."],
  err_birth_month_unreadable: ["Couldn’t read the month in “{raw}”.", "Impossible de lire le mois dans «\u202f{raw}\u202f»."],
  err_birth_date_format: ["Use a date like 21/06/1995.", "Utilisez une date comme 21/06/1995."],
  err_birth_year_range: [
    "The birth year should be between 1 and 2399.",
    "L’année de naissance doit être entre 1 et 2399.",
  ],
  err_birth_date_invalid: ["That date doesn’t exist on the calendar.", "Cette date n’existe pas dans le calendrier."],
  err_birth_time_format: [
    "Use a time like 14:30, or tick “I don’t know the time”.",
    "Utilisez une heure comme 14:30, ou cochez «\u202fJe ne connais pas l’heure\u202f».",
  ],
  err_birth_time_missing: [
    "Add the birth time, or tick “I don’t know the time”.",
    "Indiquez l’heure de naissance, ou cochez «\u202fJe ne connais pas l’heure\u202f».",
  ],
  err_birth_time_invalid: ["That time isn’t valid.", "Cette heure n’est pas valide."],
  err_birth_place_missing: ["Choose a birthplace from the list.", "Choisissez un lieu de naissance dans la liste."],
  err_chart_houses_failed: [
    "Houses couldn’t be calculated for this moment. Try another house system.",
    "Les maisons n’ont pas pu être calculées pour ce moment. Essayez un autre système.",
  ],
  err_chart_moment_invalid: [
    "That moment couldn’t be read. Check the date and time.",
    "Ce moment n’a pas pu être interprété. Vérifiez la date et l’heure.",
  ],
  err_tz_invalid: [
    "That time zone (“{raw}”) isn’t recognised. Choose one in the birth options.",
    "Ce fuseau horaire («\u202f{raw}\u202f») n’est pas reconnu. Choisissez-en un dans les options de naissance.",
  ],
  err_tz_unknown: [
    "The time zone “{raw}” isn’t in the time zone database. Choose one in the birth options.",
    "Le fuseau «\u202f{raw}\u202f» n’existe pas dans la base des fuseaux horaires. Choisissez-en un dans les options de naissance.",
  ],
  err_timing_window_invalid: [
    "That period couldn’t be read. Choose another date.",
    "Cette période n’a pas pu être lue. Choisissez une autre date.",
  ],
  err_timing_window_long: ["Choose a period of a year or less.", "Choisissez une période d’un an au plus."],
  err_auth_credentials: [
    "That email and password don’t match.",
    "Cet e-mail et ce mot de passe ne correspondent pas.",
  ],
  err_auth_exists: [
    "An account already uses this email. Sign in instead.",
    "Un compte utilise déjà cet e-mail. Connectez-vous plutôt.",
  ],
  err_auth_password_short: [
    "Use a password of at least 8 characters.",
    "Choisissez un mot de passe d’au moins 8 caractères.",
  ],
  err_auth_email_invalid: ["That email address doesn’t look right.", "Cette adresse e-mail semble incorrecte."],
  err_auth_failed: ["Sign-in didn’t work. Try again.", "La connexion a échoué. Réessayez."],
  err_auth_incomplete: ["Sign-in didn’t finish. Try again.", "La connexion n’a pas abouti. Réessayez."],
  err_auth_popup: [
    "Your browser blocked the sign-in window. Allow pop-ups for this site and try again.",
    "Votre navigateur a bloqué la fenêtre de connexion. Autorisez les fenêtres pour ce site et réessayez.",
  ],
  err_auth_cancelled: [
    "The sign-in window closed before finishing.",
    "La fenêtre de connexion s’est fermée avant la fin.",
  ],
  err_auth_unavailable: [
    "That sign-in method isn’t available. Try email instead.",
    "Cette méthode de connexion n’est pas disponible. Essayez l’e-mail.",
  ],
  err_auth_redirect: [
    "Sign-in couldn’t come back to this page. Close extra tabs and try again.",
    "La connexion n’a pas pu revenir sur cette page. Fermez les autres onglets et réessayez.",
  ],
  err_net_offline: [
    "You’re offline: calculating needs the internet. Check the connection and try again.",
    "Vous êtes hors ligne\u202f: le calcul a besoin d’internet. Vérifiez la connexion et réessayez.",
  ],
  err_net_unreachable: [
    "Ulune’s server couldn’t be reached. Check the connection and try again.",
    "Le serveur d’Ulune est injoignable. Vérifiez la connexion et réessayez.",
  ],
  err_net_timeout: [
    "Ulune’s server took too long to answer. Try again in a moment.",
    "Le serveur d’Ulune a mis trop de temps à répondre. Réessayez dans un instant.",
  ],
  err_input_range: [
    "Ulune can’t calculate this entry. Check the date, the time and the place.",
    "Ulune ne peut pas calculer cette saisie. Vérifiez la date, l’heure et le lieu.",
  ],
  appErrorTitle: ["Something went wrong", "Une erreur est survenue"],
  appErrorBody: [
    "Ulune ran into an error it didn’t expect. Reloading the page usually fixes it; your saved charts are safe on this device.",
    "Ulune a rencontré une erreur imprévue. Recharger la page suffit en général\u202f; vos thèmes enregistrés restent à l’abri sur cet appareil.",
  ],
  appErrorReload: ["Reload the page", "Recharger la page"],
  appErrorDetails: ["Technical details", "Détails techniques"],
  errorSlotBody: [
    "Something in this view failed. Try again, or reload the page.",
    "Quelque chose a échoué dans cette vue. Réessayez, ou rechargez la page.",
  ],
  reportProblem: ["Report a problem", "Signaler un problème"],
  reportProblemLead: [
    "A wrong position, a bug, a word out of place?",
    "Une position fausse, un bug, un mot de travers\u202f?",
  ],
  reportMailSubject: ["Ulune {version}: a problem", "Ulune {version}\u202f: un problème"],
  reportMailBody: [
    "What happened, on which page, and what you expected:",
    "Ce qui s’est passé, sur quelle page, et ce que vous attendiez\u202f:",
  ],
  err_place_missing: [
    "Add a birthplace — a city name is enough.",
    "Indiquez un lieu de naissance — un nom de ville suffit.",
  ],
  err_place_lookup: [
    "Couldn’t look up the place. Try again, or paste coordinates.",
    "La recherche du lieu a échoué. Réessayez, ou collez des coordonnées.",
  ],
  err_place_notfound: [
    "Couldn’t find “{raw}”. Try another city, or paste coordinates.",
    "Impossible de trouver «\u202f{raw}\u202f». Essayez une autre ville, ou collez des coordonnées.",
  ],
} as const satisfies Record<string, readonly [string, string]>;
