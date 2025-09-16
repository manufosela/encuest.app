import { ref, get, set } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js';
import { database, auth } from '../../../public/lib/firebase-config.js';

// Convert email to Firebase key (replace . with ,)
const emailToKey = (email) => email.replace(/\./g, ',');

// Check if current user is admin
export const isUserAdmin = async (userEmail = null) => {
  try {
    const email = userEmail || auth.currentUser?.email;
    console.log('isUserAdmin - checking email:', email);
    
    if (!email) {
      console.log('isUserAdmin - no email provided');
      return false;
    }
    
    const emailKey = emailToKey(email);
    console.log('isUserAdmin - email key:', emailKey);
    const adminRef = ref(database, `admins/${emailKey}`);
    const snapshot = await get(adminRef);
    
    const exists = snapshot.exists();
    console.log('isUserAdmin - snapshot exists:', exists);
    if (exists) {
      console.log('isUserAdmin - admin data:', snapshot.val());
    }
    
    return exists;
  } catch (error) {
    console.error('isUserAdmin - error:', error);
    return false;
  }
};

// Get admin info
export const getAdminInfo = async (userEmail = null) => {
  try {
    const email = userEmail || auth.currentUser?.email;
    if (!email) return null;
    
    const emailKey = emailToKey(email);
    const adminRef = ref(database, `admins/${emailKey}`);
    const snapshot = await get(adminRef);
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error('Error getting admin info:', error);
    return null;
  }
};

// Add new admin (only superadmins can do this)
export const addAdmin = async (userEmail, userName, role = 'admin') => {
  try {
    // First check if current user is superadmin
    const currentAdminInfo = await getAdminInfo();
    if (!currentAdminInfo || currentAdminInfo.role !== 'superadmin') {
      throw new Error('Solo los superadministradores pueden añadir nuevos admins');
    }
    
    const emailKey = emailToKey(userEmail);
    const adminRef = ref(database, `admins/${emailKey}`);
    await set(adminRef, {
      role: role,
      name: userName,
      addedAt: Date.now()
    });
  } catch (error) {
    console.error('Error adding admin:', error);
    throw error;
  }
};

// Remove admin (only superadmins can do this)
export const removeAdmin = async (userEmail) => {
  try {
    const currentAdminInfo = await getAdminInfo();
    if (!currentAdminInfo || currentAdminInfo.role !== 'superadmin') {
      throw new Error('Solo los superadministradores pueden remover admins');
    }
    
    const emailKey = emailToKey(userEmail);
    const adminRef = ref(database, `admins/${emailKey}`);
    await set(adminRef, null);
  } catch (error) {
    console.error('Error removing admin:', error);
    throw error;
  }
};

// Get all admins (for admin management)
export const getAllAdmins = async () => {
  try {
    const adminsRef = ref(database, 'admins');
    const snapshot = await get(adminsRef);
    return snapshot.exists() ? snapshot.val() : {};
  } catch (error) {
    console.error('Error getting all admins:', error);
    return {};
  }
};