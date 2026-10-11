export type Clock = {
  now(): Date;
};

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class FixedClock implements Clock {
  constructor(private readonly iso: string) {
    if (Number.isNaN(Date.parse(iso))) {
      throw new Error(`Invalid fixed clock value: ${iso}`);
    }
  }

  now(): Date {
    return new Date(this.iso);
  }
}

export function createClock(fixedIso?: string | null): Clock {
  if (fixedIso && fixedIso.trim()) {
    return new FixedClock(fixedIso.trim());
  }
  return new SystemClock();
}
