const COLORS = {
  green: [32, 39],
  cyan: [36, 39],
  magenta: [35, 39],
  yellow: [33, 39],
  bold: [1, 22],
}
export type ColorKey = "green" | "cyan" | "magenta" | "yellow" | "bold"

export const supportsColor = (): boolean => {
  if (/^screen|^xterm|^vt100|color|ansi|cygwin|linux/i.test(process.env.TERM as any)) {
    return true
  } else {
    return false
  }
}

export default (color: ColorKey, text: string): string => {
  if (supportsColor()) {
    const map = COLORS[color]
    return `\u001b[${map[0]}m${text}\u001b[${map[1]}m`
  } else {
    return text
  }
}
