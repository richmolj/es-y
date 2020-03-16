/* tslint:disable:no-console */
export enum LogLevel {
  debug = 1,
  info = 2,
  warn = 3,
  error = 4,
}
export type LogLevelKey = keyof typeof LogLevel

const LOG_LEVELS: Record<LogLevel, LogLevelKey> = {
  1: "debug",
  2: "info",
  3: "warn",
  4: "error",
}

export interface LoggerInterface {
  level: LogLevelKey

  debug(stmt: any): void
  info(stmt: any): void
  warn(stmt: any): void
  error(stmt: any): void
}

export class Logger implements LoggerInterface {
  private _level: LogLevel = LogLevel.info

  constructor(level: LogLevelKey | LogLevel = "info") {
    if (typeof level === "number") {
      this._level = level
    } else {
      this.level = level
    }
  }

  debug(stmt: any): void {
    if (this._level <= LogLevel.debug) {
      console.info(stmt)
    }
  }

  info(stmt: any): void {
    if (this._level <= LogLevel.info) {
      console.info(stmt)
    }
  }

  warn(stmt: any): void {
    if (this._level <= LogLevel.warn) {
      console.warn(stmt)
    }
  }

  error(stmt: any): void {
    if (this._level <= LogLevel.warn) {
      console.error(stmt)
    }
  }

  set level(value: LogLevelKey) {
    const lvlValue = LogLevel[value]

    if (lvlValue) {
      this._level = lvlValue
    } else {
      throw new Error(`Log level must be one of ${Object.values(LOG_LEVELS).join(", ")}`)
    }
  }

  get level(): LogLevelKey {
    return LOG_LEVELS[this._level]
  }
}

export const logger = new Logger()
