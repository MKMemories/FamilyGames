import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, onValue, update, push, remove, serverTimestamp } from "firebase/database";

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
export { set, get, onValue, update, push, remove, serverTimestamp };
