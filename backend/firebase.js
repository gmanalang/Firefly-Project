// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyC_JwUoP-YbSM8iDEbog-cEQ9Wj8Ry1VNM",
  authDomain: "updown-da1af.firebaseapp.com",
  projectId: "updown-da1af",
  storageBucket: "updown-da1af.appspot.com",
  messagingSenderId: "563165698713",
  appId: "1:563165698713:web:f0297036c4719dea577608",
  measurementId: "G-H4H2NP8PXK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const storage = getStorage(app);
