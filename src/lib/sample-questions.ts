import type { Question } from "@/types/question";

export const sampleQuestions: Question[] = [
  {
    id: 1,
    uuid: "q-physics-001",
    question: "What is the SI unit of Force?",
    options: [
      { key: "A", value: "Joule", type: "text" },
      { key: "B", value: "Newton", type: "text" },
      { key: "C", value: "Pascal", type: "text" },
      { key: "D", value: "Watt", type: "text" },
    ],
    answer: "B",
    explanation: "Force is measured in Newton (N) according to SI units.",
    explanationLong:
      "Force is defined by Newton's second law as F = m·a — mass times acceleration. " +
      "The SI unit, the newton (N), is therefore the force needed to accelerate a 1 kg mass " +
      "at 1 m/s², so 1 N = 1 kg·m/s². The other options are different quantities built from the " +
      "newton: a joule (J) is energy/work (1 J = 1 N·m), a pascal (Pa) is pressure " +
      "(1 Pa = 1 N/m²), and a watt (W) is power (1 W = 1 J/s). A common exam trap is to confuse " +
      "force with energy or pressure because their units all derive from the newton.",
    concepts: ["force", "newton's laws of motion", "si units"],
    subjectId: 1,
    topicId: 1,
    subjectName: "Physics",
    topicName: "Mechanics",
    year: "2024",
    repeatedYears: ["2024"],
    repeatCount: 1,
    source: "past_year",
    importSource: "manual",
    difficulty: "easy",
    status: "published",
    media: {},
    aiTags: ["force", "SI unit", "mechanics"],
    aiReviewStatus: "approved",
    duplicateCheckStatus: "unique",
    possibleDuplicateIds: [],
    isMockEligible: true,
    createdAt: "2026-05-14",
    updatedAt: "2026-05-14",
  },
  {
    id: 2,
    uuid: "q-chemistry-001",
    question: "Which particle determines the atomic number of an element?",
    options: [
      { key: "A", value: "Electron", type: "text" },
      { key: "B", value: "Neutron", type: "text" },
      { key: "C", value: "Proton", type: "text" },
      { key: "D", value: "Nucleus", type: "text" },
    ],
    answer: "C",
    explanation: "Atomic number equals the number of protons present in the nucleus.",
    explanationLong:
      "The atomic number (Z) is the number of protons in an atom's nucleus, and it defines which " +
      "element the atom is — change the proton count and you change the element. Electrons " +
      "(option A) determine charge and bonding but not identity; in a neutral atom they merely " +
      "equal the proton count. Neutrons (option B) set the isotope/mass number, not the element. " +
      "'Nucleus' (option D) is the structure that holds protons and neutrons, not a particle. So " +
      "only the proton count fixes the atomic number.",
    concepts: ["atomic structure", "subatomic particles", "atomic number"],
    subjectId: 2,
    topicId: 3,
    subjectName: "Chemistry",
    topicName: "Atomic Structure",
    year: "2023",
    repeatedYears: ["2023"],
    repeatCount: 1,
    source: "past_year",
    importSource: "manual",
    difficulty: "medium",
    status: "published",
    media: {},
    aiTags: ["atom", "proton", "atomic number"],
    aiReviewStatus: "approved",
    duplicateCheckStatus: "unique",
    possibleDuplicateIds: [],
    isMockEligible: true,
    createdAt: "2026-05-14",
    updatedAt: "2026-05-14",
  },
  {
    id: 3,
    uuid: "q-zoology-001",
    question: "Which organelle is known as the powerhouse of the cell?",
    options: [
      { key: "A", value: "Ribosome", type: "text" },
      { key: "B", value: "Mitochondria", type: "text" },
      { key: "C", value: "Golgi body", type: "text" },
      { key: "D", value: "Nucleus", type: "text" },
    ],
    answer: "B",
    explanation: "Mitochondria produce ATP energy for cellular functions.",
    explanationLong:
      "Mitochondria are called the powerhouse of the cell because they carry out aerobic " +
      "respiration, producing most of the cell's ATP through the Krebs cycle and the electron " +
      "transport chain on the inner membrane (cristae). Ribosomes (A) build proteins, the Golgi " +
      "body (C) packages and ships them, and the nucleus (D) stores DNA and directs the cell. " +
      "Mitochondria also have their own DNA and are thought to have originated from " +
      "free-living bacteria (the endosymbiotic theory) — a frequent exam follow-up.",
    concepts: ["cell organelles", "cellular respiration", "atp", "mitochondria"],
    subjectId: 4,
    topicId: 6,
    subjectName: "Zoology",
    topicName: "Cell Biology",
    year: "2022",
    repeatedYears: ["2022"],
    repeatCount: 1,
    source: "past_year",
    importSource: "manual",
    difficulty: "easy",
    status: "published",
    media: {},
    aiTags: ["cell", "mitochondria", "ATP"],
    aiReviewStatus: "approved",
    duplicateCheckStatus: "unique",
    possibleDuplicateIds: [],
    isMockEligible: true,
    createdAt: "2026-05-14",
    updatedAt: "2026-05-14",
  },
  {
    id: 4,
    uuid: "q-physics-002",
    question: "Newton's first law of motion is also known as the law of?",
    options: [
      { key: "A", value: "Inertia", type: "text" },
      { key: "B", value: "Acceleration", type: "text" },
      { key: "C", value: "Momentum", type: "text" },
      { key: "D", value: "Gravitation", type: "text" },
    ],
    answer: "A",
    explanation: "Newton's first law is the law of inertia.",
    explanationLong:
      "Newton's first law states that a body remains at rest or in uniform straight-line motion " +
      "unless acted upon by a net external force. This tendency to resist a change in state of " +
      "motion is called inertia, and it increases with mass. The second law (F = m·a) is about " +
      "acceleration, the third law is about action–reaction pairs, and gravitation is a separate " +
      "law — common distractors on this question.",
    concepts: ["force", "newton's laws of motion", "inertia"],
    subjectId: 1,
    topicId: 1,
    subjectName: "Physics",
    topicName: "Mechanics",
    year: "2023",
    repeatedYears: ["2023"],
    repeatCount: 1,
    source: "past_year",
    importSource: "manual",
    difficulty: "easy",
    status: "published",
    media: {},
    aiTags: ["newton", "inertia", "laws of motion"],
    aiReviewStatus: "approved",
    duplicateCheckStatus: "unique",
    possibleDuplicateIds: [],
    isMockEligible: true,
    createdAt: "2026-05-14",
    updatedAt: "2026-05-14",
  },
  {
    id: 5,
    uuid: "q-physics-003",
    question: "Which physical quantity is a vector?",
    options: [
      { key: "A", value: "Mass", type: "text" },
      { key: "B", value: "Speed", type: "text" },
      { key: "C", value: "Force", type: "text" },
      { key: "D", value: "Temperature", type: "text" },
    ],
    answer: "C",
    explanation: "Force is a vector quantity — it has magnitude and direction.",
    explanationLong:
      "A vector has both magnitude and direction; a scalar has magnitude only. Force is a vector " +
      "because pushing left vs right gives different results even with the same strength. Mass, " +
      "speed and temperature are scalars (speed is the magnitude of the velocity vector). This is " +
      "why forces are added using vector addition (the parallelogram/triangle rule), not simple " +
      "arithmetic.",
    concepts: ["force", "vectors and scalars"],
    subjectId: 1,
    topicId: 1,
    subjectName: "Physics",
    topicName: "Mechanics",
    year: "2024",
    repeatedYears: ["2024"],
    repeatCount: 1,
    source: "past_year",
    importSource: "manual",
    difficulty: "medium",
    status: "published",
    media: {},
    aiTags: ["vector", "scalar", "force"],
    aiReviewStatus: "approved",
    duplicateCheckStatus: "unique",
    possibleDuplicateIds: [],
    isMockEligible: true,
    createdAt: "2026-05-14",
    updatedAt: "2026-05-14",
  },
];