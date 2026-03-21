/**
 * Audio assembly — concatenates MP3 segment buffers with silence gaps.
 * No FFmpeg dependency; works via binary MP3 frame concatenation.
 */

/** Timing metadata for a single segment in the assembled audio. */
export interface SegmentTiming {
  segmentIndex: number
  startTimeMs: number
  endTimeMs: number
  durationMs: number
}

/** Result of assembling multiple audio segments. */
export interface AssemblyResult {
  /** The final concatenated MP3 buffer. */
  buffer: ArrayBuffer
  /** Total duration in milliseconds. */
  totalDurationMs: number
  /** Per-segment timing metadata. */
  timings: SegmentTiming[]
}

/**
 * Generate a silent MP3 frame.
 * This is a minimal valid MP3 frame containing silence (~26ms per frame).
 * We repeat it to get the desired silence duration.
 */
function generateSilenceBuffer(durationMs: number): Uint8Array {
  // Minimal valid MP3 frame: MPEG1 Layer3, 128kbps, 44100Hz, stereo, no padding
  // Frame header: 0xFF 0xFB 0x90 0x00
  // Each frame is 417 bytes and represents ~26.12ms of audio
  const SILENT_FRAME = new Uint8Array(417)
  SILENT_FRAME[0] = 0xff // Sync byte 1
  SILENT_FRAME[1] = 0xfb // Sync byte 2 + MPEG1, Layer3
  SILENT_FRAME[2] = 0x90 // 128kbps, 44100Hz
  SILENT_FRAME[3] = 0x00 // Stereo, no padding

  const msPerFrame = 26.12
  const frameCount = Math.max(1, Math.ceil(durationMs / msPerFrame))
  const result = new Uint8Array(frameCount * 417)

  for (let i = 0; i < frameCount; i++) {
    result.set(SILENT_FRAME, i * 417)
  }

  return result
}

/**
 * Strip ID3v2 tags from an MP3 buffer (header at start of file).
 * Returns the buffer starting from the first MPEG sync word.
 */
function stripId3v2(buffer: Uint8Array): Uint8Array {
  // ID3v2 header: "ID3" followed by version (2 bytes) + flags (1 byte) + size (4 bytes syncsafe)
  if (buffer.length >= 10 && buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
    const size =
      ((buffer[6]! & 0x7f) << 21) |
      ((buffer[7]! & 0x7f) << 14) |
      ((buffer[8]! & 0x7f) << 7) |
      (buffer[9]! & 0x7f)
    const headerSize = 10 + size
    return buffer.subarray(headerSize)
  }
  return buffer
}

/** Default silence gap between segments (300ms). */
const DEFAULT_GAP_MS = 300

/**
 * Assemble multiple MP3 audio segments into a single MP3 file.
 *
 * @param segments - Array of { buffer, durationMs } in playback order
 * @param gapMs - Silence gap between segments in milliseconds (default 300ms)
 * @returns The assembled buffer with timing metadata
 */
export function assembleSegments(
  segments: Array<{ buffer: ArrayBuffer; durationMs: number }>,
  gapMs: number = DEFAULT_GAP_MS,
): AssemblyResult {
  if (segments.length === 0) {
    return { buffer: new ArrayBuffer(0), totalDurationMs: 0, timings: [] }
  }

  const silenceBuffer = generateSilenceBuffer(gapMs)
  const timings: SegmentTiming[] = []
  const parts: Uint8Array[] = []
  let currentTimeMs = 0

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!
    let segBytes: Uint8Array = new Uint8Array(seg.buffer)

    // Strip ID3 tags from all segments after the first
    if (i > 0) {
      segBytes = stripId3v2(segBytes)
    }

    parts.push(segBytes)

    timings.push({
      segmentIndex: i,
      startTimeMs: currentTimeMs,
      endTimeMs: currentTimeMs + seg.durationMs,
      durationMs: seg.durationMs,
    })

    currentTimeMs += seg.durationMs

    // Add silence gap between segments (not after the last one)
    if (i < segments.length - 1) {
      parts.push(silenceBuffer)
      currentTimeMs += gapMs
    }
  }

  // Concatenate all parts
  const totalLength = parts.reduce((sum, p) => sum + p.byteLength, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.byteLength
  }

  return {
    buffer: result.buffer,
    totalDurationMs: currentTimeMs,
    timings,
  }
}
