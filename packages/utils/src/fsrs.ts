import { createEmptyCard, fsrs, generatorParameters, Rating, type Card } from 'ts-fsrs'

const f = fsrs(generatorParameters({ enable_fuzz: false }))

export function createCard(): Card {
  return createEmptyCard()
}

export function scheduleCard(card: Card) {
  const now = new Date()
  return f.repeat(card, now)
}

export function rateCard(card: Card, rating: 1 | 2 | 3 | 4): Card {
  const now = new Date()
  const result = f.repeat(card, now)
  const ratingMap = {
    1: Rating.Again,
    2: Rating.Hard,
    3: Rating.Good,
    4: Rating.Easy,
  } as const
  return result[ratingMap[rating]]!.card
}
