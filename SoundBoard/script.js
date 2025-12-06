const soundButtons = document.querySelectorAll("button[data-sound]");
const volumeBar = document.getElementById("volume");
const muteButton = document.getElementById("muteBtn");

let isMuted = false;
let playingSound = null;

for (let i = 0; i < soundButtons.length; i++) {
  soundButtons[i].addEventListener("click", play);
}

function play() {
  const fileName = this.getAttribute("data-sound");

  if (playingSound) {
    playingSound.pause();
    playingSound.currentTime = 0;
  }

  playingSound = new Audio("Sounds/" + fileName);
  playingSound.volume = volumeBar.value;

  if (isMuted === false) {
    playingSound.play();
  }
}

muteButton.addEventListener("click", mute);

function mute() {
  if (isMuted === false) {
    isMuted = true;
    muteButton.textContent = "Unmute";
    if (playingSound) {
      playingSound.pause();
    }
  } else {
    isMuted = false;
    muteButton.textContent = "Mute";
    if (playingSound) {
      playingSound.play();
    }
  }
}
