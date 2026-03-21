export const PODCAST_DIALOGUE_PROMPT_VERSION = 'podcast-dialogue.v1'

export interface PodcastDialogueParams {
  lessonTitle: string
  lessonContent: string
  conceptNames: string[]
  format: 'single_voice' | 'conversation'
}

export function buildPodcastDialoguePrompt(params: PodcastDialogueParams): string {
  const { lessonTitle, lessonContent, conceptNames, format } = params

  const conceptHint = conceptNames.length
    ? `\nKey concepts to weave in: ${conceptNames.join(', ')}`
    : ''

  // Truncate content to avoid token limits
  const content = lessonContent.slice(0, 4000)

  if (format === 'single_voice') {
    return `You are writing a solo educational podcast narration.
The narrator (host_a) explains concepts in a warm, engaging, conversational tone —
like a knowledgeable friend explaining something over coffee.

Lesson: "${lessonTitle}"${conceptHint}

Content to cover:
${content}

Write 8-12 segments, totaling 600-800 words. Each segment should:
- Cover one concept or idea
- Use concrete examples and analogies
- Feel natural when read aloud (no jargon dumps)

Return a JSON object with this structure:
{
  "segments": [
    { "speaker": "host_a", "text": "...", "conceptHint": "concept name if applicable" }
  ]
}

Every segment must have speaker "host_a". The conceptHint field is optional —
include it when the segment primarily explains a specific concept from the list above.`
  }

  return `You are writing a two-host educational podcast conversation.
Host A (Rachel) is an expert who explains concepts with clarity and enthusiasm.
Host B (Antoni) is a curious co-host who asks smart questions and helps reinforce key points.

Lesson: "${lessonTitle}"${conceptHint}

Content to cover:
${content}

Write 10-15 alternating segments totaling 600-800 words. The dialogue should:
1. Open with Host A introducing the topic in an engaging way
2. Host B asks a clarifying question or reacts
3. They alternate — Host A explains, Host B probes, asks for examples, or connects ideas
4. End with Host A summarizing 2-3 key takeaways
5. Feel natural and conversational, not scripted or lecture-like
6. Use concrete examples and analogies to make concepts sticky

Return a JSON object with this structure:
{
  "segments": [
    { "speaker": "host_a", "text": "...", "conceptHint": "concept name if applicable" },
    { "speaker": "host_b", "text": "...", "conceptHint": "concept name if applicable" }
  ]
}

Alternate between host_a and host_b. The conceptHint field is optional —
include it when the segment primarily discusses a specific concept from the list above.
First and last segments must be host_a.`
}
