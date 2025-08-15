// src/handlers/scheduler.js

import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously } from 'firebase/auth';
import cron from 'node-cron';

// Use a simple in-memory map to store the cron jobs.
const cronJobs = new Map();

/**
 * Initializes Firebase and sets up the scheduler.
 * @param {import('baileys-x').WASocket} sock The bot's socket instance.
 * @param {string} ownerJid The JID of the bot owner.
 */
export const startScheduler = async (sock, ownerJid) => {
    // Check if Firebase config is available.
    if (typeof __firebase_config === 'undefined' || typeof __initial_auth_token === 'undefined' || typeof __app_id === 'undefined') {
        console.error("Firebase config is missing. The scheduler will not be persistent.");
        return;
    }

    const firebaseConfig = JSON.parse(__firebase_config);
    const initialAuthToken = __initial_auth_token;
    const appId = __app_id;

    // Initialize Firebase and Firestore.
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    // Sign in to Firebase.
    try {
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            await signInAnonymously(auth);
        }
    } catch (error) {
        console.error("Firebase authentication failed:", error);
        return;
    }

    console.log("[INFO] Firestore and scheduler initialized successfully.");

    /**
     * Loads all scheduled tasks from Firestore and sets up cron jobs for them.
     */
    const loadTasks = async () => {
        // Clear all existing cron jobs to prevent duplicates.
        cronJobs.forEach(job => job.stop());
        cronJobs.clear();

        try {
            const userId = auth.currentUser.uid;
            const collectionPath = `artifacts/${appId}/users/${userId}/schedules`;
            const querySnapshot = await getDocs(collection(db, collectionPath));
            
            querySnapshot.forEach(doc => {
                const task = doc.data();
                task.id = doc.id;
                setupCronJob(sock, ownerJid, task);
            });
            console.log(`[INFO] Loaded ${querySnapshot.size} scheduled tasks from Firestore.`);
        } catch (error) {
            console.error("Error loading scheduled tasks from Firestore:", error);
        }
    };

    /**
     * Creates and starts a new cron job.
     * @param {import('baileys-x').WASocket} sock
     * @param {string} ownerJid
     * @param {object} task The task object from Firestore.
     */
    const setupCronJob = (sock, ownerJid, task) => {
        // Stop any existing job with the same ID before creating a new one.
        if (cronJobs.has(task.id)) {
            cronJobs.get(task.id).stop();
        }

        try {
            const job = cron.schedule(task.cron, () => {
                const message = `🔔 *Scheduler Alert*\nThis is a scheduled message from your bot.\n\n*Task ID:* ${task.id}\n*Message:* ${task.message}`;
                sock.sendMessage(ownerJid, { text: message });
            });
            cronJobs.set(task.id, job);
            console.log(`[INFO] Scheduled job '${task.id}' for '${task.message}' with cron: '${task.cron}'`);
        } catch (error) {
            console.error(`Error scheduling cron job for task ID ${task.id}:`, error);
        }
    };

    /**
     * Adds a new scheduled task to Firestore and starts its cron job.
     * @param {import('baileys-x').WASocket} sock
     * @param {string} ownerJid
     * @param {string} cronString The cron expression.
     * @param {string} message The message to send.
     * @returns {Promise<string>} The ID of the newly created task.
     */
    const addTask = async (sock, ownerJid, cronString, message) => {
        const userId = auth.currentUser.uid;
        const collectionPath = `artifacts/${appId}/users/${userId}/schedules`;
        const newTask = { cron: cronString, message };
        
        try {
            const docRef = await addDoc(collection(db, collectionPath), newTask);
            newTask.id = docRef.id;
            setupCronJob(sock, ownerJid, newTask);
            return docRef.id;
        } catch (error) {
            console.error("Error adding scheduled task:", error);
            return null;
        }
    };

    /**
     * Deletes a scheduled task from Firestore and stops its cron job.
     * @param {string} taskId The ID of the task to delete.
     * @returns {Promise<boolean>} True if the task was deleted successfully.
     */
    const deleteTask = async (taskId) => {
        if (cronJobs.has(taskId)) {
            cronJobs.get(taskId).stop();
            cronJobs.delete(taskId);
        }

        const userId = auth.currentUser.uid;
        const collectionPath = `artifacts/${appId}/users/${userId}/schedules`;
        try {
            await deleteDoc(doc(db, collectionPath, taskId));
            return true;
        } catch (error) {
            console.error("Error deleting scheduled task:", error);
            return false;
        }
    };

    /**
     * Gets all scheduled tasks for the current user.
     * @returns {Promise<object[]>} An array of task objects.
     */
    const getTasks = async () => {
        const userId = auth.currentUser.uid;
        const collectionPath = `artifacts/${appId}/users/${userId}/schedules`;
        const tasks = [];
        try {
            const querySnapshot = await getDocs(collection(db, collectionPath));
            querySnapshot.forEach(doc => {
                tasks.push({ id: doc.id, ...doc.data() });
            });
            return tasks;
        } catch (error) {
            console.error("Error getting scheduled tasks:", error);
            return [];
        }
    };

    // Expose the management functions.
    return {
        addTask,
        deleteTask,
        getTasks,
        loadTasks
    };
};
