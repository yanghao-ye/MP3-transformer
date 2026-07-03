import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useQueueStore } from '../queue'

// Mock converter
vi.mock('@/services/converter', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  convertAudio: vi.fn<any>().mockResolvedValue({
    title: 'test',
    ext: 'mp3',
    mime: 'audio/mpeg',
    blob: new Blob(['test']),
    url: 'blob:test'
  })
}))

describe('Queue Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('adds files to queue', () => {
    const store = useQueueStore()
    const files = [
      new File(['test1'], 'song1.ncm'),
      new File(['test2'], 'song2.mp3')
    ]

    store.addFiles(files)

    expect(store.items).toHaveLength(2)
    expect(store.items[0]?.name).toBe('song1.ncm')
    expect(store.items[1]?.name).toBe('song2.mp3')
    expect(store.items[0]?.status).toBe('pending')
  })

  it('removes item from queue', () => {
    const store = useQueueStore()
    const files = [new File(['test'], 'song.ncm')]
    store.addFiles(files)

    const item = store.items[0]
    expect(item).toBeDefined()
    store.removeItem(item!.id)

    expect(store.items).toHaveLength(0)
  })

  it('retries failed item', async () => {
    const store = useQueueStore()
    store.addFiles([new File(['test'], 'song.ncm')])

    const item = store.items[0]
    expect(item).toBeDefined()
    item!.status = 'error'
    item!.error = 'Test error'

    store.retryItem(item!.id)

    // retryItem 会先设置为 pending，然后立即开始处理
    expect(item!.error).toBeUndefined()
  })

  it('clears completed items', () => {
    const store = useQueueStore()
    store.addFiles([
      new File(['test1'], 'song1.ncm'),
      new File(['test2'], 'song2.mp3')
    ])

    store.items[0]!.status = 'done'
    store.items[1]!.status = 'pending'

    store.clearCompleted()

    expect(store.items).toHaveLength(1)
    expect(store.items[0]?.status).toBe('pending')
  })

  it('clears all items', () => {
    const store = useQueueStore()
    store.addFiles([
      new File(['test1'], 'song1.ncm'),
      new File(['test2'], 'song2.mp3')
    ])

    store.clearAll()

    expect(store.items).toHaveLength(0)
  })

  it('computes pendingItems correctly', () => {
    const store = useQueueStore()
    store.addFiles([
      new File(['test1'], 'song1.ncm'),
      new File(['test2'], 'song2.mp3')
    ])

    store.items[0]!.status = 'done'

    expect(store.pendingItems).toHaveLength(1)
    expect(store.pendingItems[0]?.name).toBe('song2.mp3')
  })

  it('computes errorItems correctly', () => {
    const store = useQueueStore()
    store.addFiles([
      new File(['test1'], 'song1.ncm'),
      new File(['test2'], 'song2.mp3')
    ])

    store.items[0]!.status = 'error'

    expect(store.errorItems).toHaveLength(1)
  })

  it('sets target format', () => {
    const store = useQueueStore()
    expect(store.targetFormat).toBe('mp3')

    store.setTargetFormat('flac')
    expect(store.targetFormat).toBe('flac')
  })
})
