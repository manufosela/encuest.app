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
    type: surveyData.type || 'survey', // 'survey' or 'contest'
    createdAt: Date.now(),
    activeQuestionId: null,
    votingEnabled: false,
    // Contest specific fields
    ...(surveyData.type === 'contest' && {
      currentQuestionIndex: 0,
      contestStarted: false,
      contestFinished: false,
      questionStartTime: null
    })
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

// ===== CONTEST OPERATIONS =====

// Contest question operations
export const addContestQuestion = async (surveyId, questionData) => {
  const questionsRef = ref(database, `surveys/${surveyId}/questions`);
  const newQuestionRef = push(questionsRef);
  await set(newQuestionRef, {
    ...questionData,
    correctAnswers: questionData.correctAnswers || [], // Array of correct option indices
    timeLimit: questionData.timeLimit || 30, // Seconds
    points: questionData.points || 100, // Base points for correct answer
    responses: {} // User responses with timestamps
  });
  return newQuestionRef.key;
};

// Contest control operations
export const startContest = async (surveyId) => {
  await updateSurvey(surveyId, {
    contestStarted: true,
    contestFinished: false,
    currentQuestionIndex: 0,
    questionStartTime: Date.now()
  });
};

export const nextContestQuestion = async (surveyId) => {
  const survey = await getSurvey(surveyId);
  const questionKeys = Object.keys(survey.questions || {});
  const nextIndex = (survey.currentQuestionIndex || 0) + 1;

  if (nextIndex >= questionKeys.length) {
    // Contest finished
    await finishContest(surveyId);
  } else {
    await updateSurvey(surveyId, {
      currentQuestionIndex: nextIndex,
      questionStartTime: Date.now(),
      activeQuestionId: questionKeys[nextIndex]
    });
  }
};

export const finishContest = async (surveyId) => {
  await updateSurvey(surveyId, {
    contestFinished: true,
    activeQuestionId: null,
    votingEnabled: false,
    questionStartTime: null
  });

  // Calculate final rankings
  const rankings = await calculateFinalRankings(surveyId);

  // Set rankings in database
  const rankingsRef = ref(database, `contests/${surveyId}/finalRankings`);
  await set(rankingsRef, rankings);

  // Send notifications to top 3
  await sendContestNotifications(surveyId, rankings);

  return rankings;
};

// Contest response operations
export const submitContestResponse = async (surveyId, questionId, optionIndex, userId) => {
  const responseTime = Date.now();
  const responseRef = ref(database, `surveys/${surveyId}/questions/${questionId}/responses/${userId}`);

  await set(responseRef, {
    optionIndex,
    responseTime,
    submitted: true
  });

  // Calculate points for this response
  const points = await calculateResponsePoints(surveyId, questionId, userId, responseTime);

  // Update user's total score
  const userScoreRef = ref(database, `contests/${surveyId}/scores/${userId}`);
  const currentScore = await get(userScoreRef);
  const newScore = (currentScore.val() || 0) + points;
  await set(userScoreRef, newScore);

  return { points, totalScore: newScore };
};

// Calculate points based on correctness and speed
export const calculateResponsePoints = async (surveyId, questionId, userId, responseTime) => {
  const survey = await getSurvey(surveyId);
  const question = survey.questions[questionId];
  const userResponse = question.responses[userId];

  if (!userResponse) return 0;

  // Check if answer is correct
  const isCorrect = question.correctAnswers.includes(userResponse.optionIndex);
  if (!isCorrect) return 0;

  // Calculate speed bonus
  const timeTaken = responseTime - survey.questionStartTime;
  const timeLimit = question.timeLimit * 1000; // Convert to milliseconds
  const speedMultiplier = Math.max(0.1, (timeLimit - timeTaken) / timeLimit);

  return Math.round(question.points * speedMultiplier);
};

// Get real-time contest rankings
export const listenToContestRankings = (surveyId, callback) => {
  const scoresRef = ref(database, `contests/${surveyId}/scores`);
  const unsubscribe = onValue(scoresRef, (snapshot) => {
    const scores = snapshot.val() || {};

    // Convert to rankings array
    const rankings = Object.entries(scores)
      .map(([userId, score]) => ({ userId, score }))
      .sort((a, b) => b.score - a.score);

    callback(rankings);
  });
  return unsubscribe;
};

// Calculate final rankings
export const calculateFinalRankings = async (surveyId) => {
  const scoresRef = ref(database, `contests/${surveyId}/scores`);
  const snapshot = await get(scoresRef);
  const scores = snapshot.val() || {};

  return Object.entries(scores)
    .map(([userId, score]) => ({ userId, score }))
    .sort((a, b) => b.score - a.score)
    .map((entry, index) => ({ ...entry, position: index + 1 }));
};

// Send notifications to contest winners
export const sendContestNotifications = async (surveyId, rankings) => {
  const topThree = rankings.slice(0, 3);

  for (let i = 0; i < topThree.length; i++) {
    const { userId, score, position } = topThree[i];
    const messages = ['🥇 ¡Primer lugar!', '🥈 ¡Segundo lugar!', '🥉 ¡Tercer lugar!'];

    const notificationRef = ref(database, `contestWinners/${userId}`);
    await set(notificationRef, {
      surveyId,
      position,
      score,
      message: messages[i],
      timestamp: Date.now()
    });
  }
};

// Listen to contest winner notifications
export const listenToContestWinnerNotification = (userId, callback) => {
  const notificationRef = ref(database, `contestWinners/${userId}`);
  const unsubscribe = onValue(notificationRef, (snapshot) => {
    callback(snapshot.val());
  });
  return unsubscribe;
};

// Clear contest winner notification
export const clearContestWinnerNotification = async (userId) => {
  const notificationRef = ref(database, `contestWinners/${userId}`);
  await remove(notificationRef);
};