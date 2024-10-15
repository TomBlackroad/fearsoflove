// Predefined list of scenarios with follow-up questions
// Array of scenarios with follow-up questions
const scenarios = [
    {
        scenario: "You meet at a mutual friend's wedding after chatting online for months.",
        followUpQuestions: ["How do you feel seeing her in person?", "What's the first thing you talk about?"]
    },
    {
        scenario: "She invites you to her city for a weekend getaway.",
        followUpQuestions: ["What are your expectations for the trip?", "What excites you the most about visiting her?"]
    },
    {
        scenario: "You plan a surprise date for her after arriving in her country.",
        followUpQuestions: ["What are you worried might go wrong?", "How do you think she’ll react to the surprise?"]
    },
    {
        scenario: "You're spending your first morning together after meeting in person.",
        followUpQuestions: ["How do you break the ice?", "What do you want to talk about over breakfast?"]
    },
    {
        scenario: "She introduces you to her best friend during your visit.",
        followUpQuestions: ["How do you want to make a good impression?", "What might make you nervous about the meeting?"]
    },
    {
        scenario: "You're at the airport, ready to meet her for the first time.",
        followUpQuestions: ["What’s running through your mind as you wait?", "How do you plan your first words when you meet?"]
    },
    {
        scenario: "You have dinner plans at a fancy restaurant on your first night together.",
        followUpQuestions: ["What kind of conversation do you hope to have?", "What are you most worried about happening?"]
    },
    {
        scenario: "You're having a long-distance video call after a disagreement.",
        followUpQuestions: ["What do you want to resolve during the call?", "How do you handle potential tension?"]
    },
    {
        scenario: "You're walking through the city where she lives, exploring together.",
        followUpQuestions: ["What do you want to learn about her life there?", "What kind of experiences are you hoping to share?"]
    },
    {
        scenario: "You're attending a family dinner at her home after months of dating online.",
        followUpQuestions: ["How do you prepare for meeting her family?", "What do you hope to discuss over dinner?"]
    },
    // Movie and book inspired scenarios:
    {
        scenario: "You’re on a ship’s deck during sunset, just like Jack and Rose in Titanic. She stands beside you, gazing at the horizon.",
        followUpQuestions: ["How do you express your feelings in this moment?", "What are you hoping she feels standing beside you?"]
    },
    {
        scenario: "You meet at a bustling Christmas market, just like in Love Actually, surrounded by lights and festive cheer.",
        followUpQuestions: ["What’s the first thing you do together?", "How does the festive atmosphere impact your conversation?"]
    },
    {
        scenario: "You’re in a café in Paris, just like Jesse and Celine in Before Sunrise. The conversation flows effortlessly.",
        followUpQuestions: ["What deep topic do you bring up?", "How do you think she’ll respond to your questions?"]
    },
    {
        scenario: "You’re walking down a deserted street late at night, like Mia and Sebastian in La La Land, and the city is quiet.",
        followUpQuestions: ["What do you hope to talk about during the walk?", "How do you feel walking with her in such a calm setting?"]
    },
    {
        scenario: "You’re at the top of a building with a spectacular view of the city, like in 500 Days of Summer.",
        followUpQuestions: ["What thoughts do you share about the view and your future?", "Do you bring up anything vulnerable about yourself?"]
    },
    {
        scenario: "You’re walking through an art gallery, like in Notting Hill, admiring the paintings.",
        followUpQuestions: ["How do you feel sharing this experience with her?", "Do you talk about your favorite pieces, or something more personal?"]
    },
    {
        scenario: "You’re sitting together in a quiet bookstore, like in You've Got Mail, sharing your love for books.",
        followUpQuestions: ["What book do you choose to discuss?", "Do you feel like this moment could deepen your connection?"]
    },
    {
        scenario: "You’re attending a grand ball, like in Pride and Prejudice, the room is filled with music and elegance.",
        followUpQuestions: ["What do you feel when you first see her at the ball?", "What’s the most important thing you want to say during your conversation?"]
    },
    {
        scenario: "You’re running through an airport, like in The Terminal, hoping to catch her before she leaves.",
        followUpQuestions: ["What’s the first thing you say when you finally reach her?", "How do you handle the intense emotions of the moment?"]
    },
    {
        scenario: "You’re sitting in the snow together, like in Eternal Sunshine of the Spotless Mind, just enjoying the quiet.",
        followUpQuestions: ["What do you say to break the silence?", "Do you bring up any past memories or share something new?"]
    },
    {
        scenario: "You’re sitting on a park bench, like in Good Will Hunting, having a deep conversation about life and dreams.",
        followUpQuestions: ["What personal story do you share?", "How do you think this conversation will shape your relationship?"]
    },
    {
        scenario: "You’re in a rainy New York City, huddled under the same umbrella, like in Breakfast at Tiffany's.",
        followUpQuestions: ["What are you feeling as you share this intimate moment?", "Do you say something about the rain, or something more personal?"]
    },
    {
        scenario: "You’re about to dance together at a New Year’s Eve party, like in When Harry Met Sally.",
        followUpQuestions: ["What do you say before the dance starts?", "How do you feel about the possibility of a kiss at midnight?"]
    },
    {
        scenario: "You’re in a bustling city market, just like in Aladdin, exploring the local stalls together.",
        followUpQuestions: ["What do you talk about as you wander through the market?", "Do you buy her something to remember the moment?"]
    },
    {
        scenario: "You’re sitting on a park swing, like in La La Land, gently swaying back and forth.",
        followUpQuestions: ["What childhood memories do you share?", "How do you think she feels sitting beside you in such a simple moment?"]
    },
    {
        scenario: "You’re on a train ride together, like in The Girl on the Train, the world passing by through the windows.",
        followUpQuestions: ["What do you talk about during the ride?", "Do you reveal anything personal, or keep it light?"]
    },
    {
        scenario: "You’re visiting a quiet countryside inn, like in A Walk to Remember, enjoying the peace and nature.",
        followUpQuestions: ["What do you hope she feels about the peaceful surroundings?", "How do you think this quiet time together will affect your bond?"]
    },
    {
        scenario: "You’re attending a book reading event, like in The Fault in Our Stars, sitting side by side, sharing quiet moments.",
        followUpQuestions: ["What do you talk about afterward?", "How does sharing this intellectual experience bring you closer?"]
    },
    {
        scenario: "You’re standing on a snowy bridge at night, like in Bridget Jones's Diary, watching the snow fall around you.",
        followUpQuestions: ["What do you say to break the silence?", "How does the magic of the snow affect what you share with her?"]
    },
    {
        scenario: "You’re driving through a winding mountain road, like in Wild, enjoying the scenic beauty.",
        followUpQuestions: ["What thoughts do you share as you take in the view?", "Do you bring up any dreams or future plans?"]
    },
    {
        scenario: "You’re hiking together through a forest, like in Into the Wild, exploring the beauty of nature.",
        followUpQuestions: ["What do you want to talk about during the hike?", "How do you handle the quiet, natural surroundings?"]
    },
    {
        scenario: "You’re sitting in a diner late at night, like in Pulp Fiction, having a casual but meaningful conversation.",
        followUpQuestions: ["What do you talk about over the late-night food?", "What makes this moment special for you?"]
    },
    {
        scenario: "You’re in a cozy cabin during a snowstorm, like in The Shining (minus the horror), with nowhere to go.",
        followUpQuestions: ["What do you hope to talk about in this isolated setting?", "How does the cabin atmosphere make you feel closer?"]
    },
    {
        scenario: "You’re watching a movie together, like in Cinema Paradiso, sharing popcorn and laughter.",
        followUpQuestions: ["What’s your reaction to the movie?", "Do you want to talk about something more personal after?"]
    },
    {
        scenario: "You’re at a picnic by the lake, like in The Notebook, with the sun setting in the background.",
        followUpQuestions: ["What do you talk about as the sun sets?", "How do you feel about this romantic moment?"]
    }
];

// Game state
let currentScenarioIndex = 0;
let showingQuestions = false;

// Function to show the start button at the beginning
function startGame() {
    document.getElementById("start-button").style.display = "none"; // Hide start button
    showScenario();
}

// Function to show the next scenario
function showScenario() {
    showingQuestions = false;
    document.getElementById("scenario-text").textContent = scenarios[currentScenarioIndex].scenario;
    document.getElementById("follow-up-text").textContent = ""; // Clear previous follow-up questions
    updateButtons();
}

// Function to show the follow-up questions
function showQuestions() {
    if (!showingQuestions) {
        document.getElementById("follow-up-text").textContent = scenarios[currentScenarioIndex].followUpQuestions.join(" ");
        showingQuestions = true;
    }
}

// Update the visibility of buttons based on scenario index
function updateButtons() {
    const previousButton = document.getElementById("previous-button");
    const nextButton = document.getElementById("next-button");
    const questionsButton = document.getElementById("questions-button");

    // Show "Questions" and "Next" after the first scenario
    previousButton.style.display = currentScenarioIndex > 0 ? "inline-block" : "none"; // Show "Previous" only after the first scenario
    nextButton.style.display = "inline-block"; // Always show "Next" unless it's the last scenario
    questionsButton.style.display = "inline-block"; // Always show "Questions"
}

// Function to go to the next scenario
function nextScenario() {
    if (currentScenarioIndex < scenarios.length - 1) {
        currentScenarioIndex++;
        showScenario();
    }
}

// Function to go to the previous scenario
function previousScenario() {
    if (currentScenarioIndex > 0) {
        currentScenarioIndex--;
        showScenario();
    }
}

// HTML structure:
document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("start-button").addEventListener("click", startGame);
    document.getElementById("next-button").addEventListener("click", nextScenario);
    document.getElementById("previous-button").addEventListener("click", previousScenario);
    document.getElementById("questions-button").addEventListener("click", showQuestions);
});
