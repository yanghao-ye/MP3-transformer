import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ConvertQueue from '../ConvertQueue.vue'
import { useQueueStore } from '@/stores/queue'
import { setActivePinia, createPinia } from 'pinia'

// Mock JSZip
vi.mock('jszip', () => {
  return {
    default: vi.fn<() => void>().mockImplementation(() => ({
      folder: vi.fn<() => { file: () => void }>().mockReturnValue({
        file: vi.fn<() => void>()
      }),
      generateAsync: vi.fn<() => Promise<Blob>>().mockResolvedValue(new Blob(['mock zip content']))
    }))
  }
})

describe('ConvertQueue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders queue container when there are items', () => {
    const wrapper = mount(ConvertQueue)
    expect(wrapper.find('.queue-container').exists()).toBe(false)
  })

  it('shows batch download button when there are completed items', async () => {
    const wrapper = mount(ConvertQueue)
    const queueStore = useQueueStore()

    // 模拟添加已完成的文件
    queueStore.items = [
      {
        id: 1,
        file: new File(['test'], 'test.mp3', { type: 'audio/mpeg' }),
        name: 'test.mp3',
        size: 1024,
        status: 'done',
        progress: 1,
        result: {
          title: 'test',
          ext: 'mp3',
          mime: 'audio/mpeg',
          blob: new Blob(['test']),
          url: 'blob:test'
        }
      }
    ]

    await wrapper.vm.$nextTick()

    expect(wrapper.find('.queue-container').exists()).toBe(true)
    expect(wrapper.find('.btn-secondary').text()).toContain('打包下载')
  })

  it('disables batch download button during packaging', async () => {
    const wrapper = mount(ConvertQueue)
    const queueStore = useQueueStore()

    // 模拟添加已完成的文件
    queueStore.items = [
      {
        id: 1,
        file: new File(['test'], 'test.mp3', { type: 'audio/mpeg' }),
        name: 'test.mp3',
        size: 1024,
        status: 'done',
        progress: 1,
        result: {
          title: 'test',
          ext: 'mp3',
          mime: 'audio/mpeg',
          blob: new Blob(['test']),
          url: 'blob:test'
        }
      }
    ]

    await wrapper.vm.$nextTick()

    // 模拟打包状态
    // @ts-expect-error - accessing internal property for testing
    wrapper.vm.isPackaging = true
    await wrapper.vm.$nextTick()

    const disabledButton = wrapper.find('button[disabled]')
    expect(disabledButton.exists()).toBe(true)
    expect(disabledButton.text()).toContain('正在打包')
  })

  it('calls handleBatchDownload when button is clicked', async () => {
    const wrapper = mount(ConvertQueue)
    const queueStore = useQueueStore()

    // 模拟添加已完成的文件
    queueStore.items = [
      {
        id: 1,
        file: new File(['test'], 'test.mp3', { type: 'audio/mpeg' }),
        name: 'test.mp3',
        size: 1024,
        status: 'done',
        progress: 1,
        result: {
          title: 'test',
          ext: 'mp3',
          mime: 'audio/mpeg',
          blob: new Blob(['test']),
          url: 'blob:test'
        }
      }
    ]

    await wrapper.vm.$nextTick()

    // Mock document.createElement and click
    const mockClick = vi.fn<() => void>()
    const mockAppendChild = vi.fn<(node: Node) => Node>()
    const mockRemoveChild = vi.fn<(child: Node) => Node>()

    vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: mockClick
    } as unknown as HTMLElement)

    vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild)
    vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild)

    // 点击打包下载按钮
    await wrapper.find('.btn-secondary').trigger('click')

    // 验证函数被调用
    // @ts-expect-error - accessing internal property for testing
    expect(wrapper.vm.isPackaging).toBe(false) // 函数执行完成后应该恢复为false
  })
})