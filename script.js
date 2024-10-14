// Predefined lists of cards
const situations = [
    "You are meeting at the airport for the first time.",
    "You are about to have your first video call.",
    "You're sitting across from each other in a coffee shop.",
    "You just finished your first long conversation.",
    "You met their friends for the first time."
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

// Function to shuffle and pick a random card
function drawRandomCard(cards) {
    const randomIndex = Math.floor(Math.random() * cards.length);
    return cards[randomIndex];
}

// Handling the button click event
document.getElementById('draw-cards-btn').addEventListener('click', function () {
    // Draw random cards
    const situation = drawRandomCard(situations);
    const fear = drawRandomCard(fears);
    const excitement = drawRandomCard(excitements);

    // Update the DOM with the new cards
    document.getElementById('situation-text').textContent = situation;
    document.getElementById('fear-text').textContent = fear;
    document.getElementById('excitement-text').textContent = excitement;

    // Update the discussion prompt
    document.getElementById('prompt-text').textContent = "How would you handle these emotions in this situation?";
});