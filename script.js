function toggleMute() {
    let video = document.getElementById("myVideo");

    if (video) {
        console.log("🎬 Video clicked!");

        if (video.muted) {
            video.muted = false;
            video.volume = 1.0;
            video.play();
            console.log("🔊 Unmuted and playing!");
        } else {
            video.muted = true;
            console.log("🔇 Muted again.");
        }
    } else {
        console.error("❌ Video element not found!");
    }
}
