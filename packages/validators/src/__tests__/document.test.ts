import { describe, expect, it } from 'vitest'

import {
  MAX_FILE_SIZE_BYTES,
  confirmUploadSchema,
  documentFileTypeEnum,
  documentStatusEnum,
  initiateUploadSchema,
} from '../document'

describe('documentStatusEnum', () => {
  it('accepts valid statuses', () => {
    for (const status of ['uploading', 'processing', 'ready', 'failed']) {
      expect(documentStatusEnum.parse(status)).toBe(status)
    }
  })

  it('rejects invalid status', () => {
    expect(() => documentStatusEnum.parse('deleted')).toThrow()
  })
})

describe('documentFileTypeEnum', () => {
  it('accepts supported file types', () => {
    for (const type of ['pdf', 'docx', 'txt', 'md']) {
      expect(documentFileTypeEnum.parse(type)).toBe(type)
    }
  })

  it('rejects unsupported file type', () => {
    expect(() => documentFileTypeEnum.parse('xlsx')).toThrow()
  })
})

describe('initiateUploadSchema', () => {
  const valid = {
    workspaceId: '550e8400-e29b-41d4-a716-446655440000',
    title: 'My Document',
    fileType: 'pdf' as const,
    fileSizeBytes: 1024 * 1024, // 1 MB
  }

  it('accepts a valid upload initiation', () => {
    expect(initiateUploadSchema.parse(valid)).toMatchObject(valid)
  })

  it('rejects empty title', () => {
    expect(() => initiateUploadSchema.parse({ ...valid, title: '' })).toThrow()
  })

  it('rejects title over 500 chars', () => {
    expect(() => initiateUploadSchema.parse({ ...valid, title: 'a'.repeat(501) })).toThrow()
  })

  it('rejects file too large', () => {
    expect(() =>
      initiateUploadSchema.parse({ ...valid, fileSizeBytes: MAX_FILE_SIZE_BYTES + 1 }),
    ).toThrow()
  })

  it('rejects zero-byte file', () => {
    expect(() => initiateUploadSchema.parse({ ...valid, fileSizeBytes: 0 })).toThrow()
  })

  it('rejects invalid workspace UUID', () => {
    expect(() => initiateUploadSchema.parse({ ...valid, workspaceId: 'not-a-uuid' })).toThrow()
  })

  it('rejects unsupported file type', () => {
    expect(() => initiateUploadSchema.parse({ ...valid, fileType: 'xlsx' })).toThrow()
  })
})

describe('confirmUploadSchema', () => {
  it('accepts a valid document UUID', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000'
    expect(confirmUploadSchema.parse({ documentId: id })).toEqual({ documentId: id })
  })

  it('rejects invalid UUID', () => {
    expect(() => confirmUploadSchema.parse({ documentId: 'not-a-uuid' })).toThrow()
  })

  it('rejects missing documentId', () => {
    expect(() => confirmUploadSchema.parse({})).toThrow()
  })
})
