/**
 * Scenario hooks for the Learn card (CloudQuest's NPC intro, adapted to 2D).
 *
 * Each chapter opens with a concrete situation instead of abstract theory —
 * "a friend failed on this" — so the learner knows WHY the rules matter
 * before reading them. One map, keyed by chapter id, reused by every pack
 * view (DRY). Unknown chapters fall back to a generic hook.
 */

export type Scenario = {
  /** The hook: a concrete driving situation that frames the chapter. */
  hook: Record<string, string>;
  /** What the learner will be able to do after the chapter. */
  goal: Record<string, string>;
};

const FALLBACK: Scenario = {
  hook: {
    en: "A friend missed exactly this kind of question on the exam. Two minutes here and you will not.",
    ro: "Un prieten a gresit exact la un astfel de subiect la examen. Doua minute aici si tu nu vei gresi.",
  },
  goal: {
    en: "Understand the rules, then prove it in practice.",
    ro: "Intelege regulile, apoi demonstreaza la practica.",
  },
};

const SCENARIOS: Record<string, Scenario> = {
  // ---- EU core pack ----
  warning: {
    hook: {
      en: "A triangular sign with a red border flashes past at 90 km/h. You have two seconds to know what it wants from you.",
    },
    goal: {
      en: "Read every danger warning sign instantly: shape, border, symbol.",
    },
  },
  priority: {
    hook: {
      en: "Two cars reach an unmarked crossroads at the same moment. Neither driver is sure who goes. That hesitation is where crashes live.",
    },
    goal: {
      en: "Know who has priority at any intersection, signed or not.",
    },
  },
  signals: {
    hook: {
      en: "The light turns amber as you approach. Brake or accelerate? The exam wants one answer, and so does the car behind you.",
    },
    goal: {
      en: "Respond correctly to every traffic light and lane signal.",
    },
  },

  // ---- RO pack ----
  semne: {
    hook: {
      en: "Your friend failed on road signs: he knew most of them, just not the three that showed up on his exam.",
      ro: "Prietenul tau a picat la indicatoare: stia majoritatea, dar nu pe cele trei care i-au picat la examen.",
    },
    goal: {
      en: "Recognize every sign and marking by shape, color and meaning.",
      ro: "Recunoaste fiecare indicator si marcaj dupa forma, culoare si sens.",
    },
  },
  prioritate: {
    hook: {
      en: "At an unsigned intersection in Bucharest, the driver on your left waves you through. The law says otherwise. Who is right?",
      ro: "La o intersectie nesemnalizata din Bucuresti, soferul din stanga iti face semn sa treci. Legea spune altceva. Cine are dreptate?",
    },
    goal: {
      en: "Apply priority-from-the-right and every priority rule automatically.",
      ro: "Aplica prioritatea de dreapta si fiecare regula de prioritate automat.",
    },
  },
  semafoare: {
    hook: {
      en: "The traffic light flashes yellow at night. Half the drivers slow down, half do not. Only one group passes the exam.",
      ro: "Semaforul clipeste galben noaptea. Jumatate din soferi incetinesc, jumatate nu. Doar o grupa trece examenul.",
    },
    goal: {
      en: "Know every traffic light combination, including flashing and off.",
      ro: "Cunoaste fiecare combinatie de semafoare, inclusiv clipitoare si oprite.",
    },
  },
  viteza: {
    hook: {
      en: "50 in town, 90 outside, 130 on the motorway — until a sign, a vehicle type or a trailer quietly changes the number.",
      ro: "50 in localitate, 90 in afara, 130 pe autostrada — pana cand un indicator, un tip de vehicul sau o remorca schimba linistit cifra.",
    },
    goal: {
      en: "State the correct speed limit for any road and vehicle combination.",
      ro: "Spune limita de viteza corecta pentru orice combinatie de drum si vehicul.",
    },
  },
};

export function scenarioFor(chapterId: string): Scenario {
  return SCENARIOS[chapterId] ?? FALLBACK;
}

export function pickScenarioText(field: Record<string, string>, lang: string): string {
  return field[lang] ?? field.en ?? Object.values(field)[0] ?? "";
}
