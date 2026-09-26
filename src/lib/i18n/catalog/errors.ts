/** errors: [English, French]. */
export const errors = {
  couldNotCast: ["Could not cast the chart.", "Impossible de calculer le thème."],
  couldNotCastProgressions: ["Could not calculate this progression.", "Impossible de calculer cette progression."],
  couldNotCastSky: ["Could not calculate the current sky.", "Impossible de calculer le ciel du moment."],
  couldNotCompose: [
    "Couldn’t write the reading. Try again in a moment.",
    "La lecture n’a pas pu être rédigée. Réessayez dans un instant.",
  ],
  couldNotFind: [
    "Could not find “{query}”. Try another city, or paste coordinates.",
    "Impossible de trouver « {query} ». Essayez une autre ville, ou collez des coordonnées.",
  ],
  couldNotSaveLocal: [
    "Could not save this chart in the browser. Storage may be full or blocked.",
    "Impossible d’enregistrer ce thème dans le navigateur. Le stockage est peut-être plein ou bloqué.",
  ],
  errorSlotRetry: ["Try again", "Réessayer"],
  errorSlotTitle: ["This page didn’t load.", "Cette page n’a pas chargé."],
  retryCompose: ["Try again", "Réessayer"],
  err_birth_date_missing: ["Add a birth date.", "Indiquez une date de naissance."],
  err_birth_month_unreadable: ["Couldn’t read the month in “{raw}”.", "Impossible de lire le mois dans « {raw} »."],
  err_birth_date_format: ["Use a date like 21/06/1995.", "Utilisez une date comme 21/06/1995."],
  err_birth_year_range: [
    "The birth year should be between 1 and 2399.",
    "L’année de naissance doit être entre 1 et 2399.",
  ],
  err_birth_date_invalid: ["That date doesn’t exist on the calendar.", "Cette date n’existe pas dans le calendrier."],
  err_birth_time_format: [
    "Use a time like 14:30, or tick “I don’t know the time”.",
    "Utilisez une heure comme 14:30, ou cochez « Je ne connais pas l’heure ».",
  ],
  err_birth_time_invalid: ["That time isn’t valid.", "Cette heure n’est pas valide."],
  err_birth_place_missing: ["Choose a birth place from the list.", "Choisissez un lieu de naissance dans la liste."],
  err_chart_houses_failed: [
    "Houses couldn’t be calculated for this moment. Try another house system.",
    "Les maisons n’ont pas pu être calculées pour ce moment. Essayez un autre système.",
  ],
  err_chart_moment_invalid: [
    "That moment couldn’t be read. Check the date and time.",
    "Ce moment est illisible. Vérifiez la date et l’heure.",
  ],
  err_tz_invalid: [
    "That time zone (“{raw}”) isn’t recognised. Choose one in the birth options.",
    "Ce fuseau horaire (« {raw} ») n’est pas reconnu. Choisissez-en un dans les options de naissance.",
  ],
  err_tz_unknown: [
    "The time zone “{raw}” isn’t in the time zone database.",
    "Le fuseau « {raw} » n’existe pas dans la base des fuseaux horaires.",
  ],
  err_timing_window_invalid: ["That period couldn’t be read.", "Cette période est illisible."],
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
} as const satisfies Record<string, readonly [string, string]>;
