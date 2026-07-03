import { describe, it, expect } from 'vitest'
import { detectFormat, isSupported, getSupportedExtensions } from '../index'

describe('detectFormat', () => {
  it('detects NCM format', () => {
    const file = new File([''], 'song.ncm')
    expect(detectFormat(file)).toBe('encrypted')
  })

  it('detects QMC formats', () => {
    expect(detectFormat(new File([''], 'song.qmc0'))).toBe('encrypted')
    expect(detectFormat(new File([''], 'song.qmc2'))).toBe('encrypted')
    expect(detectFormat(new File([''], 'song.mflac'))).toBe('encrypted')
    expect(detectFormat(new File([''], 'song.mgg'))).toBe('encrypted')
  })

  it('detects KWM format', () => {
    const file = new File([''], 'song.kwm')
    expect(detectFormat(file)).toBe('encrypted')
  })

  it('detects KGM format', () => {
    const file = new File([''], 'song.kgm')
    expect(detectFormat(file)).toBe('encrypted')
  })

  it('detects MG3D format', () => {
    const file = new File([''], 'song.mg3d')
    expect(detectFormat(file)).toBe('encrypted')
  })

  it('detects plain audio formats', () => {
    expect(detectFormat(new File([''], 'song.mp3'))).toBe('plain')
    expect(detectFormat(new File([''], 'song.flac'))).toBe('plain')
    expect(detectFormat(new File([''], 'song.wav'))).toBe('plain')
    expect(detectFormat(new File([''], 'song.m4a'))).toBe('plain')
    expect(detectFormat(new File([''], 'song.ogg'))).toBe('plain')
  })

  it('returns unknown for unsupported formats', () => {
    expect(detectFormat(new File([''], 'song.txt'))).toBe('unknown')
    expect(detectFormat(new File([''], 'song.pdf'))).toBe('unknown')
    expect(detectFormat(new File([''], 'song.xyz'))).toBe('unknown')
  })
})

describe('isSupported', () => {
  it('returns true for supported formats', () => {
    expect(isSupported(new File([''], 'song.ncm'))).toBe(true)
    expect(isSupported(new File([''], 'song.mp3'))).toBe(true)
    expect(isSupported(new File([''], 'song.kwm'))).toBe(true)
  })

  it('returns false for unsupported formats', () => {
    expect(isSupported(new File([''], 'song.txt'))).toBe(false)
    expect(isSupported(new File([''], 'song.xyz'))).toBe(false)
  })
})

describe('getSupportedExtensions', () => {
  it('returns array of supported extensions', () => {
    const extensions = getSupportedExtensions()
    expect(Array.isArray(extensions)).toBe(true)
    expect(extensions).toContain('ncm')
    expect(extensions).toContain('mp3')
    expect(extensions).toContain('flac')
    expect(extensions).toContain('kwm')
    expect(extensions).toContain('kgm')
  })
})
