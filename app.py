# app.py (Flask Backend)
from flask import Flask, render_template, request, jsonify
import google.generativeai as genai
import os

app = Flask(__name__)

# --- HARDCODED GEMINI API KEY (FOR HACKATHON QUICK START ONLY) ---
# Your Gemini API key is placed directly here.
# Get your key from: https://aistudio.google.com/app/apikey
GEMINI_API_KEY = "AIzaSyDstK88MDnAE_VsF_krpigoD1s4rbSc2UQ"
# --- END HARDCODED KEY ---

if not GEMINI_API_KEY or GEMINI_API_KEY == "YOUR_ACTUAL_GEMINI_API_KEY_HERE":
    print("ERROR: Please replace 'YOUR_ACTUAL_GEMINI_API_KEY_HERE' with your actual Gemini API key in app.py")
    exit("Gemini API Key is not set or is still the placeholder. Cannot proceed.")

# Configure Gemini with the correct model
try:
    # It's recommended to use a specific model version for stability, e.g., 'gemini-1.5-flash-001'
    # However, for convenience, 'gemini-1.5-flash' alias often points to the latest stable flash model.
    # Check https://ai.google.dev/gemini-api/docs/models for the latest stable model names.
    genai.configure(api_key=GEMINI_API_KEY)
    
    # Simple test to check if the model is reachable and can generate content
    test_model = genai.GenerativeModel('gemini-1.5-flash')
    test_model.generate_content("Test connection", safety_settings=[
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
    ])
    print("Gemini API configured successfully with gemini-1.5-flash!")
except Exception as e:
    print(f"Failed to configure Gemini API or test model: {e}")
    print("Please check your Gemini API key and ensure it's correctly set in app.py.")
    exit("Gemini API configuration error. Cannot proceed.")


# --- Mock Learning Content (expanded to include question prompts) ---
LEARNING_CONTENT = {
    "photosynthesis": { # This is the topic_id key
        "title": "Understanding Photosynthesis",
        "default_explanation": "Photosynthesis is the process used by plants, algae, and certain bacteria to convert light energy into chemical energy, which is stored in glucose. This process primarily uses water and carbon dioxide, and releases oxygen as a byproduct. It occurs mainly in the chloroplasts, specifically involving chlorophyll.",
        "key_concepts": ["Light Energy", "Chemical Energy", "Chloroplasts", "Chlorophyll", "Carbon Dioxide", "Water", "Oxygen", "Glucose"],
        "examples": [
            "A plant absorbing sunlight through its leaves to make its food.",
            "Algae in the ocean using sunlight to produce energy."
        ],
        "question_prompts": {
            "memory": "Generate ONE very simple, memory-based question about photosynthesis based on the provided explanation. The question should require a direct factual recall from the explanation. Provide only the question, no answer.",
            "conceptual": "Generate ONE conceptual question about photosynthesis that requires a basic understanding of the process, not just memorization. The question should ask 'why' or 'how' in a simple way, or relate concepts. Provide only the question, no answer.",
            "applied": "Generate ONE simple applied question about photosynthesis. This question should require the student to use their understanding in a new, basic scenario or problem. Provide only the question, no answer."
        }
    },
    "cell_division": { # This is another topic_id key
        "title": "Understanding Cell Division",
        "default_explanation": "Cell division is the process by which a parent cell divides into two or more daughter cells. It is a fundamental process in all living organisms, ensuring growth, repair, and reproduction. There are two main types: mitosis (for growth and repair) and meiosis (for sexual reproduction, producing gametes).",
        "key_concepts": ["Mitosis", "Meiosis", "Chromosomes", "DNA", "Daughter Cells", "Parent Cell", "Gametes"],
        "examples": [
            "When a cut on your finger heals, new skin cells are formed through cell division.",
            "How a single fertilized egg develops into a complex organism through repeated cell divisions."
        ],
        "question_prompts": {
            "memory": "Generate ONE very simple, memory-based question about cell division. The question should require direct factual recall from the explanation, e.g., naming a type of division or its purpose. Provide only the question, no answer.",
            "conceptual": "Generate ONE conceptual question about cell division that requires understanding the 'why' or 'how' of mitosis or meiosis. Provide only the question, no answer.",
            "applied": "Generate ONE simple applied question about cell division, asking how it applies to a common biological scenario. Provide only the question, no answer."
        }
    }
}


@app.route('/')
def index():
    """Renders the main HTML page."""
    return render_template('index.html')

@app.route('/learn/<topic_id>')
def get_learning_content(topic_id):
    """
    Retrieves default learning content for a given topic.
    """
    topic_data = LEARNING_CONTENT.get(topic_id)
    if not topic_data:
        return jsonify({"error": "Topic not found"}), 404
    # Include the topic_id in the returned data for frontend convenience
    topic_data_with_id = topic_data.copy()
    topic_data_with_id['id'] = topic_id
    return jsonify(topic_data_with_id)

@app.route('/adapt_explanation', methods=['POST'])
def adapt_explanation():
    """
    Receives feedback from the frontend and uses Gemini API to adapt explanations.
    """
    data = request.json
    concept = data.get('concept')
    original_explanation = data.get('explanation')
    feedback_type = data.get('feedback_type')

    prompt = ""
    if feedback_type == "simplify":
        prompt = f"Explain '{concept}' in very simple terms for a student who is struggling. Avoid jargon and use a common analogy if possible. Original explanation: '{original_explanation}'"
    elif feedback_type == "more_examples":
        prompt = f"Generate 2 new and distinct examples for the concept of '{concept}'. Focus on providing clear and concise examples. Original explanation: '{original_explanation}'"
    elif feedback_type == "still_dont_understand":
        prompt = f"The student still doesn't understand '{concept}' despite the previous explanation. Re-explain it from a different angle, breaking it down into even smaller, more fundamental steps. Original explanation: '{original_explanation}'"
    else:
        return jsonify({"error": "Invalid request or missing feedback type"}), 400

    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt, safety_settings=[
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
        ])
        adapted_content = response.text
        return jsonify({"adapted_content": adapted_content})
    except Exception as e:
        print(f"Gemini API error in adapt_explanation: {e}")
        return jsonify({"error": f"Could not generate adapted content. API Error: {str(e)}"}), 500

@app.route('/generate_question', methods=['POST'])
def generate_question():
    """
    Generates a question based on the topic and question type.
    """
    data = request.json
    topic_id = data.get('topic_id') # This should now be like 'photosynthesis' or 'cell_division'
    question_type = data.get('question_type') # 'memory', 'conceptual', 'applied'
    current_explanation = data.get('explanation') # This is the context for question generation

    topic_data = LEARNING_CONTENT.get(topic_id)
    if not topic_data:
        return jsonify({"error": "Topic not found"}), 404

    prompt_template = topic_data['question_prompts'].get(question_type)
    if not prompt_template:
        return jsonify({"error": "Question type not supported for this topic"}), 400

    # Combine the template with the current explanation for context
    full_prompt = f"Context: \"\"\"{current_explanation}\"\"\"\n\n{prompt_template}"

    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(full_prompt, safety_settings=[
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
        ])
        question_text = response.text.strip()
        # Clean up common LLM output artifacts (e.g., "Question:", leading numbers)
        question_text = question_text.replace("Question:", "").strip()
        if question_text.startswith("1. "): # Handle numbered lists
            question_text = question_text[3:].strip()
            
        return jsonify({"question": question_text, "question_type": question_type})
    except Exception as e:
        print(f"Gemini API error in generate_question: {e}")
        return jsonify({"error": f"Could not generate question. API Error: {str(e)}"}), 500

@app.route('/evaluate_answer', methods=['POST'])
def evaluate_answer():
    """
    Evaluates a student's answer using the Gemini API.
    """
    data = request.json
    question = data.get('question')
    student_answer = data.get('student_answer')
    context_explanation = data.get('context_explanation') # The explanation the question was based on

    prompt = f"""
    The student was asked the following question based on this explanation:
    Explanation: \"\"\"{context_explanation}\"\"\"
    Question: \"\"\"{question}\"\"\"
    Student's Answer: \"\"\"{student_answer}\"\"\"

    Please evaluate the student's answer for correctness and understanding of the concept.
    Strictly follow this format for your response:
    CORRECTNESS: [Correct/Partially Correct/Incorrect]
    FEEDBACK: [Provide specific, constructive feedback focusing on why it's correct/incorrect or how to improve. If incorrect, briefly guide towards the right concept without giving the direct answer. If correct, praise and perhaps ask a follow-up to deepen understanding.]
    UNDERSTANDING: [High/Medium/Low] - Assess the depth of understanding shown, not just factual recall.
    """

    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt, safety_settings=[
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
        ])
        evaluation_text = response.text.strip()

        # Parse the structured output from Gemini
        correctness = "N/A"
        feedback = "Could not parse feedback."
        understanding = "N/A"

        lines = evaluation_text.split('\n')
        for line in lines:
            if line.startswith("CORRECTNESS:"):
                correctness = line.replace("CORRECTNESS:", "").strip()
            elif line.startswith("FEEDBACK:"):
                feedback = line.replace("FEEDBACK:", "").strip()
            elif line.startswith("UNDERSTANDING:"):
                understanding = line.replace("UNDERSTANDING:", "").strip()

        return jsonify({
            "correctness": correctness,
            "feedback": feedback,
            "understanding": understanding
        })
    except Exception as e:
        print(f"Gemini API error in evaluate_answer: {e}")
        return jsonify({"error": f"Could not evaluate answer. API Error: {str(e)}"}), 500


if __name__ == '__main__':
    app.run(debug=True)