import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC6X-S_3ooppR7Hs5bJJEqskG4BII9lrlQ",
  authDomain: "pagosmdq-d750e.firebaseapp.com",
  projectId: "pagosmdq-d750e",
  storageBucket: "pagosmdq-d750e.firebasestorage.app",
  messagingSenderId: "563587416853",
  appId: "1:563587416853:web:6a3ba2e8a15c156d3edf1c",
  measurementId: "G-JD9CEMJQRL"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);