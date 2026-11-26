declare module 'holiday-jp' {
  export interface Holiday {
    date: Date
    name: string
  }
  export function between(start: Date, end: Date): Holiday[]
}