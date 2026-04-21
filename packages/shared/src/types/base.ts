export type EventRef = {
  $ref: string;
};

export type BaseEvent = {
  $ref: string;
  id: string;
  date: string;
  name: string;
  shortName: string;
  season: { $ref: string };
};

export type BaseTeam = {
  $ref: string;
  id: string;
  name: string;
  displayName: string;
};
