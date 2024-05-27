let lines = [];
let currentLine = 0;
let currentPiece = 0;
let currentDots = 0;
let totalDots = 0;
let timer;
let song;
let score = 0;
let speedBonus = 0;
let scoreMultiplier = 1;
let gameOver = false;
let sounds;
// Array of Floater objects being animated
let floaters;
let floaterTimer;

const introDots = 32; // 2 measures of 4 beats x 4 "dots" per beat.
const breathSectionDots = 416;
const endSectionDots = 428;

const tempo140= 107.142857;
const tempo220= 68.181818;
const tempo200= 75;

const animationInterval = 10; // ms between animation steps
const gravity = 20 / (1000 / animationInterval);
const rebound = .8;
const maxV = 300 / (1000 / animationInterval);

function theAdamShow() {
  song = new Audio("Adam.mp3");
  song.load();
  let tinyPop = new Audio("tiny-pop.mp3");
  let bup = new Audio("bup.mp3");
  let jpop = new Audio("JPop.mp3");
  let boip = new Audio("boip.mp3");
  sounds = [tinyPop, bup, jpop, boip];
  for (let i = 0; i < 10; i++) {
    sounds.push(new Audio("tiny-pop.mp3"));
  }
  for (let sound of sounds) {
    sound.load();
  }
  startGame(lines);
}

function startGame() {
  lines = parseAdamTiming();
  $("#adam").html("");
  console.log("Playing song.");
  $("#button-holder").html("<button type='button' onclick='stopSong()'>Stop</button><br>");
  let promise = song.play();
  promise.then();
  timer = setInterval(adamsDot, tempo140);
  score = 0;
  speedBonus = 0;
  currentLine = 0;
  currentPiece = 0;
  currentDots = 0;
  totalDots = 0;
  scoreMultiplier = 1;
  gameOver = false;
  floaters = [];
  floaterTimer = setInterval(moveFloaters, animationInterval);
  updateScore();
  return null;
}

function updateScore() {
  $("#score").text(score);
  $("#speed-bonus").text(speedBonus.toFixed(2));
  $("#total-score").text(Math.round(score + speedBonus));
}

function stopSong() {
  clearInterval(timer);
  song.pause();
}

function adamsDot() {
  if (currentLine >= lines.length) {
    console.log("Error: Too many lines. Stopping.");
    clearInterval(timer);
    return;
  }
  // Adam's Dot --------
  let line = lines[currentLine];
  let piece = line.pieces[currentPiece];
  //console.log("Dot: totalDots=" + totalDots + (totalDots < introDots ? "; intro..." : "; piece=" + piece.text + "; " + currentDots + "/" + piece.dots + " dots on current piece"));

  // Handle intro beats
  if (totalDots < introDots) {
    totalDots++;
    return;
  }

  // Handle tempo changes
  if (totalDots === breathSectionDots) {
    //console.log("Taking breath...");
    clearInterval(timer);
    timer = setInterval(adamsDot, tempo220);
  }
  else if (totalDots === endSectionDots) {
    //console.log("End section...");
    clearInterval(timer);
    timer = setInterval(adamsDot, tempo200);
  }

  if (currentDots === 0) {
    // Display next piece
    let $adam = $("#adam");
    $adam.append("<div class='" + piece.who + "'>" + escapeHtml(piece.text) + "</div>");
    if (piece.suffix === " ") {
      $adam.append(" ");
    } else if (piece.suffix === "\n") {
      $adam.append("<br>\n");
    }
    if (piece.isAdam) {
      let displayTime = Date.now(); // time at which Adam was displayed.
      let isDumm = line.pieces[currentPiece + 1].text.startsWith("dumm");
      let adamId = getAdamId(currentLine, currentPiece);
      let $a = $("<div id='" + adamId + "' class='target" +
        (piece.who === "Isabel" ? " isa" : (isDumm ? " dumm" : "")) + "'" +
        " onclick='clickAdam(event, " + currentLine + ", " + currentPiece + ", " + displayTime + ");'" +
        " onmouseover='hoverAdam(event, " + currentLine + ", " + currentPiece + ", " + displayTime + ");'>" +
        "<div class='letter' id='" + (adamId + "-A") + "'>A</div>" +
        "<span class='dum'>" +
        (isDumm ? line.pieces[currentPiece + 1].text : "" +
          "<div class='letter' id='" + (adamId + '-d') + "'>d</div>" +
          "<div class='letter' id='" + (adamId + '-a') + "'>a</div>" +
          "<div class='letter' id='" + (adamId + '-m') + "'>m</div>") +
        "</span></div>");
      $a.css({top: piece.y, left: piece.x});
      $("#adams").append($a);
      floaters.push(new Floater($a, piece.x, piece.y, $a.outerWidth(), $a.outerHeight(), piece.dx, piece.dy, false, true));
    }
    else if (piece.isDum) {
      $(".dum").removeClass("dum");
    }
  }
  currentDots++;
  totalDots++;
  if (currentDots === piece.dots) {
    currentDots = 0;
    currentPiece++;
    if (currentPiece >= line.pieces.length) {
      currentPiece = 0;
      currentLine++;
      if (currentLine >= lines.length) {
        endGame();
      }
      else {
        line = lines[currentLine];
        if (line.pieces.length === 1 && line.pieces[0].text === "") {
          let $adam = $("#adam");
          $adam.append("<p/>\n");
          currentLine++;
        }
      }
    }
  }
}

function endGame() {
  // Finished with the song and animation.
  console.log("Clearing timer");
  clearInterval(timer);
  clearInterval(floaterTimer);
  gameOver = true;
  $(".target").remove();
  $("#button-holder").html("<button type='button' onclick='startGame()'>Again! Again!</button><br>");
}

function getAdamId(lineIndex, pieceIndex) {
  return "adam-" + lineIndex + "-" + pieceIndex;
}

function clickAdam(event, lineIndex, pieceIndex, displayTime, wasHover) {
  event.preventDefault();
  let clickPos = {top: event.y, left: event.x};
  let adamId = getAdamId(lineIndex, pieceIndex);
  let aPos = $("#" + adamId + "-A").position();
  let dPos = $("#" + adamId + "-d").position();
  let uPos = $("#" + adamId + "-u").position();
  let mPos = $("#" + adamId + "-m").position();
  $("#" + adamId).remove();
  if (!gameOver) {
    let soundIndex = wasHover ? 0 : 1;
    let elapsedTime = Date.now() - displayTime;
    let bonusRate = Math.max((1000 - elapsedTime) / 1000, 0);
    bonusRate = bonusRate * bonusRate;
    let piece = lines[lineIndex].pieces[pieceIndex];
    let isIsabel = piece.who === "Isabel";
    let prevScore = score;
    if (isIsabel) {
      // 2x points for Isabel
      score += 2 * scoreMultiplier;
      soundIndex = 2; // louder pop for these
    }
    else if (lines[lineIndex].pieces[pieceIndex + 1].text.startsWith("dumm")) {
      score += 100 * scoreMultiplier;
      soundIndex = 3;
    }
    else {
      score += scoreMultiplier;
    }
    if (prevScore < 64 && score >= 64) {
      // Crossed 64-point threshold, so now multiply scores by 1000
      scoreMultiplier = 1000;
      score *= 1000;
      soundIndex = 3; // "boip!"
      $("body").css("background", "#6675b2");
    }
    if (prevScore < 22 && score >= 22) {
      soundIndex = 3; // "boip!"
      $("body").css("background", "#6262a9");
    }

    if (soundIndex === 0) {
      // Since sound '0' happens from hover, and can happen quickly, rotate between 10 copies of that sound,
      //  so that they can play simultaneously.
      soundIndex = soundRoundRobin++;
      if (soundRoundRobin >= sounds.length) {
        soundRoundRobin = 0;
      }
      if (soundRoundRobin > 0 && soundRoundRobin <= 3) {
        soundRoundRobin = 4;
      }
    }
    sounds[soundIndex].play();
    speedBonus += bonusRate * (score - prevScore);
    updateScore();
  }
}

let soundRoundRobin = 0;

function hoverAdam(event, lineIndex, pieceIndex, displayTime) {
  // Don't delete on hover until 22 points (first verse), nor on final "Adummmmm", nor after game over.
  if (score >= 22 && !gameOver && !lines[lineIndex].pieces[pieceIndex + 1].text.startsWith("dumm")) {
    clickAdam(event, lineIndex, pieceIndex, displayTime, true);
  }
}

function pieceIsAdam(pieces, pieceIndex) {
  if (pieceIndex < pieces.length - 1) {
    let text = pieces[pieceIndex].text;
    if (text.endsWith("A")) {
      let text2 = pieces[pieceIndex + 1].text;
      return text2.startsWith("dam") || text2.startsWith("dumm");
    }
  }
}

function escapeHtml(text) {
  return $("<div/>").text(text).html();
}

function parseAdamTiming() {
  let lines = [];
  let numLines = 0;
  for (let textLine of adamTiming.split("\n")) {
    lines.push(new Line(textLine, numLines++));
  }
  for (let line of lines) {
    let dots = 0;
    let text = "";
    for (let piece of line.pieces) {
      dots += piece.dots;
      text += piece.text + piece.suffix;
    }
    console.log(dots + ": " + text);
  }
  return lines;
}
class Line {
  constructor(line, numLines) {
    this.pieces = parseLine(line,  numLines);
  }
}

function moveFloaters() {
  let toRemove = [];
  for (let f = 0; f < floaters.length; f++) {
    if (floaters[f].move()) {
      toRemove.push(f);
    }
  }
  for (let r = toRemove.length - 1; r >= 0; r--) {
    floaters.splice(toRemove[r], 1);
  }
}

class Floater {
  constructor($div, x, y, w, h, dx, dy, hasGravity, isBouncy) {
    this.$div = $div;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.dx = dx;
    this.dy = dy;
    this.hasGravity = hasGravity;
    this.isBouncy = isBouncy;
  }

  // Move a floater. Return true if it should be removed, or false otherwise.
  move() {
    this.$div.css({top: this.y, left: this.x});
    let s = "<" + this.x + ", " + this.y + ">";
    let maxX = $(window).width() - this.w - 1;
    let maxY = $(window).height() - this.h - 1;
    if (!this.isBouncy && (this.x > $(window).width() || this.x < -this.w || this.y > $(window).height())) {
      // Doesn't bounce and went out of bounds, so remove it.
      this.$div.remove();
      return true;
    }
    this.x += this.dx;
    this.y += this.dy;
    s += " + <" + this.dx + ", " + this.dy + "> = <" + this.x + ", " + this.y + ">";
    if (this.hasGravity) {
      this.dy += gravity;
    }
    // console.log(s);
    if (this.isBouncy) {
      if (this.x > maxX) {
        let tooFar = this.x - maxX;
        this.x = Math.max(maxX - tooFar, 0);
        // future: add boing sound
        this.dx = -this.dx * rebound;
      }
      if (this.x < 0) {
        this.x = Math.min(-this.x, maxX);
        // future: add boing sound
        this.dx = -this.dx * rebound;
      }
      if (this.y > maxY) {
        let tooFar = this.y - maxY;
        this.y = Math.max(maxY - tooFar, 0);
        this.dy = -this.dy * rebound;
      }
      if (this.y < 0) {
        this.y = Math.min(-this.y, maxY);
        this.dy = -this.dy * rebound;
      }
    }
    return false;
  }
}

class Piece {
  // text: word or word piece to display
  // ms: number of timing dots that this piece lasts
  // suffix: (optional) text that goes after the piece ("", " " or "\n")
  constructor(text, dots, suffix, who) {
    this.text = text;
    this.dots = dots;
    this.suffix = suffix;
    this.who = who;
    this.isAdam = false;
    this.isDum = false;
    this.x = 0;
    this.y = 0;
  }
}

function parseLine(line, numLines) {
  let pieces = [];
  let currentText = "";
  let numDots = 0;
  let chars = line.split("");
  let prevWasDot = false;
  let who = "Randy";
  for (let c of chars) {
    if (c === "#") {
      who = "Isabel";
    }
    else if (c === "$") {
      who = "Adam";
    }
    else if (c === '.') {
      numDots++;
      prevWasDot = true;
    }
    else if (c === ';') {
      numDots += 4;
      prevWasDot = true;
    }
    else if (c === ' ') {
      pieces.push(new Piece(currentText, numDots, " ", who));
      currentText = "";
      numDots = 0;
      prevWasDot = false;
    }
    else if (prevWasDot) {
      pieces.push(new Piece(currentText, numDots, "", who));
      currentText = c;
      numDots = 0;
      prevWasDot = false;
    }
    else {
      currentText += c;
      prevWasDot = false;
    }
  }
  pieces.push(new Piece(currentText, numDots, "\n", who));
  let adamPieces = [];
  for (let pieceIndex = 0; pieceIndex < pieces.length; pieceIndex++) {
    if (pieceIsAdam(pieces, pieceIndex)) {
      pieces[pieceIndex].isAdam = true;
      pieces[pieceIndex + 1].isDum = true;
      adamPieces.push(pieces[pieceIndex]);
    }
  }
  if (adamPieces.length > 0) {
    let w = 70; //$a.outerWidth();
    let h = 45; //$a.outerHeight();
    let windowWidth = $(window).width();
    let windowHeight = $(window).height();
    // Pick two endpoints, and distribute target Adams evenly from x1,y1 to x2,y2
    let x1 = Math.random() * (windowWidth - w);
    let y1 = Math.random() * (windowHeight - h);
    let x2 = Math.random() * (windowWidth - w);
    let y2 = Math.random() * (windowHeight - h);

    // Pick two more endpoints and slowly move target Adams towards even points from tx1,ty1 to tx1,ty2
    let tx1 = Math.random() * (windowWidth - w);
    let ty1 = Math.random() * (windowHeight - h);
    let tx2 = Math.random() * (windowWidth - w);
    let ty2 = Math.random() * (windowHeight - h);
    let v = Math.random() * maxV;

    for (let adamIndex = 0; adamIndex < adamPieces.length; adamIndex++) {
      let piece = adamPieces[adamIndex];
      if (numLines >= 27) {
        // Make the last two lines of Adams completely random.
        piece.x = Math.random() * (windowWidth - w);
        piece.y = Math.random() * (windowHeight - h);
        piece.dx = Math.random() * v;
        piece.dy = Math.random() * v;
      }
      else {
        piece.x = interpolate(x1, x2, adamIndex, adamPieces.length);
        piece.y = interpolate(y1, y2, adamIndex, adamPieces.length);
        let tx = interpolate(tx1, tx2, adamIndex, adamPieces.length);
        let ty = interpolate(ty1, ty2, adamIndex, adamPieces.length);
        let maxSize = Math.max(windowWidth, windowHeight);
        piece.dx = v * (tx - piece.x) / maxSize;
        piece.dy = v * (ty - piece.y) / maxSize;
      }
    }
  }
  return pieces;
}

// Interpolate from val1 to val2 as index goes from 0 to length - 1
function interpolate(val1, val2, index, length) {
  if (index === 0 || val2 === val1) {
    return val1;
  }
  if (index === length - 1) {
    return val2;
  }
  return val1 + (index * (val2 - val1)) / (length - 1);
}

let adamTiming =
  'A..dam,..;.. it\'s.. time... for. din..ner..; #(A..dam)..;\n' +
  'A..dam,..;.. it\'s.. time... to. eat;; #(A..dam..-A..dam)..\n' +
  'Hey.. there,..;; with... the. head..phones..; #(A.dam.-A.dam.-A..dam)..\n' +
  'Time.. to..;.. get.. off... your. seat; #(A.dam.-A.dam.-A..dam,.. A..dam)..\n' +
  '\n' +
  'A..dam,.. A..dam,.. A..dam,.. A..dam..\n' +
  'A..dam,.. A..dam,.. A..dam,.. A..dam..\n' +
  'A..dam,.. A..dam,.. A..dam,.. A..dam..\n' +
  'Set; the; ta;ble;\n' +
  'A.dam,... A.dam,... A.dam,... A.dam...\n' +
  'A.dam,... A.dam,... A.dam,... A.dam...\n' +
  'A..dam,.. A..dam,.. A..dam..\n' +
  'time.. to.. eat;;;;\n' +
  '\n' +
  'A.dam.-A.dam. A.dam.-A.dam. A.dam.-A.dam. A.dam.-A.dam.\n' +
  'A.dam.-A.dam. A.dam.-A.dam. A.dam.-A.dam. A.dam.-A.dam.\n' +
  'A.dam.-A.dam. A.dam.-A.dam. A.dam.-A.dam. A.dam.-A.dam.\n' +
  'Set; the; ta;ble;\n' +
  'A.dam.-A.dam. A.dam.-A.dam. A.dam.-A.dam. A.dam.-A.dam.\n' +
  'A.dam.-A.dam. A.dam.-A.dam. A.dam.-A.dam. A.dam.-A.dam.\n' +
  'A.dam.-A.dam. A.dam.-A.dam. A..dam..\n' +
  'Time.. to.. eat;;;;;;;\n' +
  '\n' +
  'A.dam.-A.dam. A.dam.-A.dam. A.dam.-A.dam. A.dam.-A.dam.\n' +
  'A.dam.-A.dam. A.dam.-A.dam. A.dam.-A.dam. A.dam.-A.dam.\n' +
  'A.dam.-A.dam. A.dam.-A.dam. A.dam.-A.dam. A.dam.-A.dam.\n' +
  'Time; for; din;ner;\n' +
  'A.dam.-A.dam. A.dam.-A.dam. A.dam.-A.dam. A.dam.-A.dam.\n' +
  'A.dam.-A.dam. A.dam.-A.dam. A.dam.-A.dam. A.dam.-A.dam.\n' +
  'A;dam; time; to; eat,;;\n' +
  'Oh,;; A;;dam;; A.dummmmm...;\n' +
  '$Yes?;\n' +
  '#Time... to. eat!;\n' +
  '$Oh,... O.K;\n' +
  ':)..';