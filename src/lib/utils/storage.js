const STORAGE_PREFIX = 'encuestapp_';

export const storage = {
  setUserId: (userId) => {
    localStorage.setItem(`${STORAGE_PREFIX}userId`, userId);
  },
  
  getUserId: () => {
    return localStorage.getItem(`${STORAGE_PREFIX}userId`);
  },
  
  generateUserId: () => {
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    storage.setUserId(userId);
    return userId;
  },
  
  getOrCreateUserId: () => {
    let userId = storage.getUserId();
    if (!userId) {
      userId = storage.generateUserId();
    }
    return userId;
  },
  
  hasVoted: (surveyId, questionId) => {
    const key = `${STORAGE_PREFIX}voted_${surveyId}_${questionId}`;
    return localStorage.getItem(key) === 'true';
  },
  
  setVoted: (surveyId, questionId) => {
    const key = `${STORAGE_PREFIX}voted_${surveyId}_${questionId}`;
    localStorage.setItem(key, 'true');
  }
};