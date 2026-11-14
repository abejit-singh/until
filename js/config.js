/**
 * Constants: storage key, limits on what can be typed, the closing prompts
 * and the state a first visit starts from.
 */

export const STORAGE_KEY = 'until_state_v1';

export const DAY_MS = 24 * 60 * 60 * 1000;

export const WEEKS_PER_ROW = 52; // one row of the grid = one year of life

/** Limits applied to everything the user can type, so no field can break the maths or the layout. */
export const LIMITS = {
  lifeExpectancy: [50, 110],
  hours: [0, 24],
  nameLength: 60,
  milestoneLength: 80,
  activities: 30,
  milestones: 100,
  maxAge: 130
};

export const QUOTES = [
  'You will never get this exact day back. Use it on purpose.',
  'Do one thing today that your future self will thank you for.',
  'The average week is just a square. Today, make yours count.',
  "You can't add days to your life. But you can add life to your day.",
  "Time isn't found. It's chosen.",
  'Small. Deliberate. Today.'
];

export const DEFAULT_STATE = {
  birthDate: null,
  lifeExpectancy: 80,
  activities: [
    { id: 'a1', name: 'Sleep', hours: 8 },
    { id: 'a2', name: 'Work / School', hours: 8 },
    { id: 'a3', name: 'Social Media', hours: 2 }
  ],
  milestones: []
};
