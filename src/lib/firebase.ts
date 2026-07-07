import { initializeApp } from "firebase/app";
import { getDatabase, ref, set as rawSet, get, onValue, update as rawUpdate, push, remove, serverTimestamp, onDisconnect } from "firebase/database";
import { stripUndefined } from "./fbClean";

const firebaseConfig = {
  apiKey: "AIzaSyDrZuvQupxvIAOL6mNo5p0CMiI2jLNFjvI",
  authDomain: "khelij-hub.firebaseapp.com",
  databaseURL: "https://khelij-hub-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "khelij-hub",
  storageBucket: "khelij-hub.firebasestorage.app",
  messagingSenderId: "578252461941",
  appId: "1:578252461941:web:4d3a24caa96da3649de53c"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

export const dbRef = (path: string) => ref(db, path);
/** Programme la suppression d'un nœud à la déconnexion (présence). */
export function removeOnDisconnect(path: string) {
  try { onDisconnect(ref(db, path)).remove(); } catch { /* ignore */ }
}
export function cancelOnDisconnect(path: string) {
  try { onDisconnect(ref(db, path)).cancel(); } catch { /* ignore */ }
}
/* Firebase RTDB REFUSE toute valeur `undefined` (contrairement à `null`,
   accepté et interprété comme suppression). Une seule propriété `undefined`
   fait échouer toute l'écriture. On les retire donc systématiquement — comme
   le fait déjà notre mock de test — pour qu'aucun jeu ne puisse crasher ainsi. */
export const set = (r: ReturnType<typeof ref>, val: unknown) => rawSet(r, stripUndefined(val));
export const update = (r: ReturnType<typeof ref>, data: object) => rawUpdate(r, stripUndefined(data) as object);
export { get, onValue, push, remove, serverTimestamp };
