import { describe, expect, it } from 'vitest'
import { canChiYear, lunarLabel, solarToLunar, specialDay } from './lunar'

describe('solarToLunar', () => {
  it.each([
    [10, 2, 2024, { day: 1, month: 1, year: 2024, leap: false }],
    [29, 1, 2025, { day: 1, month: 1, year: 2025, leap: false }],
    [17, 2, 2026, { day: 1, month: 1, year: 2026, leap: false }],
    [6, 2, 2027, { day: 1, month: 1, year: 2027, leap: false }],
    [25, 7, 2025, { day: 1, month: 6, year: 2025, leap: true }],
    [16, 2, 2026, { day: 29, month: 12, year: 2025, leap: false }],
  ])('%i/%i/%i', (d, m, y, expected) => {
    expect(solarToLunar(d, m, y)).toEqual(expected)
  })

  it('tính đúng ngày rằm Phật Đản và Vu Lan năm 2027 (dùng trong lộ trình)', () => {
    expect(solarToLunar(20, 5, 2027)).toMatchObject({ day: 15, month: 4 })
    expect(solarToLunar(16, 8, 2027)).toMatchObject({ day: 15, month: 7 })
  })
})

describe('nhãn hiển thị', () => {
  it('đặt tên năm can chi', () => {
    expect(canChiYear(2026)).toBe('Bính Ngọ')
    expect(canChiYear(2027)).toBe('Đinh Mùi')
    expect(canChiYear(2025)).toBe('Ất Tỵ')
  })

  it('gọi tên ngày rằm, mùng và tháng Giêng/Chạp', () => {
    expect(lunarLabel({ day: 15, month: 1, year: 2026, leap: false })).toBe('Rằm tháng Giêng')
    expect(lunarLabel({ day: 3, month: 12, year: 2026, leap: false })).toBe('Mùng 3 tháng Chạp')
    expect(lunarLabel({ day: 20, month: 6, year: 2025, leap: true })).toBe('Ngày 20 tháng 6 nhuận')
  })

  it('nhận biết ngày lễ', () => {
    expect(specialDay({ day: 15, month: 7, year: 2027, leap: false })?.name).toBe('Lễ Vu Lan')
    expect(specialDay({ day: 1, month: 9, year: 2026, leap: false })?.kind).toBe('mung1')
    expect(specialDay({ day: 14, month: 9, year: 2026, leap: false })).toBeNull()
  })
})
