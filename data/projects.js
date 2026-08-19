// ---------------------------------------------------------------------------
// PROJECT DATA
// Replace these placeholder entries with your real projects.
// Keep the `id` format (TRACK-NUMBER) if you want the booth numbering on the
// map to stay meaningful — the letter is the aisle/track, the number is the
// booth position within that aisle.
//
// videoSrc / deckSrc should point at files you drop into:
//   assets/videos/   (e.g. a01.mp4)
//   assets/decks/    (e.g. a01.pdf)
// See assets/README.md for exact naming + format notes.
// ---------------------------------------------------------------------------

const TRACKS = [
  { code: "A", name: "Data & AI",                     color: "#37788A", tint: "#E9F1F1" },
  { code: "B", name: "Health & Bio",                  color: "#DFA63E", tint: "#FAF2E1" },
  { code: "C", name: "Sustainability & Environment",  color: "#8E2E4D", tint: "#F7EBEF" },
  { code: "D", name: "Design, Media & Society",       color: "#5F6B72", tint: "#F1F2F3" },
];

const PROJECTS = [
  // ---- Aisle A: Data & AI ----
  { id: "A-01", track: "A", row: 1, col: 1, title: "Placeholder Project A1", students: ["Student Name", "Student Name"], blurb: "One or two sentence summary of the project goes here — what problem it tackles and the approach taken.", videoSrc: "assets/videos/a01.mp4", deckSrc: "assets/decks/a01.pdf" },
  { id: "A-02", track: "A", row: 1, col: 2, title: "Placeholder Project A2", students: ["Student Name"], blurb: "One or two sentence summary of the project goes here.", videoSrc: "assets/videos/a02.mp4", deckSrc: "assets/decks/a02.pdf" },
  { id: "A-03", track: "A", row: 1, col: 3, title: "Placeholder Project A3", students: ["Student Name", "Student Name"], blurb: "One or two sentence summary of the project goes here.", videoSrc: "assets/videos/a03.mp4", deckSrc: "assets/decks/a03.pdf" },
  { id: "A-04", track: "A", row: 1, col: 4, title: "Placeholder Project A4", students: ["Student Name"], blurb: "One or two sentence summary of the project goes here.", videoSrc: "assets/videos/a04.mp4", deckSrc: "assets/decks/a04.pdf" },
  { id: "A-05", track: "A", row: 1, col: 5, title: "Placeholder Project A5", students: ["Student Name", "Student Name", "Student Name"], blurb: "One or two sentence summary of the project goes here.", videoSrc: "assets/videos/a05.mp4", deckSrc: "assets/decks/a05.pdf" },

  // ---- Aisle B: Health & Bio ----
  { id: "B-01", track: "B", row: 2, col: 1, title: "Placeholder Project B1", students: ["Student Name"], blurb: "One or two sentence summary of the project goes here.", videoSrc: "assets/videos/b01.mp4", deckSrc: "assets/decks/b01.pdf" },
  { id: "B-02", track: "B", row: 2, col: 2, title: "Placeholder Project B2", students: ["Student Name", "Student Name"], blurb: "One or two sentence summary of the project goes here.", videoSrc: "assets/videos/b02.mp4", deckSrc: "assets/decks/b02.pdf" },
  { id: "B-03", track: "B", row: 2, col: 3, title: "Placeholder Project B3", students: ["Student Name"], blurb: "One or two sentence summary of the project goes here.", videoSrc: "assets/videos/b03.mp4", deckSrc: "assets/decks/b03.pdf" },
  { id: "B-04", track: "B", row: 2, col: 4, title: "Placeholder Project B4", students: ["Student Name", "Student Name"], blurb: "One or two sentence summary of the project goes here.", videoSrc: "assets/videos/b04.mp4", deckSrc: "assets/decks/b04.pdf" },
  { id: "B-05", track: "B", row: 2, col: 5, title: "Placeholder Project B5", students: ["Student Name"], blurb: "One or two sentence summary of the project goes here.", videoSrc: "assets/videos/b05.mp4", deckSrc: "assets/decks/b05.pdf" },

  // ---- Aisle C: Sustainability & Environment ----
  { id: "C-01", track: "C", row: 3, col: 1, title: "Placeholder Project C1", students: ["Student Name"], blurb: "One or two sentence summary of the project goes here.", videoSrc: "assets/videos/c01.mp4", deckSrc: "assets/decks/c01.pdf" },
  { id: "C-02", track: "C", row: 3, col: 2, title: "Placeholder Project C2", students: ["Student Name", "Student Name"], blurb: "One or two sentence summary of the project goes here.", videoSrc: "assets/videos/c02.mp4", deckSrc: "assets/decks/c02.pdf" },
  { id: "C-03", track: "C", row: 3, col: 3, title: "Placeholder Project C3", students: ["Student Name"], blurb: "One or two sentence summary of the project goes here.", videoSrc: "assets/videos/c03.mp4", deckSrc: "assets/decks/c03.pdf" },
  { id: "C-04", track: "C", row: 3, col: 4, title: "Placeholder Project C4", students: ["Student Name", "Student Name"], blurb: "One or two sentence summary of the project goes here.", videoSrc: "assets/videos/c04.mp4", deckSrc: "assets/decks/c04.pdf" },
  { id: "C-05", track: "C", row: 3, col: 5, title: "Placeholder Project C5", students: ["Student Name"], blurb: "One or two sentence summary of the project goes here.", videoSrc: "assets/videos/c05.mp4", deckSrc: "assets/decks/c05.pdf" },

  // ---- Aisle D: Design, Media & Society ----
  { id: "D-01", track: "D", row: 4, col: 1, title: "Placeholder Project D1", students: ["Student Name"], blurb: "One or two sentence summary of the project goes here.", videoSrc: "assets/videos/d01.mp4", deckSrc: "assets/decks/d01.pdf" },
  { id: "D-02", track: "D", row: 4, col: 2, title: "Placeholder Project D2", students: ["Student Name", "Student Name"], blurb: "One or two sentence summary of the project goes here.", videoSrc: "assets/videos/d02.mp4", deckSrc: "assets/decks/d02.pdf" },
  { id: "D-03", track: "D", row: 4, col: 3, title: "Placeholder Project D3", students: ["Student Name"], blurb: "One or two sentence summary of the project goes here.", videoSrc: "assets/videos/d03.mp4", deckSrc: "assets/decks/d03.pdf" },
  { id: "D-04", track: "D", row: 4, col: 4, title: "Placeholder Project D4", students: ["Student Name", "Student Name"], blurb: "One or two sentence summary of the project goes here.", videoSrc: "assets/videos/d04.mp4", deckSrc: "assets/decks/d04.pdf" },
  { id: "D-05", track: "D", row: 4, col: 5, title: "Placeholder Project D5", students: ["Student Name"], blurb: "One or two sentence summary of the project goes here.", videoSrc: "assets/videos/d05.mp4", deckSrc: "assets/decks/d05.pdf" },
];
