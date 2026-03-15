import { describe, expect, it } from 'vitest'

import { createCard, rateCard, scheduleCard } from '../fsrs'

describe('createCard', () => {
  it('returns a card with default FSRS state', () => {
    const card = createCard()
    expect(card).toBeDefined()
    expect(typeof card.stability).toBe('number')
    expect(typeof card.difficulty).toBe('number')
    expect(card.reps).toBe(0)
    expect(card.lapses).toBe(0)
  })

  it('sets due date to today or in the past (new card is immediately due)', () => {
    const card = createCard()
    expect(card.due.getTime()).toBeLessThanOrEqual(Date.now() + 1000)
  })
})

describe('scheduleCard', () => {
  it('returns 4 scheduling options (Again, Hard, Good, Easy)', () => {
    const card = createCard()
    const options = scheduleCard(card)
    expect(Object.keys(options).length).toBe(4)
    // Ratings 1=Again, 2=Hard, 3=Good, 4=Easy
    expect(options[1]).toBeDefined()
    expect(options[2]).toBeDefined()
    expect(options[3]).toBeDefined()
    expect(options[4]).toBeDefined()
  })

  it('Good rating schedules further out than Again', () => {
    const card = createCard()
    const options = scheduleCard(card)
    const againDue = options[1]!.card.due.getTime()
    const goodDue = options[3]!.card.due.getTime()
    expect(goodDue).toBeGreaterThanOrEqual(againDue)
  })

  it('Easy rating schedules further out than Good', () => {
    const card = createCard()
    const options = scheduleCard(card)
    const goodDue = options[3]!.card.due.getTime()
    const easyDue = options[4]!.card.due.getTime()
    expect(easyDue).toBeGreaterThanOrEqual(goodDue)
  })
})

describe('rateCard', () => {
  it('returns updated card with next due date', () => {
    const card = createCard()
    const updated = rateCard(card, 3) // Good
    expect(updated.due.getTime()).toBeGreaterThan(Date.now() - 1000)
    expect(updated.reps).toBe(1)
  })

  it('Again rating (1) keeps the card due soon', () => {
    const card = createCard()
    const updated = rateCard(card, 1)
    // Again means it comes back quickly — within 10 minutes
    const tenMinutes = 10 * 60 * 1000
    expect(updated.due.getTime() - Date.now()).toBeLessThan(tenMinutes)
  })

  it('Easy rating (4) schedules card further than Good (3)', () => {
    const card = createCard()
    const withGood = rateCard(card, 3)
    const withEasy = rateCard(card, 4)
    expect(withEasy.due.getTime()).toBeGreaterThanOrEqual(withGood.due.getTime())
  })
})
