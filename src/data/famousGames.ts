export interface FamousGame {
  name: string;
  description: string;
  players: string;
  year: number;
  pgn: string;
}

export interface OpeningStudy {
  name: string;
  description: string;
  eco: string;
  pgn: string; // Starting moves to get into the opening
}

export interface EndgameStudy {
  name: string;
  description: string;
  fen: string; // Starting position for the endgame
  objective: string;
}

export type StudyItem =
  | { type: "game"; data: FamousGame }
  | { type: "opening"; data: OpeningStudy }
  | { type: "endgame"; data: EndgameStudy };

export const openingStudies: OpeningStudy[] = [
  {
    name: "Berlin Wall",
    description: "The solid Berlin Defense - Black's fortress against 1.e4",
    eco: "C67",
    pgn: `[Event "Opening Study"]
[Site "?"]
[Date "????.??.??"]
[Round "?"]
[White "Theory"]
[Black "Theory"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6 4. O-O Nxe4 5. d4 Nd6 6. Bxc6 dxc6 7. dxe5 Nf5 8. Qxd8+ Kxd8 *`,
  },
  {
    name: "Open Sicilian",
    description: "The sharp Sicilian Defense with 2.Nf3 and 3.d4",
    eco: "B20-B99",
    pgn: `[Event "Opening Study"]
[Site "?"]
[Date "????.??.??"]
[Round "?"]
[White "Theory"]
[Black "Theory"]
[Result "*"]

1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 *`,
  },
];

export const endgameStudies: EndgameStudy[] = [
  {
    name: "Lucena Position",
    description: "The most important rook endgame - building a bridge to promote",
    fen: "1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1",
    objective: "White to play and win by building a bridge to shield the king from checks",
  },
];

export const famousGames: FamousGame[] = [
  {
    name: "Kasparov vs Topalov",
    description: "Kasparov's incredible Rxd4!! sacrifice",
    players: "Kasparov vs Topalov",
    year: 1999,
    pgn: `[Event "Hoogovens"]
[Site "Wijk aan Zee NED"]
[Date "1999.01.20"]
[White "Garry Kasparov"]
[Black "Veselin Topalov"]
[Result "1-0"]

1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 Nbd7 8. Bh6 Bxh6 9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6 13. Nc1 O-O-O 14. Nb3 exd4 15. Rxd4 c5 16. Rd1 Nb6 17. g3 Kb8 18. Na5 Ba8 19. Bh3 d5 20. Qf4+ Ka7 21. Rhe1 d4 22. Nd5 Nbxd5 23. exd5 Qd6 24. Rxd4 cxd4 25. Re7+ Kb6 26. Qxd4+ Kxa5 27. b4+ Ka4 28. Qc3 Qxd5 29. Ra7 Bb7 30. Rxb7 Qc4 31. Qxf6 Kxa3 32. Qxa6+ Kxb4 33. c3+ Kxc3 34. Qa1+ Kd2 35. Qb2+ Kd1 36. Bf1 Rd2 37. Rd7 Rxd7 38. Bxc4 bxc4 39. Qxh8 Rd3 40. Qa8 c3 41. Qa4+ Ke1 42. f4 f5 43. Kc1 Rd2 44. Qa7 1-0`,
  },
  {
    name: "Anand vs Carlsen WCC G6",
    description: "Carlsen's brilliant endgame technique",
    players: "Anand vs Carlsen",
    year: 2013,
    pgn: `[Event "World Chess Championship 2013"]
[Site "Chennai IND"]
[Date "2013.11.16"]
[Round "6"]
[White "Viswanathan Anand"]
[Black "Magnus Carlsen"]
[Result "0-1"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6 4. d3 Bc5 5. c3 O-O 6. O-O Re8 7. Re1 a6 8. Ba4 b5 9. Bb3 d6 10. Bg5 Be6 11. Nbd2 h6 12. Bh4 Bxb3 13. axb3 Nb8 14. h3 Nbd7 15. Nh2 Qe7 16. Ndf1 Bb6 17. Ne3 Qe6 18. b4 a5 19. bxa5 Bxa5 20. Nhg4 Bb6 21. Bxf6 Nxf6 22. Nxf6+ Qxf6 23. Qg4 Bxe3 24. fxe3 Qe6 25. Qxe6 Rxe6 26. Kf2 c5 27. Ke2 d5 28. exd5 Rd6 29. Rad1 Rxd5 30. Rc1 Kf8 31. c4 Rd4 32. Kd2 Ke7 33. Ke2 Rad8 34. d4 cxd4 35. exd4 Rxd4 36. cxb5 R8d5 37. b6 Rb4 38. Rxe5+ Kf6 39. Re2 Rxb6 40. Rc7 Rd6 41. Re3 Rb2+ 42. Kf3 Rb3 43. Rxb3 Rd3+ 44. Ke2 Rxb3 45. Rxf7+ Ke5 46. Rh7 Rb2+ 47. Kf1 Kf4 48. Rxh6 Kg3 49. h4 Kxg2 50. h5 Rb1+ 51. Ke2 Rb5 52. h6 Rh5 53. Rg6 Kf4 54. Kd3 Rxh6 55. Rxg7 Rh3+ 56. Kc4 Ke5 57. Rg5+ Kd6 58. Kb5 Rh1 59. Rg6+ Kd5 60. Kb6 Rb1+ 61. Ka5 Kc5 62. Rg5+ Kc4 63. Ka4 Ra1+ 64. Kb5 Ra8 65. Rg1 Kd3 66. Kc5 Rc8+ 67. Kb4 Ke2 0-1`,
  },
];

// Helper to get all study items for display
export function getAllStudyItems(): StudyItem[] {
  return [
    ...openingStudies.map(data => ({ type: "opening" as const, data })),
    ...endgameStudies.map(data => ({ type: "endgame" as const, data })),
    ...famousGames.map(data => ({ type: "game" as const, data })),
  ];
}
