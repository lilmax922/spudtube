import { describe, expect, it } from 'vitest'
import { localizeGenreName, localizeGenres, ZH_TW_GENRE_MAP } from './genres'

describe('zh_TW genre map', () => {
  it('contains all movie genre ids', () => {
    const movieIds = [28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 10749, 878, 10770, 53, 10752, 37]
    for (const id of movieIds) {
      expect(ZH_TW_GENRE_MAP[id], `missing movie genre ${id}`).toBeDefined()
    }
  })

  it('contains all tv genre ids', () => {
    const tvIds = [10759, 16, 35, 80, 99, 18, 10751, 10762, 9648, 10763, 10764, 10765, 10766, 10767, 10768, 37]
    for (const id of tvIds) {
      expect(ZH_TW_GENRE_MAP[id], `missing tv genre ${id}`).toBeDefined()
    }
  })

  it('maps simplified upstream values to traditional', () => {
    expect(ZH_TW_GENRE_MAP[28]).toBe('動作')
    expect(ZH_TW_GENRE_MAP[16]).toBe('動畫')
    expect(ZH_TW_GENRE_MAP[35]).toBe('喜劇')
    expect(ZH_TW_GENRE_MAP[99]).toBe('紀錄')
    expect(ZH_TW_GENRE_MAP[18]).toBe('劇情')
    expect(ZH_TW_GENRE_MAP[36]).toBe('歷史')
    expect(ZH_TW_GENRE_MAP[10402]).toBe('音樂')
    expect(ZH_TW_GENRE_MAP[9648]).toBe('懸疑')
    expect(ZH_TW_GENRE_MAP[10749]).toBe('愛情')
    expect(ZH_TW_GENRE_MAP[10770]).toBe('電視電影')
    expect(ZH_TW_GENRE_MAP[53]).toBe('驚悚')
    expect(ZH_TW_GENRE_MAP[10752]).toBe('戰爭')
    expect(ZH_TW_GENRE_MAP[10759]).toBe('動作冒險')
    expect(ZH_TW_GENRE_MAP[10762]).toBe('兒童')
    expect(ZH_TW_GENRE_MAP[10765]).toBe('科幻與奇幻')
    expect(ZH_TW_GENRE_MAP[10768]).toBe('戰爭與政治')
  })

  it('keeps same-form genres unchanged', () => {
    expect(ZH_TW_GENRE_MAP[80]).toBe('犯罪')
    expect(ZH_TW_GENRE_MAP[878]).toBe('科幻')
    expect(ZH_TW_GENRE_MAP[37]).toBe('西部')
  })
})

describe('localizeGenreName', () => {
  it('overrides to traditional when language is zh-TW', () => {
    expect(localizeGenreName(28, '动作', 'zh-TW')).toBe('動作')
    expect(localizeGenreName(12, '冒险', 'zh-TW')).toBe('冒險')
    expect(localizeGenreName(878, '科幻', 'zh-TW')).toBe('科幻')
  })

  it('falls back to upstream name for unknown genre id', () => {
    expect(localizeGenreName(999999, '未知類型', 'zh-TW')).toBe('未知類型')
  })

  it('returns upstream name unchanged for en', () => {
    expect(localizeGenreName(28, 'Action', 'en')).toBe('Action')
    expect(localizeGenreName(28, '动作', 'en')).toBe('动作')
  })
})

describe('localizeGenres', () => {
  it('localizes a genre list for zh-TW', () => {
    const input = [
      { id: 28, name: '动作' },
      { id: 878, name: '科幻' },
      { id: 12, name: '冒险' },
    ]
    expect(localizeGenres(input, 'zh-TW')).toEqual([
      { id: 28, name: '動作' },
      { id: 878, name: '科幻' },
      { id: 12, name: '冒險' },
    ])
  })

  it('leaves list unchanged for en', () => {
    const input = [{ id: 28, name: 'Action' }]
    expect(localizeGenres(input, 'en')).toEqual(input)
  })
})
