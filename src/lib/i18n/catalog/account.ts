/** account: [English, French]. */
export const account = {
  saveCustom: ["Save view", "Enregistrer la vue"],
  dataTitle: ["Your data", "Vos données"],
  dataErased: [
    "Everything Ulune kept on this device is erased.",
    "Tout ce qu’Ulune gardait sur cet appareil est effacé.",
  ],
  offlineOfferTitle: ["Keep Ulune on this device?", "Garder Ulune sur cet appareil\u202f?"],
  offlineOfferBody: [
    "It then opens without waiting, and your saved charts and the calendar months you’ve opened work even without a connection. Only the app’s own files and the sky of those dates are kept; nothing about you is sent anywhere.",
    "Il s’ouvre alors sans attendre, et vos thèmes enregistrés et les mois du calendrier déjà ouverts marchent même sans connexion. Seuls les fichiers de l’app et le ciel de ces dates sont gardés\u202f; rien de vous n’est envoyé nulle part.",
  ],
  offlineOfferYes: ["Keep it", "Le garder"],
  offlineOfferNo: ["No thanks", "Non merci"],
  offlineOn: ["Ulune is kept on this device", "Ulune est gardé sur cet appareil"],
} as const satisfies Record<string, readonly [string, string]>;
