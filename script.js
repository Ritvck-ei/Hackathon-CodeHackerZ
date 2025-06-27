// static/script.js
alert("Script loaded!");
let currentTopicData = null; // Stores the data for the currently displayed topic
let currentExplanationForPractice = ""; // Stores the explanation text for practice context

// Practice Module State Variables
let currentPracticeQuestion = null; // Stores the currently asked question for practice
let currentPracticeQuestionCount = 0;
const MAX_PRACTICE_QUESTIONS = 6; // Limit the practice path to 6 questions
let practiceQuestionDifficultyLevels = ["memory", "conceptual", "applied"]; // Progression
let currentPracticeDifficultyIndex = 0; // Index for practiceQuestionDifficultyLevels
let lastPracticeQuestionCorrect = false; // Flag to track last answer correctness

// DOM Elements - Main Sections
const initialChoiceSection = document.getElementById("initial-choice-section");
const learningModuleSection = document.getElementById(
  "learning-module-section"
);
const practiceModuleSection = document.getElementById(
  "practice-module-section"
);

// DOM Elements - Learning Module
const learningContentDiv = document.getElementById("learning-content");
const explanationDiv = document.getElementById("explanation");
const examplesDiv = document.getElementById("examples");
const feedbackControlsDiv = document.querySelector(".feedback-controls");

// DOM Elements - Practice Module
const practiceQuestionsContentDiv = document.getElementById(
  "practice-questions-content"
);
const practiceQuestionTextElement = document.getElementById(
  "practice-question-text"
);
const practiceAnswerInput = document.getElementById("practice-answer-input");
const submitPracticeAnswerBtn = document.getElementById(
  "submit-practice-answer-btn"
);
const nextPracticeQuestionBtn = document.getElementById(
  "next-practice-question-btn"
);
const returnToPracticeTopicBtn = document.getElementById(
  "return-to-practice-topic-btn"
);
const practiceEvaluationFeedback = document.getElementById(
  "practice-evaluation-feedback"
);
const practiceQuestionCountDisplay = document.getElementById(
  "practice-question-count-display"
);

// Utility functions for section display
function showInitialChoice() {
  initialChoiceSection.style.display = "block";
  learningModuleSection.style.display = "none";
  practiceModuleSection.style.display = "none";
  hideLoading(); // Ensure loading indicator is hidden
  resetLearningAndPracticeStates(); // Reset all states
}

function showLearningModule() {
  initialChoiceSection.style.display = "none";
  learningModuleSection.style.display = "block";
  practiceModuleSection.style.display = "none";
  // Initial state for learning module
  learningContentDiv.style.display = "block";
  feedbackControlsDiv.style.display = "none"; // Initially hidden until topic loaded
  explanationDiv.innerHTML = "<h2>Select a topic to begin!</h2>";
  examplesDiv.innerHTML = "";
  resetLearningAndPracticeStates(); // Reset all states
}

function showPracticeModule() {
  initialChoiceSection.style.display = "none";
  learningModuleSection.style.display = "none";
  practiceModuleSection.style.display = "block";
  // Initial state for practice module
  practiceQuestionsContentDiv.style.display = "none"; // Hidden until topic loaded
  resetLearningAndPracticeStates(); // Reset all states
  returnToPracticeTopicSelection(); // Show topic selection initially
}

function resetLearningAndPracticeStates() {
  currentTopicData = null;
  currentExplanationForPractice = "";

  // Reset practice path state
  currentPracticeQuestion = null;
  currentPracticeQuestionCount = 0;
  currentPracticeDifficultyIndex = 0; // Start with 'memory' questions
  lastPracticeQuestionCorrect = false;
  practiceQuestionCountDisplay.textContent = "";
  practiceAnswerInput.value = "";
  practiceEvaluationFeedback.innerHTML = "";
  submitPracticeAnswerBtn.style.display = "inline-block";
  nextPracticeQuestionBtn.style.display = "none";
  returnToPracticeTopicBtn.style.display = "none";
}

/**
 * Loads learning content for the LEARNING MODULE from the Flask backend.
 * @param {string} topicId - The ID of the topic to load (e.g., 'photosynthesis').
 */
async function loadLearningTopic(topicId) {
  showLoading("Loading learning content...");
  try {
    const response = await fetch(`/learn/${topicId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    currentTopicData = await response.json(); // Store the fetched data
    displayLearningContent(currentTopicData);
    feedbackControlsDiv.style.display = "block"; // Show general feedback buttons
    hideLoading();
  } catch (error) {
    console.error("Error loading learning topic:", error);
    explanationDiv.innerHTML = `<p style="color: red; text-align: center;">Failed to load topic. Please check the console for details.</p>`;
    examplesDiv.innerHTML = "";
    feedbackControlsDiv.style.display = "none"; // Hide buttons on error
    hideLoading();
  }
}

/**
 * Displays the learning content (explanation and examples) on the page.
 * @param {object} data - The topic data to display.
 */
function displayLearningContent(data) {
  learningContentDiv.querySelector("h2").textContent = data.title;
  explanationDiv.innerHTML = `<p>${data.default_explanation}</p>`;
  // Store the initial explanation for consistent context for questions (if ever re-integrated or used in practice)
  currentExplanationForPractice = data.default_explanation;

  let examplesHtml = "";
  if (data.examples && data.examples.length > 0) {
    examplesHtml += "<h3>Examples:</h3><ul>";
    data.examples.forEach((example) => {
      examplesHtml += `<li>${example}</li>`;
    });
    examplesHtml += "</ul>";
  } else {
    examplesHtml += "<p>No specific examples provided for this topic yet.</p>";
  }
  examplesDiv.innerHTML = examplesHtml;
}

/**
 * Sends a request to the backend to adapt the current explanation based on user feedback.
 * This is for the LEARNING MODULE.
 * @param {string} feedbackType - The type of adaptation requested (e.g., 'simplify', 'more_examples').
 */
async function requestAdaptation(feedbackType) {
  if (!currentTopicData) {
    alert("Please select a topic first before requesting adaptation.");
    return;
  }

  const concept = currentTopicData.title;
  const currentExplanationElement = explanationDiv.querySelector("p");
  const explanationForAdaptation = currentExplanationElement
    ? currentExplanationElement.textContent
    : "";

  showLoading("Adapting content, please wait...");
  feedbackControlsDiv.style.display = "none";

  try {
    const response = await fetch("/adapt_explanation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        concept: concept,
        explanation: explanationForAdaptation,
        feedback_type: feedbackType,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    if (result.adapted_content) {
      explanationDiv.innerHTML = `<p class="adapted-explanation">${result.adapted_content}</p>`;
      // Update the stored explanation with the new adapted content for future use
      currentExplanationForPractice = result.adapted_content;

      if (feedbackType === "more_examples") {
        examplesDiv.innerHTML = `<h3>New Suggestions/Examples:</h3><p>${result.adapted_content}</p>`;
      }
    } else {
      alert("Could not get adapted content from AI.");
    }
  } catch (error) {
    console.error("Error adapting explanation:", error);
    alert(
      "Error adapting content. Please check the console for details and ensure your API key is correct."
    );
  } finally {
    hideLoading();
    feedbackControlsDiv.style.display = "block"; // Show buttons again
  }
}

// --- Practice Module Functions ---

/**
 * Loads the topic data for the PRACTICE MODULE and starts the question path.
 * @param {string} topicId - The ID of the topic to load (e.g., 'photosynthesis').
 */
async function loadPracticeTopic(topicId) {
  showLoading("Preparing practice questions...");
  resetPracticePathState(); // Reset state for new practice session

  try {
    const response = await fetch(`/learn/${topicId}`); // Reuse /learn endpoint to get topic data
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    currentTopicData = await response.json(); // Store the fetched data
    // For practice, we primarily need the topic's default explanation as context
    currentExplanationForPractice = currentTopicData.default_explanation;

    practiceQuestionsContentDiv.style.display = "block"; // Show question UI
    currentPracticeQuestionCount = 1; // Start with the first question

    await askNextPracticeQuestion(); // Ask the very first practice question
  } catch (error) {
    console.error("Error loading practice topic:", error);
    practiceQuestionsContentDiv.style.display = "none";
    alert(
      "Failed to load practice questions for this topic. Please try again."
    );
  } finally {
    hideLoading();
  }
}

/**
 * Resets the practice path state variables.
 */
function resetPracticePathState() {
  currentPracticeQuestion = null;
  currentPracticeQuestionCount = 0;
  currentPracticeDifficultyIndex = 0; // Start with 'memory' questions
  lastPracticeQuestionCorrect = false;
  practiceQuestionCountDisplay.textContent = "";
  practiceAnswerInput.value = "";
  practiceEvaluationFeedback.innerHTML = "";
  submitPracticeAnswerBtn.style.display = "inline-block";
  nextPracticeQuestionBtn.style.display = "none";
  returnToPracticeTopicBtn.style.display = "none";
}

/**
 * Determines the next practice question type and generates it.
 * This is the core adaptive logic for the practice path.
 */
async function askNextPracticeQuestion() {
  if (currentPracticeQuestionCount > MAX_PRACTICE_QUESTIONS) {
    // Practice path completed
    endPracticePath();
    return;
  }

  practiceQuestionCountDisplay.textContent = `(${currentPracticeQuestionCount}/${MAX_PRACTICE_QUESTIONS})`;
  practiceAnswerInput.value = ""; // Clear input for new question
  practiceEvaluationFeedback.innerHTML = ""; // Clear previous feedback
  submitPracticeAnswerBtn.style.display = "inline-block"; // Re-show submit button
  nextPracticeQuestionBtn.style.display = "none";
  returnToPracticeTopicBtn.style.display = "none"; // Only show after evaluation

  let questionTypeToAsk =
    practiceQuestionDifficultyLevels[currentPracticeDifficultyIndex];

  // Adaptive logic for question type:
  if (currentPracticeQuestionCount > 1) {
    // After the first question
    if (lastPracticeQuestionCorrect) {
      // If previous was correct, try to move to a harder type
      currentPracticeDifficultyIndex = Math.min(
        currentPracticeDifficultyIndex + 1,
        practiceQuestionDifficultyLevels.length - 1
      );
      questionTypeToAsk =
        practiceQuestionDifficultyLevels[currentPracticeDifficultyIndex];
    } else {
      // If previous was incorrect, either re-explain and stay at same level or go simpler
      // For now, let's just stay at the current difficulty level or go back to memory if struggled with conceptual/applied
      if (currentPracticeDifficultyIndex > 0) {
        // If not already at memory level
        currentPracticeDifficultyIndex = Math.max(
          currentPracticeDifficultyIndex - 1,
          0
        ); // Go back one level or stay at memory
      }
      questionTypeToAsk =
        practiceQuestionDifficultyLevels[currentPracticeDifficultyIndex];
    }
  }

  showLoading(`Generating ${questionTypeToAsk} practice question...`);

  try {
    const response = await fetch("/generate_question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic_id: currentTopicData.id, // Use the 'id' field from currentTopicData
        question_type: questionTypeToAsk,
        explanation: currentExplanationForPractice, // Provide context for question generation
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    currentPracticeQuestion = result.question;
    practiceQuestionTextElement.textContent = result.question;
    practiceQuestionTextElement.style.color = "#333"; // Reset color from error
  } catch (error) {
    console.error("Error generating practice question:", error);
    practiceQuestionTextElement.textContent = `Error generating question. Please return to topic selection and try again. (${error.message})`;
    submitPracticeAnswerBtn.style.display = "none";
    nextPracticeQuestionBtn.style.display = "none";
    returnToPracticeTopicBtn.style.display = "block";
  } finally {
    hideLoading();
  }
}

/**
 * Handles the submission of a student's answer for practice questions.
 */
async function submitPracticeAnswer() {
  const studentAnswer = practiceAnswerInput.value.trim();
  if (!studentAnswer) {
    alert("Please enter your answer.");
    return;
  }
  if (!currentPracticeQuestion || !currentTopicData) {
    alert("No question to submit an answer for.");
    return;
  }

  showLoading("Evaluating answer...");
  submitPracticeAnswerBtn.style.display = "none"; // Hide submit button while evaluating
  nextPracticeQuestionBtn.style.display = "none";
  returnToPracticeTopicBtn.style.display = "none";

  try {
    const response = await fetch("/evaluate_answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: currentPracticeQuestion,
        student_answer: studentAnswer,
        context_explanation: currentExplanationForPractice, // Pass context for better evaluation
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    displayEvaluationFeedback(result, practiceEvaluationFeedback);

    // Update state based on evaluation
    lastPracticeQuestionCorrect =
      result.correctness === "Correct" && result.understanding !== "Low";

    // Increment question count for the next question in the path
    currentPracticeQuestionCount++;

    nextPracticeQuestionBtn.style.display = "inline-block";
    nextPracticeQuestionBtn.onclick = askNextPracticeQuestion;
    nextPracticeQuestionBtn.textContent =
      currentPracticeQuestionCount <= MAX_PRACTICE_QUESTIONS
        ? "Next Question"
        : "Finish Practice";

    returnToPracticeTopicBtn.style.display = "inline-block";
  } catch (error) {
    console.error("Error evaluating answer:", error);
    practiceEvaluationFeedback.innerHTML = `<p style="color: red;">Error evaluating answer: ${error.message}. Please try again.</p>`;
    submitPracticeAnswerBtn.style.display = "inline-block"; // Allow retry
    returnToPracticeTopicBtn.style.display = "inline-block";
  } finally {
    hideLoading();
  }
}

/**
 * Displays the evaluation feedback from the backend in the specified container.
 * @param {object} result - The evaluation result.
 * @param {HTMLElement} targetDiv - The DOM element to display feedback in.
 */
function displayEvaluationFeedback(result, targetDiv) {
  let feedbackHtml = `
        <div class="evaluation-card">
            <h3>Evaluation Result:</h3>
            <p><strong>Correctness:</strong> <span class="correctness-${result.correctness
              .toLowerCase()
              .replace(" ", "-")}">${result.correctness}</span></p>
            <p><strong>Understanding:</strong> <span class="understanding-${result.understanding.toLowerCase()}">${
    result.understanding
  }</span></p>
            <p><strong>Feedback:</strong> ${result.feedback}</p>
        </div>
    `;
  targetDiv.innerHTML = feedbackHtml;
}

/**
 * Ends the practice path, shows a summary or redirects.
 */
function endPracticePath() {
  alert(
    `Practice Path Completed for ${currentTopicData.title}! You've answered ${MAX_PRACTICE_QUESTIONS} questions.`
  );
  returnToPracticeTopicSelection(); // Go back to practice topic selection
}

/**
 * Returns the user to the practice topic selection screen.
 */
function returnToPracticeTopicSelection() {
  practiceQuestionsContentDiv.style.display = "none"; // Hide questions
  resetPracticePathState(); // Reset practice state
  // The topic selection nav remains visible in practiceModuleSection
  practiceEvaluationFeedback.innerHTML = "";
}

// Utility functions for loading indicator
function showLoading(message) {
  const loadingDiv = document.getElementById("loading-indicator");
  if (!loadingDiv) {
    const newLoadingDiv = document.createElement("div");
    newLoadingDiv.id = "loading-indicator";
    newLoadingDiv.style.color = "#0056b3";
    newLoadingDiv.style.fontWeight = "bold";
    newLoadingDiv.style.marginTop = "20px";
    newLoadingDiv.style.textAlign = "center";
    newLoadingDiv.style.padding = "10px";
    document.getElementById("main").appendChild(newLoadingDiv);
  }
  document.getElementById("loading-indicator").textContent = message;
  document.getElementById("loading-indicator").style.display = "block";
}

function hideLoading() {
  const loadingDiv = document.getElementById("loading-indicator");
  if (loadingDiv) {
    loadingDiv.style.display = "none";
  }
}

// Initialize the display to show the initial choice buttons when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", showInitialChoice);
