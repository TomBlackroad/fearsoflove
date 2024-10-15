// Predefined lists of cards with more context and follow-up questions
const situations = [
    {
        situation: "You are meeting at the airport for the first time after weeks of texting.",
        context: "You’ve been talking online for a while and now you’re finally meeting in person. There’s excitement, but also nervousness because you’ve only known each other through screens.",
        followUpQuestions: [
            "What are you most nervous about in this moment?",
            "How do you think the first conversation will go in person?"
        ]
    },
    // Add other situations here...
];

const fears = [
    "Fear of rejection.",
    "Fear of long-distance challenges.",
    "Fear of not being compatible in person.",
    "Fear of being judged.",
    "Fear of cultural misunderstandings."
];

const excitements = [
    "Excitement about discovering something new together.",
    "Looking forward to meaningful conversations.",
    "Excitement about learning more about their culture.",
    "Anticipation of a strong emotional connection.",
    "Excitement about future possibilities."
];

// Game progress
let roundsPlayed = 0;

// Function to shuffle and pick a random item from an array
function drawRandomCard(cards) {
    const randomIndex = Math.floor(Math.random() * cards.length);
    return cards[randomIndex];
}

// Function to update the progress tracker
function updateProgress() {
    roundsPlayed++;
    document.getElementById('progress-text').textContent = `Rounds played: ${roundsPlayed}`;
}

// Function to restart the game
function restartGame() {
    roundsPlayed = 0;
    document.getElementById('situation-text').textContent = "Press Start to draw a situation.";
    document.getElementById('fear-text').textContent = "Press Start to draw a fear card.";
    document.getElementById('excitement-text').textContent = "Press Start to draw an excitement card.";
    document.getElementById('prompt-text').textContent = "Reflect on how you'd handle these feelings.";
    document.getElementById('follow-up-list').innerHTML = '';
    updateProgress();
}

// Handling the draw cards button
document.getElementById('draw-cards-btn').addEventListener('click', function () {
    // Draw random situation, fear, and excitement
    const randomSituation = drawRandomCard(situations);
    const randomFear = drawRandomCard(fears);
    const randomExcitement = drawRandomCard(excitements);

    // Update the DOM with the new cards
    document.getElementById('situation-text').textContent = `${randomSituation.situation} - ${randomSituation.context}`;
    document.getElementById('fear-text').textContent = randomFear;
    document.getElementById('excitement-text').textContent = randomExcitement;
    document.getElementById('prompt-text').textContent = "How would you handle these emotions in this situation?";

    // Clear and add follow-up questions
    const followUpList = document.getElementById('follow-up-list');
    followUpList.innerHTML = '';
    randomSituation.followUpQuestions.forEach(question => {
        const listItem = document.createElement('li');
        listItem.textContent = question;
        followUpList.appendChild(listItem);
    });

    // Update progress
    updateProgress();
});

// Handling the restart button
document.getElementById('restart-btn').addEventListener('click', restartGame);
