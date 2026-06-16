import { describe, it, expect, beforeEach } from 'vitest'
import {
  createRoom, addPlayer, removePlayer, getPlayerBySocket,
  getRival, setBoard, markReady, allReady, catchWord,
  getScores, determineWinner,
} from '../DuelRoom'
import type { RoomState, DuelWord } from '../types'

function makeRoom(): RoomState {
  return createRoom('TEST')
}

function makeWords(n = 5): DuelWord[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `w${i}`,
    text: `word${i}`,
    isCorrect: true,
    takenBy: null,
  }))
}

describe('createRoom', () => {
  it('initializes with correct defaults', () => {
    const room = makeRoom()
    expect(room.code).toBe('TEST')
    expect(room.phase).toBe('waiting')
    expect(room.players.size).toBe(0)
    expect(room.words).toHaveLength(0)
  })
})

describe('addPlayer / removePlayer', () => {
  it('adds first player as slot A', () => {
    const room = makeRoom()
    const slot = addPlayer(room, 'sock1', 'Alice')
    expect(slot).toBe('A')
    expect(room.players.size).toBe(1)
  })

  it('adds second player as slot B', () => {
    const room = makeRoom()
    addPlayer(room, 'sock1', 'Alice')
    const slot = addPlayer(room, 'sock2', 'Bob')
    expect(slot).toBe('B')
    expect(room.players.size).toBe(2)
  })

  it('rejects third player', () => {
    const room = makeRoom()
    addPlayer(room, 'sock1', 'Alice')
    addPlayer(room, 'sock2', 'Bob')
    const slot = addPlayer(room, 'sock3', 'Carol')
    expect(slot).toBeNull()
    expect(room.players.size).toBe(2)
  })

  it('removes player by socketId', () => {
    const room = makeRoom()
    addPlayer(room, 'sock1', 'Alice')
    const removedSlot = removePlayer(room, 'sock1')
    expect(removedSlot).toBe('A')
    expect(room.players.size).toBe(0)
  })
})

describe('markReady / allReady', () => {
  it('allReady false with one player', () => {
    const room = makeRoom()
    addPlayer(room, 'sock1', 'Alice')
    markReady(room, 'sock1')
    expect(allReady(room)).toBe(false)
  })

  it('allReady true when both ready', () => {
    const room = makeRoom()
    addPlayer(room, 'sock1', 'Alice')
    addPlayer(room, 'sock2', 'Bob')
    markReady(room, 'sock1')
    markReady(room, 'sock2')
    expect(allReady(room)).toBe(true)
  })

  it('allReady false when only one ready', () => {
    const room = makeRoom()
    addPlayer(room, 'sock1', 'Alice')
    addPlayer(room, 'sock2', 'Bob')
    markReady(room, 'sock1')
    expect(allReady(room)).toBe(false)
  })
})

describe('catchWord', () => {
  let room: RoomState

  beforeEach(() => {
    room = makeRoom()
    addPlayer(room, 'sockA', 'Alice')
    addPlayer(room, 'sockB', 'Bob')
    setBoard(room, makeWords(5), 60, 'sustantivos', 1)
    room.phase = 'playing'
  })

  it('correct word gives points (nivel * 10)', () => {
    const result = catchWord(room, 'sockA', 'w0')
    expect(result.success).toBe(true)
    expect(result.alreadyTaken).toBe(false)
    const scores = getScores(room)
    expect(scores.A).toBe(10)  // nivel 1 * 10
    expect(scores.B).toBe(0)
  })

  it('already taken word returns alreadyTaken=true', () => {
    catchWord(room, 'sockA', 'w0')
    const result = catchWord(room, 'sockB', 'w0')
    expect(result.success).toBe(false)
    expect(result.alreadyTaken).toBe(true)
  })

  it('incorrect word gives 0 points', () => {
    const wrongWord: DuelWord = { id: 'bad0', text: 'correr', isCorrect: false, takenBy: null }
    room.words.push(wrongWord)
    catchWord(room, 'sockA', 'bad0')
    expect(getScores(room).A).toBe(0)
  })

  it('nivel 2 gives 20 points per correct word', () => {
    setBoard(room, makeWords(3), 60, 'sustantivos', 2)
    catchWord(room, 'sockA', 'w0')
    expect(getScores(room).A).toBe(20)
  })

  it('power earned every 3 catches', () => {
    // Need at least 3 words
    catchWord(room, 'sockA', 'w0')
    catchWord(room, 'sockA', 'w1')
    const result = catchWord(room, 'sockA', 'w2')
    expect(result.powerEarned).not.toBeNull()
  })
})

describe('determineWinner', () => {
  it('A wins when A has more points', () => {
    const room = makeRoom()
    addPlayer(room, 'sockA', 'Alice')
    addPlayer(room, 'sockB', 'Bob')
    setBoard(room, makeWords(3), 60, 'sustantivos', 1)
    room.phase = 'playing'
    catchWord(room, 'sockA', 'w0')
    expect(determineWinner(room)).toBe('A')
  })

  it('draw when scores are equal', () => {
    const room = makeRoom()
    addPlayer(room, 'sockA', 'Alice')
    addPlayer(room, 'sockB', 'Bob')
    expect(determineWinner(room)).toBe('draw')
  })
})
