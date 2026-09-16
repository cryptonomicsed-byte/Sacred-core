import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, collection, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { useStore } from '../store';
import { BrandDNA, Campaign, LeadProfile, VideoJob, Agent } from '../types';

export const FirebaseSync = () => {
  const { setAuth, setAuthReady, userId } = useStore();

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuth(user.uid);
      } else {
        setAuth(null);
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, [setAuth, setAuthReady]);

  // 2. Firestore Listeners
  useEffect(() => {
    if (!userId) return;

    // --- User Document (tokens, tier, etc.) ---
    const userDocRef = doc(db, 'users', userId);
    const unsubUser = onSnapshot(userDocRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        useStore.setState({ 
          tokens: data.tokens ?? 0, 
          userTier: data.userTier ?? 'free',
          customGeminiKey: data.customGeminiKey ?? ''
        });
      } else {
        // Initialize user doc if it doesn't exist
        try {
          await setDoc(userDocRef, {
            tokens: 500,
            userTier: 'pro',
            customGeminiKey: ''
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `users/${userId}`);
        }
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${userId}`));

    // --- Brands ---
    const unsubBrands = onSnapshot(collection(db, 'users', userId, 'brands'), (snapshot) => {
      const brands = snapshot.docs.map(doc => doc.data() as BrandDNA);
      useStore.setState({ brands });
      // Set current brand if not set
      const state = useStore.getState();
      if (!state.currentBrand && brands.length > 0) {
        useStore.setState({ currentBrand: brands[0] });
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${userId}/brands`));

    // --- Campaigns ---
    const unsubCampaigns = onSnapshot(collection(db, 'users', userId, 'campaigns'), (snapshot) => {
      const campaigns = snapshot.docs.map(doc => doc.data() as Campaign);
      useStore.setState({ campaigns });
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${userId}/campaigns`));

    // --- Leads ---
    const unsubLeads = onSnapshot(collection(db, 'users', userId, 'leads'), (snapshot) => {
      const leads = snapshot.docs.map(doc => doc.data() as LeadProfile);
      useStore.setState({ leads });
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${userId}/leads`));

    // --- Video Jobs ---
    const unsubVideoJobs = onSnapshot(collection(db, 'users', userId, 'videoJobs'), (snapshot) => {
      const videoJobs = snapshot.docs.map(doc => doc.data() as VideoJob);
      useStore.setState({ videoJobs });
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${userId}/videoJobs`));

    // --- Agents ---
    const unsubAgents = onSnapshot(collection(db, 'users', userId, 'agents'), (snapshot) => {
      const agents = snapshot.docs.map(doc => doc.data() as Agent);
      useStore.setState({ agents });
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${userId}/agents`));

    return () => {
      unsubUser();
      unsubBrands();
      unsubCampaigns();
      unsubLeads();
      unsubVideoJobs();
      unsubAgents();
    };
  }, [userId]);

  return null;
};
