/* Game Day Guide — shared script for index.html and guide.html
   1. Chatbot widget (both pages)
   2. Hero video: autoplay, loop, pause button
   3. Game day clock (the X-factor feature) */

(function () {
  "use strict";

  var CHAT_URL = "https://share.chatling.ai/s/kKgDypYMoNRRY6E";

  /* ---------- 1. Chatbot widget ---------- */

  var launch = document.createElement("button");
  launch.type = "button";
  launch.className = "chat-launch";
  launch.setAttribute("aria-expanded", "false");
  launch.setAttribute("aria-controls", "chat-panel");
  launch.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M21 12a8 8 0 0 1-8 8H5l-2 2V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8z"/></svg>' +
    "<span>Ask the chatbot</span>";

  var panel = document.createElement("section");
  panel.id = "chat-panel";
  panel.className = "chat-panel";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Game Day Guide chatbot");
  panel.innerHTML =
    '<div class="chat-bar"><span>Game day chatbot</span>' +
    '<button type="button" class="chat-close" aria-label="Close chatbot">&times;</button></div>' +
    '<iframe title="Game Day Guide chatbot" allow="clipboard-write"></iframe>';

  document.body.appendChild(launch);
  document.body.appendChild(panel);

  var frame = panel.querySelector("iframe");
  var closeBtn = panel.querySelector(".chat-close");

  function loadChat() {
    if (!frame.getAttribute("src")) frame.setAttribute("src", CHAT_URL);
  }

  function openChat() {
    loadChat();
    panel.hidden = false;
    launch.setAttribute("aria-expanded", "true");
    closeBtn.focus();
  }

  function closeChat() {
    panel.hidden = true;
    launch.setAttribute("aria-expanded", "false");
    launch.focus();
  }

  launch.addEventListener("click", function () {
    if (panel.hidden) openChat(); else closeChat();
  });
  closeBtn.addEventListener("click", closeChat);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !panel.hidden) closeChat();
  });

  // Any element with data-open-chat opens the chatbot
  var openers = document.querySelectorAll("[data-open-chat]");
  for (var i = 0; i < openers.length; i++) {
    openers[i].addEventListener("click", openChat);
  }

  // Load the chatbot in the background so it is ready when opened
  window.addEventListener("load", function () {
    setTimeout(loadChat, 800);
  });

  /* ---------- 2. Hero video ---------- */

  var hero = document.querySelector(".hero");
  var video = document.querySelector(".hero-video");
  var toggle = document.querySelector(".video-toggle");

  if (hero && video) {
    video.muted = true; // browsers only allow autoplay when muted
    var noVideo = function () { hero.classList.add("no-video"); };
    video.addEventListener("error", noVideo);
    if (video.error || video.networkState === 3) noVideo(); // file missing
    var started = video.play();
    if (started && started.catch) started.catch(function () {});

    if (toggle) {
      toggle.addEventListener("click", function () {
        if (video.paused) {
          video.play();
          toggle.textContent = "Pause video";
        } else {
          video.pause();
          toggle.textContent = "Play video";
        }
      });
    }
  }

  /* ---------- 3. Game day clock ---------- */

  var form = document.getElementById("planner-form");
  if (!form) return;

  var otherWrap = document.getElementById("other-time");
  var otherInput = document.getElementById("kick-other");
  var driveInput = document.getElementById("drive");
  var driveOut = document.getElementById("drive-value");
  var fieldInner = document.getElementById("field-inner");
  var list = document.getElementById("clock-list");
  var title = document.getElementById("clock-title");
  var lotsNote = document.getElementById("lots-note");
  var STORE = "game-day-guide-clock";

  function fmt(mins) {
    var m = ((mins % 1440) + 1440) % 1440;
    var h = Math.floor(m / 60);
    var mm = m % 60;
    var suffix = h >= 12 ? "PM" : "AM";
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ":" + (mm < 10 ? "0" : "") + mm + " " + suffix;
  }

  function checked(name) {
    var el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : null;
  }

  function kickoffMinutes() {
    var v = checked("kickoff");
    if (v === "other") {
      var parts = (otherInput.value || "15:25").split(":");
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }
    return parseInt(v, 10);
  }

  // Each step: [minutes before kickoff, what to do, why]
  function buildPlan(style, kickoff, drive) {
    // Lots usually open 5 hours before kickoff, about 4 for noon games
    var lots = kickoff <= 750 ? 240 : 300;
    var steps;
    if (style === "tailgate") {
      steps = [
        [lots + drive, "Leave home", "Cooler, chairs and parking pass in the car."],
        [lots, "Lots open: park and set up", "Tailgating starts as soon as the lots open."],
        [120, "Stadium gates open", "No rush yet. The tailgate can keep going."],
        [75, "Pack up the tailgate", "Anything that is not in your clear bag stays in the car."],
        [60, "Walk to your gate", "Security lines grow in the last hour."],
        [30, "In your seat", "In time for warmups and the pregame show."]
      ];
    } else if (style === "close") {
      steps = [
        [80 + drive, "Leave home", "This plan has no slack, so leave on time."],
        [80, "Park", "Expect slow traffic near the stadium."],
        [55, "At your gate", "Clear bag open and mobile ticket on screen."],
        [15, "In your seat", "Just ahead of the anthem."]
      ];
    } else {
      steps = [
        [150 + drive, "Leave home", "Tickets on your phone, clear bag packed."],
        [150, "Park", "You are ahead of most of the crowd."],
        [120, "Gates open: head inside", "Have your clear bag and mobile ticket ready."],
        [60, "Get food, then find your seat", "Concession lines are shorter this early."]
      ];
    }
    steps.push([0, "Kickoff", ""]);
    return { steps: steps, lots: lots };
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function render() {
    var style = checked("style") || "easy";
    var kickoff = kickoffMinutes();
    var drive = parseInt(driveInput.value, 10);
    if (isNaN(kickoff)) return;

    otherWrap.hidden = checked("kickoff") !== "other";
    driveOut.textContent = drive + " min";

    var plan = buildPlan(style, kickoff, drive);
    var steps = plan.steps;
    var span = steps[0][0];

    title.textContent = "Your clock for a " + fmt(kickoff) + " kickoff";
    lotsNote.textContent = plan.lots === 240 ? "four" : "five";

    // Field: a yard line for each hour before kickoff
    fieldInner.innerHTML = "";
    for (var h = 1; h * 60 <= span; h++) {
      var tick = el("div", "tick");
      tick.style.left = (1 - (h * 60) / span) * 100 + "%";
      tick.appendChild(el("span", null, h + " hr"));
      fieldInner.appendChild(tick);
    }
    var kick = el("div", "kick");
    kick.appendChild(el("span", null, "Kickoff"));
    fieldInner.appendChild(kick);

    list.innerHTML = "";
    steps.forEach(function (step, index) {
      var isKick = step[0] === 0;

      if (!isKick) {
        var mark = el("div", "mark", String(index + 1));
        mark.style.left = (1 - step[0] / span) * 100 + "%";
        mark.style.top = index % 2 === 0 ? "34%" : "60%";
        mark.setAttribute("aria-hidden", "true");
        fieldInner.appendChild(mark);
      }

      var li = el("li", isKick ? "is-kickoff" : null);
      li.appendChild(el("span", "num", isKick ? "K" : String(index + 1)));
      li.appendChild(el("span", "time", fmt(kickoff - step[0])));
      var text = el("span", "text");
      text.appendChild(el("span", "what", step[1]));
      if (step[2]) text.appendChild(el("span", "why", step[2]));
      li.appendChild(text);
      list.appendChild(li);
    });

    try {
      localStorage.setItem(STORE, JSON.stringify({
        kickoff: checked("kickoff"),
        other: otherInput.value,
        style: style,
        drive: drive
      }));
    } catch (e) { /* storage unavailable: the clock still works */ }
  }

  // Restore the visitor's last picks
  try {
    var saved = JSON.parse(localStorage.getItem(STORE) || "null");
    if (saved) {
      var k = form.querySelector('input[name="kickoff"][value="' + saved.kickoff + '"]');
      var s = form.querySelector('input[name="style"][value="' + saved.style + '"]');
      if (k) k.checked = true;
      if (s) s.checked = true;
      if (saved.other) otherInput.value = saved.other;
      if (saved.drive) driveInput.value = saved.drive;
    }
  } catch (e) { /* ignore */ }

  form.addEventListener("input", render);
  form.addEventListener("change", render);
  form.addEventListener("submit", function (e) { e.preventDefault(); });
  render();
})();
