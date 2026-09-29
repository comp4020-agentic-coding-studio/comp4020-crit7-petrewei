export type Meeting = {
  day: string;
  start: string;
  end: string;
  weeks: string;
};

export type Commitment = {
  id: string;
  label: string;
  firstChoice: boolean;
  meetings: Meeting[];
};

export function parseWeeks(_weeks: string): Set<number> {
  return new Set();
}

export function meetingsClash(_a: Meeting, _b: Meeting): boolean {
  return false;
}

export function clashesFor(_commitments: Commitment[]): Map<string, Commitment[]> {
  return new Map();
}
