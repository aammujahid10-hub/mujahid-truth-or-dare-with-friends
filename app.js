const SUPABASE_URL = "https://Engldwqmexryljraqwwj.supabase.co";
const SUPABASE_KEY = "sb_publishable_wUDmKlRAi5nF6G7xX2ItDQ_UeVPH4Ex";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentRoomId = "";
let myName = "";
let roomData = { players: [], current_turn: 0, current_action: "" };

const truths = [
  "What is your biggest secret?",
  "When was the last time you lied?",
  "Who is your secret crush?",
  "What is the most embarrassing thing you've ever done?"
];

const dares = [
  "Do 10 pushups right now!",
  "Text your crush 'I like you' and screenshot it.",
  "Sing the chorus of your favorite song loudly.",
  "Show the last photo in your phone gallery."
];

// Create Room Function
async function createRoom() {
  myName = document.getElementById("username").value.trim();
  if (!myName) return alert("Please enter your name first!");
  currentRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  const { error } = await supabase.from('rooms').insert([
    { id: currentRoomId, players: [myName], current_turn: 0, current_action: "Room Created! Waiting for players..." }
  ]);
  if (error) return alert("Error creating room. Try again.");
  initGameUI();
}

// Join Room Function
async function joinRoom() {
  myName = document.getElementById("username").value.trim();
  currentRoomId = document.getElementById("roomCode").value.trim().toUpperCase();
  if (!myName || !currentRoomId) return alert("Please enter your name and room code!");
  const { data, error } = await supabase.from('rooms').select('*').eq('id', currentRoomId).single();
  if (error || !data) return alert("Room not found!");
  let updatedPlayers = [...data.players];
  if (!updatedPlayers.includes(myName)) {
    updatedPlayers.push(myName);
  }
  await supabase.from('rooms').update({ players: updatedPlayers }).eq('id', currentRoomId);
  initGameUI();
}

// Initialize and Listen for Live Updates
function initGameUI() {
  document.getElementById("setupArea").classList.add("hidden");
  document.getElementById("gameArea").classList.remove("hidden");
  document.getElementById("roomTitle").innerText = `Room Code: ${currentRoomId}`;
  
  // Subscribe to live database changes
  supabase.channel(`room-${currentRoomId}`)
    .on('postgres_changes', { event: 'UPDATE', filter: `id=eq.${currentRoomId}`, schema: 'public', table: 'rooms' }, 
      payload => { updateUI(payload.new); }
    ).subscribe();
    
  // Initial fetch
  fetchCurrentState();
}

async function fetchCurrentState() {
  const { data } = await supabase.from('rooms').select('*').eq('id', currentRoomId).single();
  if (data) updateUI(data);
}

// Update the Game UI based on live database data
function updateUI(data) {
  roomData = data;
  const playerList = document.getElementById("playerList");
  playerList.innerHTML = "";
  data.players.forEach((player, index) => {
    const li = document.createElement("li");
    li.innerText = player;
    if (index === data.current_turn) li.classList.add("active-turn");
    playerList.appendChild(li);
  });
  
  const activePlayer = data.players[data.current_turn];
  document.getElementById("turnDisplay").innerText = `${activePlayer}'s Turn`;
  document.getElementById("actionDisplay").innerText = data.current_action;
  
  // Show/Hide buttons if it's your turn
  if (activePlayer === myName) {
    document.getElementById("actionButtons").classList.remove("hidden");
  } else {
    document.getElementById("actionButtons").classList.add("hidden");
  }
}

// Pick a Truth or Dare
async function getCard(type) {
  const list = type === 'Truth' ? truths : dares;
  const randomText = list[Math.floor(Math.random() * list.length)];
  const actionText = `Chose ${type}: "${randomText}"`;
  await supabase.from('rooms').update({ current_action: actionText }).eq('id', currentRoomId);
}

// Pass Turn to Next Player
async function nextTurn() {
  let nextIndex = roomData.current_turn + 1;
  if (nextIndex >= roomData.players.length) nextIndex = 0;
  await supabase.from('rooms').update({ 
     current_turn: nextIndex, 
     current_action: "Waiting for selection..." 
   }).eq('id', currentRoomId);                          
                                     }
