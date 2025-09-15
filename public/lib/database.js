import { ref, set, get, onValue, push, update, remove, off } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js';
import { database } from './firebase-config.js';

// Generate a unique 6-character code
const generateCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Survey operations
export const createSurvey = async (surveyData) => {
  const surveysRef = ref(database, 'surveys');
  const newSurveyRef = push(surveysRef);
  
  // Generate unique code
  let code = generateCode();
  const allSurveys = await getAllSurveys();
  const existingCodes = Object.values(allSurveys).map(s => s.code).filter(Boolean);
  
  // Make sure code is unique
  while (existingCodes.includes(code)) {
    code = generateCode();
  }
  
  await set(newSurveyRef, {
    ...surveyData,
    code: code,
    createdAt: Date.now(),
    activeQuestionId: null,
    votingEnabled: false
  });
  return newSurveyRef.key;
};

export const getSurvey = async (surveyId) => {
  const surveyRef = ref(database, `surveys/${surveyId}`);
  const snapshot = await get(surveyRef);
  return snapshot.val();
};

export const getAllSurveys = async () => {
  const surveysRef = ref(database, 'surveys');
  const snapshot = await get(surveysRef);
  return snapshot.val() || {};
};

export const updateSurvey = async (surveyId, updates) => {
  const surveyRef = ref(database, `surveys/${surveyId}`);
  await update(surveyRef, updates);
};

export const deleteSurvey = async (surveyId) => {
  const surveyRef = ref(database, `surveys/${surveyId}`);
  await remove(surveyRef);
};

// Question operations
export const addQuestion = async (surveyId, questionData) => {
  const questionsRef = ref(database, `surveys/${surveyId}/questions`);
  const newQuestionRef = push(questionsRef);
  await set(newQuestionRef, {
    ...questionData,
    votes: {}
  });
  return newQuestionRef.key;
};

export const updateQuestion = async (surveyId, questionId, updates) => {
  const questionRef = ref(database, `surveys/${surveyId}/questions/${questionId}`);
  await update(questionRef, updates);
};

export const deleteQuestion = async (surveyId, questionId) => {
  const questionRef = ref(database, `surveys/${surveyId}/questions/${questionId}`);
  await remove(questionRef);
};

// Control operations
export const setActiveQuestion = async (surveyId, questionId) => {
  await updateSurvey(surveyId, { 
    activeQuestionId: questionId,
    votingEnabled: true 
  });
};

export const toggleVoting = async (surveyId, enabled) => {
  await updateSurvey(surveyId, { votingEnabled: enabled });
};

export const deactivateQuestion = async (surveyId) => {
  await updateSurvey(surveyId, { 
    activeQuestionId: null,
    votingEnabled: false 
  });
};

// Voting operations
export const submitVote = async (surveyId, questionId, optionIndex, userId) => {
  const voteRef = ref(database, `surveys/${surveyId}/questions/${questionId}/votes/${userId}`);
  await set(voteRef, optionIndex);
};

export const hasUserVoted = async (surveyId, questionId, userId) => {
  const voteRef = ref(database, `surveys/${surveyId}/questions/${questionId}/votes/${userId}`);
  const snapshot = await get(voteRef);
  return snapshot.exists();
};

export const getUserVote = async (surveyId, questionId, userId) => {
  const voteRef = ref(database, `surveys/${surveyId}/questions/${questionId}/votes/${userId}`);
  const snapshot = await get(voteRef);
  return snapshot.val(); // Returns the option index or null
};

export const getQuestionWinner = async (surveyId, questionId) => {
  const winnerRef = ref(database, `surveys/${surveyId}/questions/${questionId}/winner`);
  const snapshot = await get(winnerRef);
  return snapshot.val();
};

// Real-time listeners
export const listenToSurvey = (surveyId, callback) => {
  const surveyRef = ref(database, `surveys/${surveyId}`);
  const unsubscribe = onValue(surveyRef, (snapshot) => {
    callback(snapshot.val());
  });
  return unsubscribe;
};

export const listenToActiveQuestion = (surveyId, callback) => {
  const surveyRef = ref(database, `surveys/${surveyId}`);
  const unsubscribe = onValue(surveyRef, (snapshot) => {
    const survey = snapshot.val();
    if (survey && survey.activeQuestionId && survey.questions) {
      const activeQuestion = survey.questions[survey.activeQuestionId];
      callback({
        ...activeQuestion,
        id: survey.activeQuestionId,
        votingEnabled: survey.votingEnabled
      });
    } else {
      callback(null);
    }
  });
  return unsubscribe;
};

export const listenToVotes = (surveyId, questionId, callback) => {
  const votesRef = ref(database, `surveys/${surveyId}/questions/${questionId}/votes`);
  const unsubscribe = onValue(votesRef, (snapshot) => {
    const votes = snapshot.val() || {};
    const voteCounts = {};
    
    // Count votes for each option
    Object.values(votes).forEach(optionIndex => {
      voteCounts[optionIndex] = (voteCounts[optionIndex] || 0) + 1;
    });
    
    // Always call callback, even with empty votes
    callback(voteCounts);
  });
  return unsubscribe;
};

// Raffle/Winner operations
export const getVotersByOption = async (surveyId, questionId, optionIndex) => {
  const votesRef = ref(database, `surveys/${surveyId}/questions/${questionId}/votes`);
  const snapshot = await get(votesRef);
  const votes = snapshot.val() || {};
  
  return Object.entries(votes)
    .filter(([userId, vote]) => vote === optionIndex)
    .map(([userId]) => userId);
};

export const selectRandomWinner = async (surveyId, questionId, optionIndex) => {
  const voters = await getVotersByOption(surveyId, questionId, optionIndex);
  
  if (voters.length === 0) {
    throw new Error('No hay votos para esta opción');
  }
  
  const randomIndex = Math.floor(Math.random() * voters.length);
  const winnerId = voters[randomIndex];
  
  // Set winner in database
  const winnerRef = ref(database, `surveys/${surveyId}/questions/${questionId}/winner`);
  await set(winnerRef, {
    userId: winnerId,
    optionIndex: optionIndex,
    selectedAt: Date.now()
  });
  
  // Set winner notification for user
  const notificationRef = ref(database, `winners/${winnerId}`);
  await set(notificationRef, {
    surveyId: surveyId,
    questionId: questionId,
    optionIndex: optionIndex,
    selectedAt: Date.now(),
    message: '¡Felicidades! Has sido seleccionado como ganador.'
  });
  
  return { winnerId, totalVoters: voters.length };
};

export const clearWinner = async (surveyId, questionId) => {
  // Get the current winner before removing
  const winnerRef = ref(database, `surveys/${surveyId}/questions/${questionId}/winner`);
  const winnerSnapshot = await get(winnerRef);
  const winner = winnerSnapshot.val();
  
  // Remove winner from question
  await remove(winnerRef);
  
  // Also clear winner notification if exists
  if (winner && winner.userId) {
    const notificationRef = ref(database, `winners/${winner.userId}`);
    await remove(notificationRef);
  }
};

// Listen to winner notifications for a user
export const listenToWinnerNotification = (userId, callback) => {
  const notificationRef = ref(database, `winners/${userId}`);
  const unsubscribe = onValue(notificationRef, (snapshot) => {
    callback(snapshot.val());
  });
  return () => off(notificationRef, 'value', unsubscribe);
};

// Clear winner notification
export const clearWinnerNotification = async (userId) => {
  const notificationRef = ref(database, `winners/${userId}`);
  await remove(notificationRef);
};

// Clear all winner notifications (for manual cleanup)
export const clearAllWinnerNotifications = async () => {
  const winnersRef = ref(database, 'winners');
  await remove(winnersRef);
  console.log('All winner notifications cleared');
};

// Reset votes for a specific question
export const resetQuestionVotes = async (surveyId, questionId) => {
  try {
    // Get the current winner before removing
    const winnerRef = ref(database, `surveys/${surveyId}/questions/${questionId}/winner`);
    const winnerSnapshot = await get(winnerRef);
    const winner = winnerSnapshot.val();
    
    // Remove all votes
    const votesRef = ref(database, `surveys/${surveyId}/questions/${questionId}/votes`);
    await remove(votesRef);
    
    // Remove winner
    await remove(winnerRef);
    
    // Clear winner notification if exists
    if (winner && winner.userId) {
      const notificationRef = ref(database, `winners/${winner.userId}`);
      await remove(notificationRef);
    }
    
    console.log('Vote reset completed successfully');
  } catch (error) {
    console.error('Error in resetQuestionVotes:', error);
    throw error;
  }
};