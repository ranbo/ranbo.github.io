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

const introDots = 32; // 2 measures of 4 beats x 4 "dots" per beat.
const breathSectionDots = 416;
const endSectionDots = 428;

const tempo140= 107.142857;
const tempo220= 68.181818;
const tempo200= 75;

function theAdamShow() {
  lines = parseAdamTiming();
  song = new Audio("Adam.mp3");
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
  let promise = song.play();
  promise.then(startGame(lines));
}

function startGame() {
  console.log("Playing song.");
  $("#button-holder").html("<button type='button' onclick='stopSong()'>Stop</button><br>");
  timer = setInterval(adamsDot, tempo140);
  score = 0;
  speedBonus = 0;
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
  console.log("Dot: totalDots=" + totalDots + (totalDots < introDots ? "; intro..." : "; piece=" + piece.text + "; " + currentDots + "/" + piece.dots + " dots on current piece"));

  // Handle intro beats
  if (totalDots < introDots) {
    totalDots++;
    return;
  }

  // Handle tempo changes
  if (totalDots === breathSectionDots) {
    console.log("Taking breath...");
    clearInterval(timer);
    timer = setInterval(adamsDot, tempo220);
  }
  else if (totalDots === endSectionDots) {
    console.log("End section...");
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
      let $a = $("<div id='" + getAdamId(currentLine, currentPiece) + "' class='target" +
        (piece.who === "Isabel" ? " isa" : "") + "'" +
        " onclick='clickAdam(" + currentLine + ", " + currentPiece + ", " + displayTime + ");'" +
        " onmouseover='hoverAdam(" + currentLine + ", " + currentPiece + ", " + displayTime + ");'>" +
        "A<span class='dum'>" + (line.pieces[currentPiece + 1].text.startsWith("dumm") ? line.pieces[currentPiece + 1].text : "dam") + "</span></div>");
      $a.css({top: piece.y, left: piece.x});
      $("#adams").append($a);
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
        // Finished with the song and animation.
        console.log("Clearing timer");
        clearInterval(timer);
        gameOver = true;
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

function getAdamId(lineIndex, pieceIndex) {
  return "adam-" + lineIndex + "-" + pieceIndex;
}

function clickAdam(lineIndex, pieceIndex, displayTime, wasHover) {
  // Future: Explode the letters.
  // Future: Make a sound.
  let adamId = getAdamId(lineIndex, pieceIndex);
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

function hoverAdam(lineIndex, pieceIndex, displayTime) {
  // Don't delete on hover until 22 points (first verse), nor on final "Adummmmm", nor after game over.
  if (score >= 22 && !gameOver && !lines[lineIndex].pieces[pieceIndex + 1].text.startsWith("dumm")) {
    clickAdam(lineIndex, pieceIndex, displayTime, true);
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
  for (let textLine of adamTiming.split("\n")) {
    lines.push(new Line(textLine));
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
  constructor(line) {
    this.pieces = parseLine(line);
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

function parseLine(line) {
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
    let x1 = Math.random() * (windowWidth - w);
    let y1 = Math.random() * (windowHeight - h);
    let x2 = Math.random() * (windowWidth - w);
    let y2 = Math.random() * (windowHeight - h);
    for (let adamIndex = 0; adamIndex < adamPieces.length; adamIndex++) {
      let piece = adamPieces[adamIndex];
      piece.x = interpolate(x1, x2, adamIndex, adamPieces.length);
      piece.y = interpolate(y1, y2, adamIndex, adamPieces.length);
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