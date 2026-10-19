/** Notifica in memoria i soli ripristini backup riusciti, senza alterare AsyncStorage. */
let revisione = 0;
export const revisioneRipristinoBackup = (): number => revisione;
export const segnalaRipristinoBackup = (): void => { revisione += 1; };
