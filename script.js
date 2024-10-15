// Predefined list of scenarios with follow-up questions
const scenarios = [
    {
        scenario: "You meet for the first time at the airport after months of chatting online.",
        followUpQuestions: ["How do you feel in this moment?", "What are you most excited or afraid of?"]
    },
    {
        scenario: "You are having your first dinner date after arriving in her city.",
        followUpQuestions: ["What do you want to learn about her?", "How do you break the ice?"]
    },
    // More scenarios...
];

let currentScenarioIndex = 0;

// Function to update the scenario card
function showScenario() {
    const scenario = scenarios[currentScenarioIndex];
    document.getElementById('scenario-text').textContent = scenario.scenario;

    const followUpList = document.getElementById('follow-up-list');
    followUpList.innerHTML = '';
    scenario.followUpQuestions.forEach(question => {
        const li = document.createElement('li');
        li.textContent = question;
        followUpList.appendChild(li);
    });

    // Show the question button and hide start button
    document.getElementById('start-btn').classList.add('hidden');
    document.getElementById('questions-btn').classList.remove('hidden');
    document.getElementById('next-btn').classList.remove('hidden');
}

// Function to show follow-up questions
function showQuestions() {
    document.getElementById('questions').classList.remove('hidden');
}

// Function to move to the next scenario
function nextScenario() {
    currentScenarioIndex = (currentScenarioIndex + 1) % scenarios.length;
    document.getElementById('questions').classList.add('hidden');
    showScenario();
}

// Event listeners for buttons
document.getElementById('start-btn').addEventListener('click', showScenario);
document.getElementById('questions-btn').addEventListener('click', showQuestions);
document.getElementById('next-btn').addEventListener('click', nextScenario);
